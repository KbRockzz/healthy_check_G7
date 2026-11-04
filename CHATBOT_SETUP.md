# Health Coach — Cài đặt & vận hành

Chatbot "Health Coach" của Healthy Check (G7). Xem `CHATBOT_PLAN.md` để biết thiết kế đầy đủ.

## 1. Supabase

```bash
supabase login
supabase projects link
supabase db push          # áp dụng migration 0013_chat.sql
```

Migration `0013_chat.sql` tạo 3 bảng (`chat_conversations`, `chat_messages`,
`chat_usage`) + hàm `consume_chat_quota` (security definer, service role).
RLS: client authenticated chỉ `select` + `delete` của chính mình; mọi `insert`
do Edge Function (service role) thực hiện.

## 2. Secret (bắt buộc — KHÔNG commit)

```bash
supabase secrets set \
  GEMINI_API_KEY=... \
  LLM_MODEL=gemini-3.5-flash-lite \
  LLM_MODEL_FALLBACK=gemini-3.1-flash-lite \
  CHAT_DAILY_LIMIT=30
```

- `GEMINI_API_KEY`: tạo tại Google AI Studio → **tuyệt đối không dán vào chat,
  repo hay `.env` của app**.
- `LLM_MODEL`: model Gemini hiện dùng. Kiểm tra lại danh sách model trên
  `ai.google.dev` trước khi deploy — tên model đổi nhanh (§5.7).
- `CHAT_DAILY_LIMIT`: số tin nhắn tối đa mỗi người mỗi ngày (mặc định 30).

## 3. Deploy Edge Function

```bash
supabase functions deploy health-coach
```

Sau deploy, test bằng curl (tạo JWT test hoặc dùng session thực tế):

```bash
# 1. Lấy token từ Supabase (hoặc dùng `supabase auth login`)
TOKEN=$(supabase auth login --email ... --password ... | jq -r .access_token)

# 2. Gửi 1 tin nhắn (stream)
curl -sS -N -X POST \
  https://pmaxtdfevzncqpbamwcq.supabase.co/functions/v1/health-coach \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hôm nay tôi đi bao nhiêu bước?","locale":"vi"}'
```

## 4. Kiểm thử nhanh (§8)

| Kiểm | Kỳ vọng |
|---|---|
| Không JWT | `401` |
| Tin nhắn > 2000 ký tự | `401`/`400` `bad_request` |
| Hết hạn mức (31 tin nhắn) | event `error: rate_limited` |
| Tin nhắn khẩn cấp ("đau bụng, khó thở") | event `delta` → lời khuyên gọi **115**, không gọi LLM |
| Tin nhắn "tự tử" | event `delta` → lời khuyên ấm áp, không gọi LLM |
| Câu hỏi ngoài phạm vi ("thời tiết") | Trả lời lịch sự từ chối, không dùng tool |
| `cycle_enabled = false` + hỏi chu kỳ | Trả lời hướng dẫn bật tính năng, không gọi tool |
| `cycle_enabled = true` + hỏi chu kỳ | Gọi `get_cycle_summary`, trả về dữ liệu chu kỳ |

## 5. Client (Expo Go)

- Mở chat từ **Dashboard** → thẻ "AI Health Coach" → `/chat`,
  hoặc **FAB** (floating) ở Dashboard/Health Data/Explore/Sharing.
- FAB ẩn ở `/launch`, `/auth/*`, `/onboarding`, `/chat`.
- Lần đầu mở: hiện consent sheet (dữ liệu gửi tới Google Gemini).
- Banner "Chế độ thử nghiệm" hiện khi đang dùng Gemini **tầng miễn phí**.
  Khi chuyển sang trả phí → gỡ banner này (§6.5).

## 6. Kiểm thử (§8)

```bash
npx expo lint
npx tsc --noEmit
npx expo-doctor
```

Edge Function: `supabase/functions/health-coach` — typecheck bằng `deno check`
(nếu có Deno) hoặc deploy để Supabase validate.

## 7. Mở rộng (không trong scope hiện tại)

- Phase 6: `use-chat-history` đã có; `handleOpenConversation` cần nạp messages
  từ DB khi chọn hội thoại cũ.
- Phase 6: `buildDynamicPrompts` — lấy `stepsPct`/`sleepBelowGoal` từ `DashboardSummary`
  đang cache (hiện tại placeholder).
- Tầng trả phí: gỡ banner "Chế độ thử nghiệm" (§6.5).
- Thêm model mới vào `LLM_MODEL` + `LLM_MODEL_FALLBACK` (§5.7).