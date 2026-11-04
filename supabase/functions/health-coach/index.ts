/**
 * Edge Function `health-coach` — bộ điều phối chatbot (plan §5.1, §5.3).
 *
 * Bảo mật (bất biến):
 *  - verify_jwt = true (config.toml): nền tảng chặn request không có JWT hợp lệ.
 *    Ở đây chỉ giải mã payload để lấy `sub` (= auth.uid()) + kiểm tra exp/role.
 *    KHÔNG BAO GIỜ nhận user_id từ body.
 *  - CLIENT A (mang JWT của user): mọi truy vấn dữ liệu y tế + tool → RLS áp dụng.
 *  - CLIENT B (service role): CHỈ dùng cho quota, ghi message, kiểm tra sở hữu
 *    và nạp history. Không dùng để đọc dữ liệu y tế.
 *  - Bí mật nằm trong env Edge Function (`supabase secrets set`), không log.
 *    Không log URL request tới Gemini, không log nội dung hội thoại — chỉ log mã lỗi.
 *
 * Quy trình (§5.3): 1 JWT → 2 validate → 3 quota → 4 hội thoại →
 *   5 safety pre-check (KHÔNG gọi LLM) → 6 history ≤ 20 → 7 cycle_enabled →
 *   8 vòng LLM ≤ 4 lượt tool → 9 stream delta + ghi assistant → 10 done.
 *
 * SSE events: meta | tool | delta | done | error (plan §5.3, §6).
 */

// Deno/Edge Function: npm: specifier cho supabase-js (không có "deno" export
// condition nhưng bản ESM hoạt động bình thường — docs Supabase dùng cách này).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { SYSTEM_PROMPT } from './prompt.ts';
import { BLOCKED_REPLY, EMERGENCY_REPLY, SELF_HARM_REPLY, checkEmergency } from './safety.ts';
import { buildTools } from './tools.ts';
import { createGeminiProvider } from './llm/gemini.ts';
import { LlmError, type LlmMessage, type LlmPart, type ToolDef } from './llm/provider.ts';

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const DAILY_LIMIT = Number(Deno.env.get('CHAT_DAILY_LIMIT') ?? '30') || 30;

const HISTORY_LIMIT = 20; // §5.3 bước 6
const MAX_TOOL_ROUNDS = 4; // §5.3 bước 8
const REQUEST_TIMEOUT_MS = 60_000;
const RETRY_BACKOFF_MS = 1_500; // 429: retry 1 lần có backoff (§5.7)

/** Client A — mang JWT của user; RLS giới hạn đúng dữ liệu của họ. */
function clientForUser(jwt: string): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Client B — service role; chỉ cho quota/ghi message/sở hữu/history. */
function adminClient(): SupabaseClient {
  if (!SERVICE_ROLE_KEY) {
    throw new Error('health-coach: thieu SUPABASE_SERVICE_ROLE_KEY (môi trường EF)');
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------------------------------------------------------------------------
// JWT: nền tảng đã verify signature (verify_jwt=true); ta chỉ đọc claims.
// ---------------------------------------------------------------------------
interface JwtClaims {
  sub?: string;
  role?: string;
  exp?: number;
}

function decodeJwtPayload(token: string): JwtClaims | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '='));
    return JSON.parse(json) as JwtClaims;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// SSE
// ---------------------------------------------------------------------------
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

class SSEWriter {
  private encoder = new TextEncoder();
  readonly headers: Record<string, string> = {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    ...CORS_HEADERS,
  };

