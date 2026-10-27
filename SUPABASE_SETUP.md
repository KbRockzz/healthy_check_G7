# Hướng dẫn cấu hình Supabase cho Mobile App

## Vấn đề 1: Email chỉ gửi được 1 lần

Supabase có giới hạn rate limit cho email. Để fix trong development:

### Option A: Tắt email confirmation (Dành cho development)
1. Vào Supabase Dashboard: https://supabase.com/dashboard/project/pmaxtdfevzncqpbamwcq/auth/settings
2. Chọn **Authentication** > **URL Configuration**
3. Bỏ tick **"Enable email confirmations"**
4. Lưu lại

### Option B: Sử dụng demo account (Test ngay)
- Email: `demo.owner@healthy-check.app`
- Password: `demo_pass_1`

---

## Vấn đề 2: Link xác nhận redirect về localhost

Cần cấu hình deep linking để app xử lý link từ email:

### Bước 1: Cấu hình Redirect URLs
1. Vào **Auth Settings** > **URL Configuration**
2. Thêm vào **Redirect URLs**:
   - `healthy-check-g7://auth/callback`
   - `https://pmaxtdfevzncqpbamwcq.supabase.co/auth/v1/callback`
3. Lưu lại

### Bước 2: Cấu hình External URLs
1. Vào **Auth Settings** > **Providers** > **Email**
2. Thêm vào **Allowed domains**:
   - `pmaxtdfevzncqpbamwcq.supabase.co`
3. Save

---

## Test đăng ký mới

Sau khi cấu hình xong, bạn có thể test:
1. Mở app trên Expo Go
2. Đăng ký với email mới
3. Kiểm tra email và click vào link xác nhận
4. Link sẽ mở app thay vì trang web

---

## Deep Linking Setup

App đã được config deep linking trong `app.json`:
- Scheme: `healthy-check-g7`
- Host: `auth.callback`

URL callback từ Supabase sẽ có dạng:
```
healthy-check-g7://auth/callback?token=xxx&type=recovery
```
