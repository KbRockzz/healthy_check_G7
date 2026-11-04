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
    throw new Error('Không thể kết nối đến máy chủ. Kiểm tra mạng.');
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