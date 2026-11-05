/**
 * Lưới an toàn khẩn cấp — chạy TRƯỚC khi gọi Gemini (plan §5.6).
 * Regex chỉ là lưới an toàn thô; system prompt vẫn phải dặn mô hình xử lý tương tự.
 *
 * Quyết định Q3: đường dây hỗ trợ tâm lý cụ thể KHÔNG chèn (chưa được kiểm chứng).
 * `SELF_HARM_HOTLINE` để rỗng + TODO(owner) — agent không tự điền số.
 */

// Chữ có dấu và không dấu, viết hoa/thường để bắt bắt tốt hơn.
const EMERGENCY_PATTERNS: RegExp[] = [
  /\bđau\s*ngực\b/i,
  /\bkhó\s*thở\b/i,
  /\bkhó\s*hít\b/i,
  /\bngất\s*xỉu\b/i,
  /\bcho\s*giật\b/i,
  /\bco\s*giật\b/i,
  /\bchảy\s*máu\s*nhiều\b/i,
  /\bchảy\s*máu\b/i,
  /\bđột\s*quyny\b/i,
  /\bđột\s*qụy\b/i,
  /\bđột\s*qụy\b/i,
  /\bnghi\s*ngộ\s*độc\b/i,
  /\bngộ\s*độc\b/i,
  /\bphản\s*vị\s*thuốc\b/i,
  /\bquá\s*liều\b/i,
  /\btự\s*chính\s*triệu\s*chứng\b/i,
  /\bcấp\s*cứu\b/i,
  /\b115\b/,
  /\bkhan\s*cấp\b/i,
  /\bnguy\s*hiểm\s*tức\s*thì\b/i,
  /\bnguy\s*hiểm\s*cho\s*cuộc\s*đời\b/i,
];

const SELF_HARM_PATTERNS: RegExp[] = [
  /\btự\s*gây\s*hại\b/i,
  /\btự\s*triệu\s*chứng\b/i,
  /\btự\s*giết\s*tự\b/i,
  /\btự\s*tử\b/i,
  /\btự\s*thi\s*chuicide\b/i,
  /\bmuốn\s*chết\b/i,
  /\bmuốn\s*tự\s*chết\b/i,
  /\bsống\s*chết\b/i,
  /\bchết\s*như\s*thế\b/i,
  /\bkhông\s*muốn\s*sống\b/i,
  /\bđau\s*đầu\s*tâm\s*tri\b/i,
];

// Chưa được kiểm chứng — không tự điền số.
// TODO(owner): điền số đường dây hỗ trợ tâm lý đã kiểm chứng, hoặc giữ rỗng.
export const SELF_HARM_HOTLINE = '';

export const EMERGENCY_REPLY =
  '🚨 **Cấp cứu ngay**: Nếu bạn đang gặp đau ngực, khó thở, ngất xỉu, co giật, chảy máu nhiều, dấu hiệu đột quyny hoặc nhiễm độc — **hãy gọi 115 ngay** hoặc đến cơ sở y tế gần nhất. Đây là tình huống khẩn cấp, cần hỗ trợ y tế tức thì. Sau khi an toàn, hãy chia sẻ với người thân tin cậy hoặc chuyên gia y tế.';

export const SELF_HARM_REPLY =
  '💙 Bạn đang gặp điều gì nặng nề vậy? Hãy biết rằng bạn không đơn độc. Hãy liên hệ ngay với người thân tin cậy hoặc cơ sở y tế/chuyên khoa tâm thần gần nhất để được hỗ trợ. Nếu bạn đang gặp nguy hiểm tức thì, vui lòng gọi **115**. Thông tin bạn chia sẻ sẽ được giữ kín và không bị phán xét.';

export function checkEmergency(message: string): 'emergency' | 'self_harm' | null {
  if (!message) return null;
  if (SELF_HARM_PATTERNS.some((re) => re.test(message))) return 'self_harm';
  if (EMERGENCY_PATTERNS.some((re) => re.test(message))) return 'emergency';
  return null;
}

/**
 * Kiểm tra phản hồi từ Gemini có bịSafety block không.
 * Trả về mã block nếu có, null nếu an toàn.
 */
export function checkBlockedResponse(response: any): string | null {
  if (!response) return null;
  const feedback = response.promptFeedback;
  if (feedback?.blockReason) return feedback.blockReason;
  const candidates = response.candidates || [];
  for (const c of candidates) {
    if (c?.finishReason === 'SAFETY' || c?.finishReason === 'PROHIBITED_CONTENT') {
      return c.finishReason;
    }
  }
  return null;
}

export const BLOCKED_REPLY =
  'Xin lỗi, tôi không thể trả lời câu hỏi này. Nếu bạn cần hỗ trợ về sức khỏe, hãy liên hệ với chuyên gia y tế hoặc cơ sở tư vấn phù hợp.';