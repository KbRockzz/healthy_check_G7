/**
 * Giao diện chung cho nhà cung cấp LLM (plan §5.1, §5.7).
 * Hiện tại chỉ có một adapter: Gemini (llm/gemini.ts). Đổi provider = sửa 1 file.
 *
 * Thiết kế:
 *  - `messages`: mảng { role, parts } — parts giữ nguyên raw objects từ model
 *    (bao gồm thoughtSignature khi model gọi tool — không serialize lại).
 *  - `tools`: danh sách tool với schema JSON + hàm execute (chạy phía index).
 *  - Stream là async generator: text delta → tool_call → (caller chạy tool,
 *    append functionResponse) → lặp lại ≤ 4 vòng (đếm ở index.ts).
 */

export interface LlmPart {
  text?: string;
  functionCall?: {
    id?: string;
    name: string;
    args: Record<string, unknown>;
    thoughtSignature?: string;
  };
  functionResponse?: {
    id?: string;
    name: string;
    response: Record<string, unknown>;
  };
  thoughtSignature?: string;
}

export interface LlmMessage {
  role: 'user' | 'model';
  parts: LlmPart[];
}

export interface ToolSchema {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolDef {
  schema: ToolSchema;
  /**
   * Trả về chuỗi JSON đã cắt (≤ ~6000 ký tự). Caller nhét vào functionResponse.
   * Ném lỗi → caller bắt, gửi lại thông báo lỗi cho model (plan §5.3 bước 8).
   */
  execute: (args: Record<string, unknown>) => Promise<string>;
}

export type StreamEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; name: string; args: Record<string, unknown>; thoughtSignature?: string }
  | { type: 'done' };

/** Mã lỗi chuẩn mà index.ts ánh xạ sang SSE `error` event. */
export type LlmErrorCode = 'rate_limited' | 'upstream' | 'unauthorized' | 'blocked' | 'timeout';

export class LlmError extends Error {
  code: LlmErrorCode;
  constructor(code: LlmErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export interface LlmProvider {
  readonly name: string;
  /**
   * Gọi model streaming + function calling.
   * Caller đã build messages + tools và kiểm soát vòng lặp tool.
   * Khi model yêu cầu tool (event tool_call), caller chạy tool.execute,
   * append functionResponse vào messages rồi gọi lại stream.
   * `systemPrompt` chỉ là text (Gemini systemInstruction không nhận part khác).
   */
  stream(opts: {
    messages: LlmMessage[];
    tools: ToolDef[];
    systemPrompt: string;
    signal: AbortSignal;
  }): AsyncGenerator<StreamEvent, void, unknown>;
}
