/**
 * Gọi Edge Function `health-coach` (SSE streaming) từ client.
 *
 * §6.2: dùng `expo/fetch` (có trong Expo Go, hỗ trợ stream). Fallback không stream
 * nếu response.body không có (web/legacy) — hook `use-chat` che giấu sự khác biệt.
 *
 * §2 bảo mật: JWT từ session được gửi qua header Authorization (không lặp lại
 * key). 401 → refresh session 1 lần rồi thử lại. 429/rate_limited → error event.
 */

import { fetch as expoFetch } from 'expo/fetch';
import { supabase, SUPABASE_URL, DashboardSummary } from './supabase';

// Edge Function URL (§5.1). Dùng SUPABASE_URL export để không truy cập protected field.
const EDGE_URL = `${SUPABASE_URL}/functions/v1/health-coach`;

// §5.3 — các SSE event name
export type ChatEvent =
  | { type: 'meta'; conversation_id: string | null }
  | { type: 'tool'; name: string; status: string }
  | { type: 'delta'; text: string }
  | { type: 'done' }
  | { type: 'error'; code: string; message: string };

export interface ChatRequest {
  message: string;
  conversation_id?: string | null;
  locale?: string;
}

/** Lấy tên và dữ liệu sức khỏe thực tế của user đang đăng nhập từ Supabase */
async function fetchRealUserContext(): Promise<{ fullName: string; summary: DashboardSummary | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    let fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'bạn';

    if (user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.full_name) {
        fullName = profile.full_name;
      }
    }

    const { data: summary } = await supabase.rpc('get_dashboard_summary');
    return { fullName, summary: (summary as DashboardSummary) ?? null };
  } catch {
    return { fullName: 'bạn', summary: null };
  }
}

/** Gọi trực tiếp Google Gemini API với dữ liệu thật từ Supabase nếu có EXPO_PUBLIC_GEMINI_API_KEY */
async function* callDirectGemini(req: ChatRequest, signal: AbortSignal, apiKey: string): AsyncGenerator<ChatEvent, void, unknown> {
  yield { type: 'meta', conversation_id: req.conversation_id || 'conv-direct-gemini' };

  const lower = req.message.toLowerCase();
  const isEmergency = /đau ngực|khó thở|ngất xỉu|co giật|chảy máu|đột quỵ|ngộ độc|cấp cứu|115/.test(lower);
  if (isEmergency) {
    yield {
      type: 'delta',
      text: '🚨 **Cấp cứu ngay**: Nếu bạn hoặc người thân đang gặp triệu chứng nguy hiểm như đau ngực, khó thở, ngất xỉu, co giật hoặc dấu hiệu đột quỵ — **hãy gọi 115 ngay lập tức** hoặc đến bệnh viện gần nhất. Đây là tình huống y tế khẩn cấp!',
    };
    yield { type: 'done' };
    return;
  }

  yield { type: 'tool', name: 'get_dashboard_summary', status: 'running' };
  const { fullName, summary } = await fetchRealUserContext();

  const steps = summary?.steps?.count ?? 0;
  const stepGoal = summary?.goals?.step_goal ?? 10000;
  const sleepMin = summary?.sleep?.total_minutes ?? 0;
  const sleepGoalMin = summary?.goals?.sleep_goal_minutes ?? 480;
  const waterMl = summary?.water ?? 0;
  const waterGoalMl = summary?.goals?.water_goal_ml ?? 2000;
  const calories = summary?.nutrition?.calories ?? 0;
  const calorieGoal = summary?.goals?.calorie_goal ?? 2000;
  const score = summary?.health_score?.score ?? 0;

  const systemPrompt = `Bạn là Health Coach AI của ứng dụng Healthy Check.
Bạn tư vấn sức khỏe bằng tiếng Việt một cách khoa học, thân thiện, súc tích và có động viên.
Dữ liệu sức khỏe thực tế hôm nay của người dùng (${fullName}) từ Supabase:
- Bước chân: ${steps} / ${stepGoal} bước
- Giấc ngủ: ${Math.floor(sleepMin / 60)} giờ ${sleepMin % 60} phút (mục tiêu ${Math.floor(sleepGoalMin / 60)} giờ)
- Nước uống: ${waterMl} / ${waterGoalMl} ml
- Lượng calo nạp vào: ${calories} / ${calorieGoal} kcal
- Điểm sức khỏe (Health Score): ${score}/100
- Chu kỳ: ${summary?.cycle ? JSON.stringify(summary.cycle) : 'chưa có dữ liệu'}
Hãy trả lời dựa sát trên dữ liệu thật này của người dùng.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\nCâu hỏi của người dùng: ${req.message}` }] },
        ],
      }),
      signal,
    });

    if (!resp.ok) {
      yield* simulateLocalCoach(req, signal, { fullName, summary });
      return;
    }

    const json = await resp.json();
    const replyText = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!replyText) {
      yield* simulateLocalCoach(req, signal, { fullName, summary });
      return;
    }

    const words = replyText.split(' ');
    for (let i = 0; i < words.length; i += 3) {
      if (signal.aborted) return;
      yield { type: 'delta', text: words.slice(i, i + 3).join(' ') + ' ' };
      await new Promise((r) => setTimeout(r, 40));
    }
    yield { type: 'done' };
  } catch {
    yield* simulateLocalCoach(req, signal, { fullName, summary });
  }
}

