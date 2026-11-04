/**
 * Adapter Gemini REST (plan §5.7) — implement LlmProvider (provider.ts).
 *
 * QUYẾT ĐỊNH BỀ MẶT API (§5.7 mục chưa chốt #1):
 *   Dùng bề mặt `generateContent`/`streamGenerateContent` với `functionDeclarations`
 *   + `toolConfig`, KHÔNG dùng Interactions API. Lý do:
 *     - Bề mặt này hỗ trợ ĐỒNG THỜI function calling + streaming (đã xác nhận
 *       trong docs streamGenerateContent: request body có trường `tools`).
 *     - Là bề mặt mà SDK @google/genai và mọi ví dụ Edge Function đang dùng,
 *       ổn định hơn Interactions API (còn mới).
 *   → Khi gọi lại sau tool, các part của model (functionCall + thoughtSignature)
 *     được gửi lại NGUYÊN VẸN như đã nhận (§5.7 #2).
 *
 * KEY: truyền qua header `x-goog-api-key`, KHÔNG dùng ?key= để key không nằm
 * trong URL/log (§5.7 #4). Không bao giờ log URL đầy đủ hay nội dung hội thoại;
 * chỉ log số token từ usageMetadata (§5.7 #7).
 *
 * safetySettings: giữ nguyên mặc định, KHÔNG nới lỏng (§5.6, §5.7 #6); block
 * được ánh xạ thành LlmError('blocked') để index.ts trả lời thân thiện.
 */

