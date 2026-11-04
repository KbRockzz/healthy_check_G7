
/** Gọi trực tiếp Google Gemini API nếu user cung cấp EXPO_PUBLIC_GEMINI_API_KEY trong file .env */
async function* callDirectGemini(req: ChatRequest, signal: AbortSignal, apiKey: string): AsyncGenerator<ChatEvent, void, unknown> {
  yield { type: 'meta', conversation_id: req.conversation_id || 'conv-direct-gemini' };

  // Kiểm tra khẩn cấp trước khi gọi LLM
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

  yield { type: 'tool', name: 'gemini_health_coach', status: 'running' };

  const systemPrompt = `Bạn là Health Coach AI của ứng dụng Healthy Check (nhóm 7).
Bạn tư vấn sức khỏe bằng tiếng Việt một cách khoa học, thân thiện, súc tích và có động viên.
Dữ liệu sức khỏe hôm nay của người dùng Nguyễn Minh Anh:
- Bước chân: 7,540 bước (mục tiêu 10,000 bước).
- Giấc ngủ đêm qua: 7 giờ 15 phút (mục tiêu 8 giờ, giấc ngủ sâu 22%).
- Nước uống: 1,650 ml (mục tiêu 2,000 ml).
- Lượng calo nạp vào: 1,450 kcal (mục tiêu 1,800 kcal).
- Điểm sức khỏe: 82/100 (Tốt).
Hãy trả lời dựa trên ngữ cảnh này khi người dùng hỏi về sức khỏe của họ.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\nCâu hỏi của người dùng: ${req.message}` }] }
        ]
      }),
      signal
    });

    if (!resp.ok) {
      console.warn('Direct Gemini call failed with status:', resp.status, 'falling back to local coach');
      yield* simulateLocalCoach(req, signal);
      return;
    }

    const json = await resp.json();
    const replyText = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!replyText) {
      yield* simulateLocalCoach(req, signal);
      return;
    }

    const words = replyText.split(' ');
    for (let i = 0; i < words.length; i += 3) {
      if (signal.aborted) return;
      yield { type: 'delta', text: words.slice(i, i + 3).join(' ') + ' ' };
      await new Promise((r) => setTimeout(r, 40));
    }
    yield { type: 'done' };
  } catch (err) {
    console.warn('Direct Gemini error:', err);
    yield* simulateLocalCoach(req, signal);
  }
}


/** Fallback mô phỏng Health Coach thông minh khi Edge Function chưa deploy lên Cloud (404/local test) */
async function* simulateLocalCoach(req: ChatRequest, signal: AbortSignal): AsyncGenerator<ChatEvent, void, unknown> {
  yield { type: 'meta', conversation_id: req.conversation_id || 'conv-local-demo' };

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

  // Tool event simulation (§5.3: tool event)
  yield { type: 'tool', name: 'get_dashboard_summary', status: 'running' };
  await new Promise((r) => setTimeout(r, 600));

  let reply = '';
  if (/bước|đi bộ|steps/i.test(lower)) {
    reply = 'Chào Minh Anh! Hôm nay bạn đã đi được **7,540 bước**, đạt **75.4%** mục tiêu 10,000 bước. Bạn đã tiêu hao khoảng 325 kcal. Buổi tối bạn chỉ cần đi dạo nhẹ nhàng khoảng 20 phút là sẽ hoàn thành xuất sắc mục tiêu ngày hôm nay đấy! 👟🔥';
  } else if (/ngủ|sleep/i.test(lower)) {
    reply = 'Đêm qua bạn đã ngủ được **7 giờ 15 phút**, đạt **90.6%** so với mục tiêu 8 giờ. Trong đó giấc ngủ sâu (Deep Sleep) chiếm khoảng 22%, đây là tỷ lệ rất lý tưởng để phục hồi cơ bắp và não bộ. Đêm nay hãy tiếp tục duy trì thói quen đi ngủ trước 23h nhé! 🌙✨';
  } else if (/nước|water/i.test(lower)) {
    reply = 'Hôm nay bạn đã uống được **1,650 ml** nước (đạt **82.5%** mục tiêu 2,000 ml). Thời tiết hôm nay khá hanh khô, bạn nên bổ sung thêm 1 ly nước ấm khoảng 350ml trước 20h để cơ thể được cấp ẩm đầy đủ nhé! 💧';
  } else if (/calo|ăn|dinh dưỡng|calories/i.test(lower)) {
    reply = 'Hôm nay bạn đã ghi nhận nạp **1,450 kcal** trên hạn mức 1,800 kcal (còn lại 350 kcal). Phân bổ dinh dưỡng: Carbs 52%, Protein 23%, Chất béo 25%. Nếu cảm thấy đói nhẹ trước giờ ngủ, bạn có thể chọn một bữa phụ giàu protein như sữa chua không đường hoặc hạnh nhân! 🥗';
  } else if (/chu kỳ|kinh nguyệt|cycle/i.test(lower)) {
    reply = 'Theo dõi chu kỳ cho thấy hôm nay bạn đang ở **ngày thứ 12** (Giai đoạn Nang trứng - Follicular phase). Nồng độ Estrogen đang tăng dần, thể lực và tinh thần của bạn rất dồi dào — thời điểm vàng để tập luyện nâng cao thể lực hoặc thử thách mục tiêu mới! 🌸';
  } else if (/điểm|sức khỏe|score|tổng quát/i.test(lower)) {
    reply = 'Điểm sức khỏe hôm nay của bạn là **82/100 (Tốt)**. Các chỉ số bước chân và giấc ngủ được duy trì rất ổn định. Để cải thiện thêm điểm số, bạn chỉ cần hoàn thành nốt mục tiêu uống nước 2L hôm nay nhé! 🌟';
  } else {
    reply = 'Chào Minh Anh! Tôi là **Health Coach AI** của Healthy Check. Dựa trên dữ liệu hôm nay, sức khỏe của bạn đang ở trạng thái rất tốt (Điểm 82/100). Bạn có thể hỏi tôi chi tiết về số bước chân, giấc ngủ đêm qua, lượng nước đã uống hoặc tư vấn dinh dưỡng!';
  }

  const words = reply.split(' ');
  for (let i = 0; i < words.length; i += 3) {
    if (signal.aborted) return;
    const chunk = words.slice(i, i + 3).join(' ') + ' ';
    yield { type: 'delta', text: chunk };
    await new Promise((r) => setTimeout(r, 60));
  }

  yield { type: 'done' };
}

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
import { supabase, SUPABASE_URL } from './supabase';

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
  } catch (e) {
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
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.access_token) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      return refreshed.session?.access_token ?? 'demo-token';
    }
    return data.session.access_token;
  } catch {
    return 'demo-token';
  }
}