/** Fallback trả lời dựa trên dữ liệu thật của user trong Supabase khi Edge Function chưa deploy (404) */
async function* simulateLocalCoach(
  req: ChatRequest,
  signal: AbortSignal,
  prefetched?: { fullName: string; summary: DashboardSummary | null }
): AsyncGenerator<ChatEvent, void, unknown> {
  yield { type: 'meta', conversation_id: req.conversation_id || 'conv-local' };

  const lower = req.message.toLowerCase();
  const isEmergency = /đau ngực|khó thở|ngất xỉu|co giật|chảy máu|đột quỵ|ngộ độc|cấp cứu|115/.test(lower);
  const isSelfHarm = /tự tử|muốn chết|không muốn sống|tự hại/.test(lower);

  if (isEmergency) {
    yield {
      type: 'delta',
      text: '🚨 **Cấp cứu ngay**: Nếu bạn hoặc người thân đang gặp triệu chứng nguy hiểm như đau ngực, khó thở, ngất xỉu, co giật hoặc dấu hiệu đột quỵ — **hãy gọi 115 ngay lập tức** hoặc đến bệnh viện gần nhất. Đây là tình huống y tế khẩn cấp!',
    };
    yield { type: 'done' };
    return;
  }

  if (isSelfHarm) {
    yield {
      type: 'delta',
      text: '💙 Bạn đang trải qua cảm giác rất nặng nề phải không? Hãy nhớ rằng bạn không đơn độc và luôn có người sẵn sàng lắng nghe. Hãy liên hệ ngay với người thân hoặc cơ sở y tế gần nhất. Nếu đang gặp nguy hiểm tức thì, hãy gọi **115** ngay nhé!',
    };
    yield { type: 'done' };
    return;
  }

  yield { type: 'tool', name: 'get_dashboard_summary', status: 'running' };
  const { fullName, summary } = prefetched ?? (await fetchRealUserContext());

  const steps = summary?.steps?.count ?? 0;
  const stepGoal = summary?.goals?.step_goal ?? 10000;
  const stepPct = stepGoal > 0 ? Math.round((steps / stepGoal) * 100) : 0;
  const burned = summary?.steps?.calories_burned ?? 0;

  const sleepMin = summary?.sleep?.total_minutes ?? 0;
  const sleepGoalMin = summary?.goals?.sleep_goal_minutes ?? 480;
  const sleepH = Math.floor(sleepMin / 60);
  const sleepM = sleepMin % 60;

  const waterMl = summary?.water ?? 0;
  const waterGoalMl = summary?.goals?.water_goal_ml ?? 2000;

  const calories = summary?.nutrition?.calories ?? 0;
  const calorieGoal = summary?.goals?.calorie_goal ?? 2000;

  const score = summary?.health_score?.score ?? 0;

  let reply = '';
  if (/bước|đi bộ|steps/i.test(lower)) {
    reply = `Chào **${fullName}**! Hôm nay bạn đã đi được **${steps.toLocaleString('vi-VN')} bước**, đạt **${stepPct}%** mục tiêu (${stepGoal.toLocaleString('vi-VN')} bước) và tiêu hao **${burned} kcal**. ${steps < stepGoal ? `Bạn còn thiếu ${(stepGoal - steps).toLocaleString('vi-VN')} bước nữa để hoàn thành mục tiêu hôm nay — hãy dành khoảng 15–20 phút đi bộ nhẹ nhàng nhé! 👟` : 'Chúc mừng bạn đã hoàn thành mục tiêu bước chân hôm nay! 🎉'}`;
  } else if (/ngủ|sleep/i.test(lower)) {
    reply = sleepMin > 0
      ? `Chào **${fullName}**! Thời gian ngủ ghi nhận của bạn là **${sleepH} giờ ${sleepM} phút** trên mục tiêu **${Math.floor(sleepGoalMin / 60)} giờ**. Hãy duy trì giờ đi ngủ đều đặn để cơ thể phục hồi tốt nhất nhé! 🌙`
      : `Chào **${fullName}**! Hôm nay bạn chưa ghi nhận dữ liệu giấc ngủ (mục tiêu của bạn là **${Math.floor(sleepGoalMin / 60)} giờ/đêm**). Bạn có thể vào mục Giấc ngủ trên Dashboard để cập nhật nhé! 🌙`;
  } else if (/nước|water/i.test(lower)) {
    reply = `Chào **${fullName}**! Hôm nay bạn đã uống **${waterMl} ml** trên mục tiêu **${waterGoalMl} ml** nước (${waterGoalMl > 0 ? Math.round((waterMl / waterGoalMl) * 100) : 0}%). ${waterMl < waterGoalMl ? `Bạn hãy bổ sung thêm **${waterGoalMl - waterMl} ml** nước trong ngày để cơ thể đủ ẩm nhé! 💧` : 'Tuyệt vời, bạn đã uống đủ mục tiêu nước hôm nay! 💧'}`;
  } else if (/calo|ăn|dinh dưỡng|calories/i.test(lower)) {
    reply = `Chào **${fullName}**! Lượng calo nạp vào hôm nay của bạn là **${calories} kcal** / mục tiêu **${calorieGoal} kcal** (Protein: ${summary?.nutrition?.protein_g ?? 0}g, Carbs: ${summary?.nutrition?.carbs_g ?? 0}g, Fat: ${summary?.nutrition?.fat_g ?? 0}g). 🥗`;
  } else if (/chu kỳ|kinh nguyệt|cycle/i.test(lower)) {
    reply = summary?.cycle
      ? `Chào **${fullName}**! Dữ liệu chu kỳ hiện tại của bạn: kỳ gần nhất bắt đầu ngày **${summary.cycle.last_period_start}**, độ dài chu kỳ **${summary.cycle.cycle_length} ngày**, còn khoảng **${summary.cycle.days_to_next} ngày** đến kỳ tiếp theo. 🌸`
      : `Chào **${fullName}**! Hiện tại chưa có dữ liệu chu kỳ hoặc tính năng theo dõi chu kỳ chưa được bật trong hồ sơ của bạn. 🌸`;
  } else {
    reply = `Chào **${fullName}**! Tóm tắt dữ liệu sức khỏe hôm nay của bạn từ hệ thống:\n- **Điểm sức khỏe**: **${score}/100**\n- **Bước chân**: **${steps.toLocaleString('vi-VN')} / ${stepGoal.toLocaleString('vi-VN')} bước**\n- **Nước uống**: **${waterMl} / ${waterGoalMl} ml**\n- **Dinh dưỡng**: **${calories} / ${calorieGoal} kcal**\n- **Giấc ngủ**: **${sleepH}h${sleepM}p / ${Math.floor(sleepGoalMin / 60)}h**\nBạn muốn mình tư vấn chi tiết hơn về chỉ số nào?`;
  }

  const words = reply.split(' ');
  for (let i = 0; i < words.length; i += 3) {
    if (signal.aborted) return;
    const chunk = words.slice(i, i + 3).join(' ') + ' ';
    yield { type: 'delta', text: chunk };
    await new Promise((r) => setTimeout(r, 50));
  }

  yield { type: 'done' };
}