import {
  LlmError,
  type LlmMessage,
  type LlmPart,
  type LlmProvider,
  type StreamEvent,
  type ToolDef,
} from './provider.ts';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Phần thân request — chỉ mô tả những field chúng ta dùng. */
interface GeminiFunctionCall {
  id?: string;
  name: string;
  args?: Record<string, unknown>;
}
interface GeminiFunctionResponse {
  id?: string;
  name: string;
  response?: Record<string, unknown>;
}
interface GeminiPart {
  text?: string;
  thoughtSignature?: string;
  functionCall?: GeminiFunctionCall;
  functionResponse?: GeminiFunctionResponse;
}
interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}
interface GeminiChunk {
  candidates?: Array<{
    content?: { parts?: GeminiPart[]; role?: string };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

/**
 * Gọi Gemini với timeout cứng (plan §8.1: timeout → thông báo, không treo).
 * AbortSignal hợp nhất: signal của request (client huỷ) + timer riêng.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  callerSignal: AbortSignal,
  timeoutMs: number
): Promise<Response> {
  const timer = new AbortController();
  const id = setTimeout(() => timer.abort(new Error('timeout')), timeoutMs);
  const onCallerAbort = () => timer.abort(callerSignal.reason);
  if (callerSignal.aborted) onCallerAbort();
  else callerSignal.addEventListener('abort', onCallerAbort, { once: true });
  try {
    return await fetch(url, { ...init, signal: timer.signal });
  } catch (e) {
    if (timer.signal.aborted && callerSignal.aborted) {
      // Client huỷ giữa stream — không phải lỗi, chỉ dừng.
      throw new LlmError('timeout', 'client-abort');
    }
    if (timer.signal.aborted) throw new LlmError('timeout', String((e as Error).message));
    throw e;
  } finally {
    clearTimeout(id);
    callerSignal.removeEventListener('abort', onCallerAbort);
  }
}

function toGeminiContents(messages: LlmMessage[]): GeminiContent[] {
  return messages.map((m) => ({
    role: m.role,
    parts: m.parts.map((p): GeminiPart => {
      const gp: GeminiPart = {};
      if (p.text !== undefined) gp.text = p.text;
      // Giữ thoughtSignature ở cấp part (Gemini 3 yêu cầu khi replay functionCall)
      if (p.thoughtSignature !== undefined) gp.thoughtSignature = p.thoughtSignature;
      if (p.functionCall) {
        gp.functionCall = {
          id: p.functionCall.id,
          name: p.functionCall.name,
          args: p.functionCall.args,
        };
        // thoughtSignature của chính part functionCall (model trả về)
        if (p.functionCall.thoughtSignature) gp.thoughtSignature = p.functionCall.thoughtSignature;
      }
      if (p.functionResponse) {
        gp.functionResponse = {
          id: p.functionResponse.id,
          name: p.functionResponse.name,
          response: p.functionResponse.response,
        };
      }
      return gp;
    }),
  }));
}

/**
 * Đọc SSE từ response.body, yield từng JSON chunk.
 * Dòng sự kiện có dạng `data: {...}`; dòng khác (comment `:`, empty) bỏ qua.
 * Tự tách theo newline — KHÔNG cần EventSource (không có trên Deno).
 */
async function* readSseJson(res: Response): AsyncGenerator<GeminiChunk, void, unknown> {
  const body = res.body;
  if (!body) return;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      // SSE tách event bằng \n (mỗi event 1 dòng data ở Gemini alt=sse)
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).replace(/\r$/, '');
        buffer = buffer.slice(nl + 1);
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          yield JSON.parse(payload) as GeminiChunk;
        } catch {
          // Chunk không parse được (rare) — bỏ qua, tiếp tục stream.
        }
      }
    }
    // xử lý dòng cuối còn sót (không có newline kết thúc)
    const last = buffer.trim();
    if (last.startsWith('data:')) {
      const payload = last.slice(5).trim();
      if (payload && payload !== '[DONE]') {
        try {
          yield JSON.parse(payload) as GeminiChunk;
        } catch { /* ignore */ }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export class GeminiProvider implements LlmProvider {
  readonly name = 'gemini';
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fallbackModel: string;
  private readonly timeoutMs: number;

  constructor(opts: {
    apiKey: string;
    model: string;
    /** Model dự phòng nếu model chính lỗi 404/503 (plan Phase 0 Q1). */
    fallbackModel?: string;
    timeoutMs?: number;
  }) {
    if (!opts.apiKey) throw new LlmError('unauthorized', 'Thiếu GEMINI_API_KEY');
    this.apiKey = opts.apiKey;
    this.model = opts.model;
    this.fallbackModel = opts.fallbackModel ?? opts.model;
    this.timeoutMs = opts.timeoutMs ?? 60_000;
  }

  async *stream(opts: {
    messages: LlmMessage[];
    tools: ToolDef[];
    systemPrompt: string;
    signal: AbortSignal;
  }): AsyncGenerator<StreamEvent, void, unknown> {
    const { messages, tools, systemPrompt, signal } = opts;

    const requestBody: Record<string, unknown> = {
      contents: toGeminiContents(messages),
      systemInstruction: { parts: [{ text: systemPrompt }] }, // #5: chỉ text
      // #6: KHÔNG đặt safetySettings → dùng mặc định, không nới lỏng.
    };
    // Gộp mọi functionDeclarations vào MỘT object tools (đúng schema Gemini).
    if (tools.length) {
      requestBody.tools = [
        {
          functionDeclarations: tools.map((t) => ({
            name: t.schema.name,
            description: t.schema.description,
            parameters: t.schema.parameters,
          })),
        },
      ];
      // mode AUTO: model tự quyết khi nào gọi tool; không ép.
      requestBody.toolConfig = { functionCallingConfig: { mode: 'AUTO' } };
    } else {
      delete requestBody.toolConfig;
    }

    // Thử model chính; nếu lỗi "model not found"/503 → thử fallback 1 lần.
    let res: Response;
    try {
      res = await this.callModel(this.model, requestBody, signal);
    } catch (e) {
      if (
        e instanceof LlmError &&
        (e.message.startsWith('404') || e.message.startsWith('503')) &&
        this.fallbackModel !== this.model
      ) {
        console.log(`gemini: model ${this.model} unavailable, trying ${this.fallbackModel}`);
        res = await this.callModel(this.fallbackModel, requestBody, signal);
      } else {
        throw e;
      }
    }

    // Gom part trả về để caller (index.ts) replay nguyên vẹn khi gọi tool.
    let textBuf = '';
    const pendingCalls: Array<{
      name: string;
      args: Record<string, unknown>;
      id?: string;
      thoughtSignature?: string;
    }> = [];
    let finishReason: string | null = null;

    for await (const chunk of readSseJson(res)) {
      if (signal.aborted) return;

      // #6: prompt bị chặn an toàn → báo 'blocked'
      if (chunk.promptFeedback?.blockReason) {
        throw new LlmError('blocked', `promptFeedback:${chunk.promptFeedback.blockReason}`);
      }

      const cand = chunk.candidates?.[0];
      if (!cand) continue;
      if (cand.finishReason) finishReason = cand.finishReason;

      const parts = cand.content?.parts ?? [];
      for (const part of parts) {
        if (typeof part.text === 'string' && part.text.length) {
          textBuf += part.text;
          yield { type: 'text', text: part.text };
        }
        if (part.functionCall) {
          pendingCalls.push({
            name: part.functionCall.name,
            args: part.functionCall.args ?? {},
            id: part.functionCall.id,
            thoughtSignature: part.thoughtSignature,
          });
        }
      }
    }

    // finishReason an toàn ứng viên (khác promptFeedback)
    if (finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT') {
      throw new LlmError('blocked', `finishReason:${finishReason}`);
    }

    // Phát tool_call (đã gom) rồi done.
    for (const call of pendingCalls) {
      yield {
        type: 'tool_call',
        name: call.name,
        args: call.args,
        thoughtSignature: call.thoughtSignature,
      };
    }
    yield { type: 'done' };
  }

  private async callModel(
    model: string,
    body: Record<string, unknown>,
    signal: AbortSignal
  ): Promise<Response> {
    const url = `${BASE}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
    let res: Response;
    try {
      res = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify(body),
        },
        signal,
        this.timeoutMs
      );
    } catch (e) {
      if (e instanceof LlmError) throw e;
      if (signal.aborted) throw new LlmError('timeout', 'client-abort');
      throw new LlmError('upstream', `network: ${(e as Error).message}`);
    }

    if (!res.ok) {
      // Đọc message lỗi (KHÔNG log URL/key). 429 → rate_limited để index retry 1 lần.
      let detail = '';
      try {
        const j = await res.json();
        detail = j?.error?.message ?? '';
      } catch { /* body không phải JSON */ }
      const tag = `${res.status}`;
      if (res.status === 429) throw new LlmError('rate_limited', `${tag} ${detail}`.trim());
      if (res.status === 400 && /api.?key/i.test(detail)) throw new LlmError('unauthorized', detail);
      if (res.status >= 500) throw new LlmError('upstream', `${tag} ${detail}`.trim());
      throw new LlmError('upstream', `${tag} ${detail}`.trim());
    }
    return res;
  }
}

/** Factory đọc env; KHÔNG hard-code tên model (§5.7: model đổi nhanh). */
export function createGeminiProvider(env: {
  get(key: string): string | undefined;
}): GeminiProvider {
  const apiKey = env.get('GEMINI_API_KEY') ?? '';
  const model = env.get('LLM_MODEL') ?? 'gemini-3.5-flash-lite';
  const fallback = env.get('LLM_MODEL_FALLBACK') ?? 'gemini-3.1-flash-lite';
  return new GeminiProvider({ apiKey, model, fallbackModel: fallback });
}