  /** Một event: `event: <name>\ndata: <json>\n\n` */
  event(name: string, data: Record<string, unknown>): string {
    return `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
  }

  encode(s: string): Uint8Array {
    return this.encoder.encode(s);
  }
}

// ---------------------------------------------------------------------------
// Validate body (§5.3 bước 2)
// ---------------------------------------------------------------------------
interface RequestBody {
  message: string;
  conversation_id: string | null;
  locale: string;
}

function validateBody(raw: unknown): { body?: RequestBody; error?: string } {
  if (typeof raw !== 'object' || raw === null) return { error: 'bad_request' };
  const o = raw as Record<string, unknown>;
  const message = typeof o.message === 'string' ? o.message.trim() : '';
  if (message.length < 1 || message.length > 2000) {
    return { error: 'Tin nhắn phải từ 1 đến 2000 ký tự.' };
  }
  const locale = typeof o.locale === 'string' ? o.locale : 'vi';
  if (locale !== 'vi') return { error: 'bad_request' };
  const conversation_id =
    typeof o.conversation_id === 'string' && o.conversation_id ? o.conversation_id : null;
  if (conversation_id && !/^[0-9a-f-]{36}$/i.test(conversation_id)) {
    return { error: 'bad_request' };
  }
  return { body: { message, conversation_id, locale } };
}

/** Title = ~6 từ đầu của câu hỏi đầu tiên, không gọi LLM (§5.3 bước 9). */
function titleFromMessage(message: string): string {
  const words = message.replace(/\s+/g, ' ').trim().split(' ').slice(0, 6).join(' ');
  return (words || 'Cuoc tro chuyen moi').slice(0, 120);
}

// ---------------------------------------------------------------------------
// Ghi DB (client B) — RLS chặn client tự ghi, service role mới ghi được
// ---------------------------------------------------------------------------
async function insertMessages(
  admin: SupabaseClient,
  conversationId: string,
  userId: string,
  rows: Array<{ role: 'user' | 'assistant'; content: string; safety_flag?: 'emergency' | 'refused' }>
): Promise<boolean> {
  const { error } = await admin.from('chat_messages').insert(
    rows.map((r) => ({
      conversation_id: conversationId,
      user_id: userId,
      role: r.role,
      content: r.content,
      safety_flag: r.safety_flag ?? null,
    }))
  );
  if (error) {
    console.error('health-coach: insert chat_messages failed:', error.code);
    return false;
  }
  // Bump updated_at (trigger touch_updated_at cũng tự chạy)
  const { error: touchErr } = await admin
    .from('chat_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);
  if (touchErr) console.error('health-coach: touch conversation failed:', touchErr.code);
  return true;
}

// ---------------------------------------------------------------------------
// Vòng LLM + tool (≤ MAX_TOOL_ROUNDS) — trả SSE string để stream, hoặc outcome
// ---------------------------------------------------------------------------
interface LoopOutcome {
  /** assistant text đã stream (trống nếu bị lỗi) */
  text: string;
  /** reply cố định cần stream thêm (khi Gemini chặn an toàn) */
  blockedReply?: string;
  /** mã lỗi: rate_limited | upstream | timeout */
  error?: string;
}

async function* runChatLoop(opts: {
  provider: ReturnType<typeof createGeminiProvider>;
  messages: LlmMessage[];
  tools: ToolDef[];
  signal: AbortSignal;
}): AsyncGenerator<string, LoopOutcome, unknown> {
  const { provider, messages, tools, signal } = opts;
  const writer = new SSEWriter();
  const toolsByName = new Map(tools.map((t) => [t.schema.name, t]));
  let finalText = '';

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    if (signal.aborted) return { text: finalText, error: 'timeout' };

    const toolCalls: Array<{ name: string; args: Record<string, unknown>; thoughtSignature?: string }> = [];
    let roundText = '';
    let llmErr: LlmError | null = null;

    // 429 → retry đúng 1 lần với backoff (§5.7). Chỉ retry khi CHƯA phát delta
    // nào (429 xảy ra lúc nhận HTTP response, trước khi stream chạy).
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS));
        if (signal.aborted) return { text: finalText, error: 'timeout' };
        toolCalls.length = 0;
      }
      try {
        for await (const ev of provider.stream({
          messages,
          tools,
          systemPrompt: SYSTEM_PROMPT,
          signal,
        })) {
          if (ev.type === 'text') {
            // Stream live (§5.3 bước 9). Văn bản ở vòng có tool call (nếu model
            // dẫn trước "để tôi kiểm tra…") cũng được phát — hành vi chấp nhận được.
            roundText += ev.text;
            finalText += ev.text;
            yield writer.event('delta', { text: ev.text });
          } else if (ev.type === 'tool_call') {
            toolCalls.push({ name: ev.name, args: ev.args, thoughtSignature: ev.thoughtSignature });
          }
        }
        llmErr = null;
        break;
      } catch (e) {
        if (signal.aborted) return { text: finalText, error: 'timeout' };
        llmErr = e instanceof LlmError ? e : new LlmError('upstream', String((e as Error)?.message ?? e));
        if (llmErr.code === 'rate_limited' && attempt === 0 && roundText === '') continue;
        break;
      }
    }

    if (llmErr) {
      if (llmErr.code === 'blocked') {
        // Trả lời thân thiện khi Gemini chặn an toàn (§5.7 #6) — phát thêm 1 delta
        finalText = '';
        return { text: '', blockedReply: BLOCKED_REPLY };
      }
      if (llmErr.code === 'rate_limited') return { text: '', error: 'rate_limited' };
      if (llmErr.code === 'timeout') return { text: finalText, error: 'timeout' };
      return { text: finalText, error: 'upstream' };
    }

    if (toolCalls.length === 0) {
      // Vòng trả lời cuối — text đã stream live ở trên.
      return { text: finalText };
    }

    // Có tool call → replay nguyên vẹn part của model (§5.7 #2)
    const modelParts: LlmPart[] = [];
    if (roundText) modelParts.push({ text: roundText });
    for (const call of toolCalls) {
      modelParts.push({
        functionCall: { name: call.name, args: call.args },
        thoughtSignature: call.thoughtSignature,
      });
    }
    messages.push({ role: 'model', parts: modelParts });

    const responseParts: LlmPart[] = [];
    for (const call of toolCalls) {
      const def = toolsByName.get(call.name);
      yield writer.event('tool', { name: call.name, status: 'running' }); // Phase 5: UI "đang xem dữ liệu…"
      if (!def) {
        responseParts.push({
          functionResponse: { name: call.name, response: { error: 'unknown_tool' } },
        });
        continue;
      }
      try {
        const result = await def.execute(call.args);
        let parsed: unknown;
        try {
          parsed = JSON.parse(result);
        } catch {
          parsed = result;
        }
        // Bọc trong khối dữ liệu — KHÔNG được coi là chỉ dẫn (§5.3 bước 8)
        responseParts.push({
          functionResponse: {
            name: call.name,
            response: { kind: 'user_health_data', value: parsed },
          },
        });
      } catch (e) {
        responseParts.push({
          functionResponse: {
            name: call.name,
            response: { error: String((e as Error).message ?? 'tool_failed') },
          },
        });
      }
    }
    messages.push({ role: 'user', parts: responseParts });
  }

  // Hết 4 vòng mà model vẫn đòi tool
  if (finalText) return { text: finalText };
  return { text: '', error: 'upstream' };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') {
    return jsonError(405, 'method_not_allowed', 'Chỉ chấp nhận POST.');
  }

  // 1. JWT (§5.3 bước 1)
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return jsonError(401, 'unauthorized', 'Vui long dang nhap de tro chuyen.');
  const claims = decodeJwtPayload(token);
  const userId = claims?.sub;
  if (!userId || !claims?.exp || claims.exp * 1000 < Date.now()) {
    return jsonError(401, 'unauthorized', 'Phien dang nhap khong hop le hoac da het han.');
  }
  if (claims.role !== 'authenticated') {
    return jsonError(401, 'unauthorized', 'Tai khoản chưa được kích hoạt.');
  }

  // 2. Validate body (§5.3 bước 2)
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError(400, 'bad_request', 'Noi dung khong hop le.');
  }
  const validated = validateBody(raw);
  if (validated.error || !validated.body) {
    return jsonError(400, 'bad_request', validated.error ?? 'bad_request');
  }
  const body = validated.body;

  const admin = adminClient();
  const user = clientForUser(token);

  // 3. Quota (§5.3 bước 3) — consume_chat_quota nguyên tử, chỉ service role gọi
  const { data: quotaOk, error: quotaErr } = await admin.rpc('consume_chat_quota', {
    p_user: userId,
    p_limit: DAILY_LIMIT,
  });
  if (quotaErr) {
    console.error('health-coach: quota rpc failed:', quotaErr.code);
    return jsonError(500, 'upstream', 'Loi phuc vu, vui long thu lai sau.');
  }
  if (quotaOk === false) {
    // Vẫn trả SSE đúng hợp đồng: client chỉ cần đọc event error.
    return singleShotSSE([
      { code: 'rate_limited', message: `Ban da dung het ${DAILY_LIMIT} tin nhan hom nay. Vui long quay lai vao ngay mai.` },
    ]);
  }

  // 4. Hội thoại (§5.3 bước 4): kiểm tra sở hữu bằng client B, hoặc tạo mới
  let conversationId = body.conversation_id;
  if (conversationId) {
    const { data: owned, error: ownErr } = await admin
      .from('chat_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .maybeSingle();
    if (ownErr || !owned) {
      return jsonError(400, 'bad_request', 'Cuoc tro chuyen khong ton tai hoac khong thuoc ve ban.');
    }
  } else {
    const { data: created, error: createErr } = await admin
      .from('chat_conversations')
      .insert({ user_id: userId, title: titleFromMessage(body.message) })
      .select('id')
      .single();
    if (createErr || !created) {
      console.error('health-coach: create conversation failed:', createErr?.code);
      return jsonError(500, 'upstream', 'Khong the tao cuoc tro chuyen.');
    }
    conversationId = created.id as string;
  }

  // 5. Safety pre-check (§5.3 bước 5, §5.6) — KHÔNG gọi LLM
  const safety = checkEmergency(body.message);
  if (safety) {
    const reply = safety === 'self_harm' ? SELF_HARM_REPLY : EMERGENCY_REPLY;
    await insertMessages(admin, conversationId, userId, [
      { role: 'user', content: body.message, safety_flag: 'emergency' },
      { role: 'assistant', content: reply, safety_flag: 'emergency' },
    ]);
    const w = new SSEWriter();
    return new Response(
      w.event('meta', { conversation_id: conversationId, safety }) +
        w.event('delta', { text: reply }) +
        w.event('done', {}),
      { status: 200, headers: w.headers }
    );
  }

  // 6. Nạp history ≤ 20 message từ DB (§5.3 bước 6) — server-side, không tin client
  const { data: history } = await admin
    .from('chat_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('id', { ascending: false })
    .limit(HISTORY_LIMIT);
  const messages: LlmMessage[] = (history ?? [])
    .slice()
    .reverse()
    .map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
      parts: [{ text: m.content }],
    }));

  // Persist user message TRƯỚC khi gọi LLM → history luôn đủ cặp về sau
  await insertMessages(admin, conversationId, userId, [{ role: 'user', content: body.message }]);
  messages.push({ role: 'user', parts: [{ text: body.message }] });

  // 7. cycle_enabled từ profiles bằng client A (RLS) (§5.3 bước 7)
  const { data: profile } = await user
    .from('profiles')
    .select('cycle_enabled')
    .eq('id', userId)
    .maybeSingle();
  const cycleEnabled = profile?.cycle_enabled === true;
  const tools = buildTools(user, cycleEnabled);

  // 8–10. Vòng LLM + stream + ghi assistant + done
  const writer = new SSEWriter();
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(new Error('request-timeout')), REQUEST_TIMEOUT_MS);
  req.signal.addEventListener('abort', () => abort.abort(req.signal.reason), { once: true });

  let provider: ReturnType<typeof createGeminiProvider>;
  try {
    provider = createGeminiProvider({ get: (k: string) => Deno.env.get(k) });
  } catch (e) {
    console.error('health-coach: provider init failed:', (e as Error).message);
    return jsonError(500, 'upstream', 'Tro ly chua san sang, thu lai sau ban nhe.');
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const push = (sse: string) => controller.enqueue(writer.encode(sse));
      try {
        push(writer.event('meta', { conversation_id: conversationId }));

        const gen = runChatLoop({ provider, messages, tools, signal: abort.signal });
        let step = await gen.next();
        while (!step.done) {
          push(step.value);
          step = await gen.next();
        }
        const outcome = step.value;

        if (outcome.blockedReply) {
          push(writer.event('delta', { text: outcome.blockedReply }));
          await insertMessages(admin, conversationId, userId, [
            { role: 'assistant', content: outcome.blockedReply, safety_flag: 'refused' },
          ]);
          push(writer.event('done', {}));
        } else if (outcome.error) {
          const friendly =
            outcome.error === 'rate_limited'
              ? 'May chu dang ban, ban thu lai sau it phut nhe.'
              : outcome.error === 'timeout'
                ? 'Tro ly phan hoi qua lau, vui long thu lai.'
                : 'Co loi khi ket noi tro ly, vui long thu lai sau.';
          push(writer.event('error', { code: outcome.error, message: friendly }));
        } else {
          if (outcome.text) {
            await insertMessages(admin, conversationId, userId, [
              { role: 'assistant', content: outcome.text },
            ]);
          }
          push(writer.event('done', {}));
        }
      } catch (e) {
        console.error('health-coach: stream crashed:', (e as Error).name);
        try {
          push(
            writer.event('error', {
              code: 'upstream',
              message: 'Loi khong xac dinh, vui long thu lai sau.',
            })
          );
        } catch {
          /* client đã đóng */
        }
      } finally {
        clearTimeout(timer);
        try {
          controller.close();
        } catch {
          /* đã đóng */
        }
      }
    },
  });

  return new Response(stream, { status: 200, headers: writer.headers });
});

// ---------------------------------------------------------------------------
// Small response helpers
// ---------------------------------------------------------------------------
function singleShotSSE(errors: Array<{ code: string; message: string }>): Response {
  const w = new SSEWriter();
  let sse = w.event('meta', { conversation_id: null });
  for (const err of errors) {
    sse += w.event('error', err);
  }
  return new Response(sse, { status: 200, headers: w.headers });
}

function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: code, message }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
  });
}