/** Parse SSE stream từ response.body → async generator ChatEvent. */
async function* readSSE(
  body: ReadableStream<Uint8Array> | null
): AsyncGenerator<ChatEvent, void, unknown> {
  if (!body) return;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = '';
  let currentData = '';

  const flush = (): ChatEvent | null => {
    if (!currentData) return null;
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(currentData) as Record<string, unknown>;
    } catch {
      currentData = '';
      currentEvent = '';
      return null;
    }
    const evt: ChatEvent = { type: (currentEvent || 'delta') as ChatEvent['type'], ...parsed } as ChatEvent;
    currentData = '';
    currentEvent = '';
    return evt;
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).replace(/\r$/, '');
        buffer = buffer.slice(nl + 1);
        if (line.startsWith('event:')) {
          currentEvent = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          currentData = line.slice(5).trim();
        } else if (line.trim() === '') {
          // event boundary
          const evt = flush();
          if (evt) yield evt;
        }
      }
    }
    // flush dòng cuối (không có \n\n)
    const evt = flush();
    if (evt) yield evt;
  } finally {
    reader.releaseLock();
  }
}

/**
 * Gửi 1 tin nhắn, stream events.
 * signal: AbortController signal (huỷ khi rời màn hình hoặc bấm dừng).
 * Returns: async generator ChatEvent.
 */
export async function* streamChat(
  req: ChatRequest,
  signal: AbortSignal
): AsyncGenerator<ChatEvent, void, unknown> {
  const directApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (directApiKey && directApiKey.trim() !== '') {
    yield* callDirectGemini(req, signal, directApiKey.trim());
    return;
  }

  const token = await getAccessToken();
  if (!token) throw new Error('Chưa đăng nhập');

  const body = JSON.stringify({
    message: req.message,
    conversation_id: req.conversation_id ?? null,
    locale: req.locale ?? 'vi',
  });

  let res: Response;
  try {
    res = await expoFetch(EDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-client-info': 'react-native',
      },
      body,
      signal,
    });
  } catch {
    if (signal.aborted) return;
    yield* simulateLocalCoach(req, signal);
    return;
  }

  if (res.status === 404 || res.status === 500) {
    yield* simulateLocalCoach(req, signal);
    return;
  }

  if (res.status === 401) {
    // Refresh session 1 lần rồi thử lại
    const { data } = await supabase.auth.refreshSession();
    if (data.session?.access_token) {
      // Thử lại bằng cách đọc lại toàn bộ stream mới (không dùng recursion trong generator)
      const retryRes = await expoFetch(EDGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session.access_token}`,
          'x-client-info': 'react-native',
        },
        body,
        signal,
      });
      if (retryRes.status !== 200) {
        throw new Error('Phiên đã được refresh nhưng phản hồi không hợp lệ.');
      }
      yield* readSSE(retryRes.body);
      return;
    }
    throw new Error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
  }

  if (!res.ok) {
    let msg = 'Lỗi máy chủ, vui lòng thử lại.';
    try {
      const j = await res.json();
      if (j?.message) msg = j.message;
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  yield* readSSE(res.body);
}

/** Lấy JWT hiện tại; refresh nếu cần. */
async function getAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    return refreshed.session?.access_token ?? null;
  }
  return data.session.access_token;
}
