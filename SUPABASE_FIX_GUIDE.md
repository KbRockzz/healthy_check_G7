# Hướng dẫn Fix Demo Account & Email Confirmation

## Vấn đề 1: Demo account bị lỗi "Database error querying schema"

**Nguyên nhân:** Migration 0005 seed dữ liệu chưa tạo profile records đầy đủ.

### Cách fix (CHỌN 1 TRONG 2):

#### Option A: Chạy migration fix (Khuyến nghị)
1. Mở Supabase Dashboard: https://supabase.com/dashboard/project/pmaxtdfevzncqpbamwcq/sql/new
2. Copy toàn bộ nội dung file `supabase/migrations/0006_fix_demo_accounts.sql`
3. Paste vào SQL Editor và chạy
4. Test đăng nhập với:
   - Email: `demo.owner@healthy-check.app`
   - Password: `demo_pass_1`

#### Option B: Tự tạo user mới
1. Vào **Authentication** > **Users**
2. Click **Add user**
3. Nhập email/password, tick **Confirm email**
4. Lưu lại
5. Đăng nhập với user vừa tạo

---

## Vấn đề 2: Email xác nhận chỉ gửi 1 lần

**Nguyên nhân:** Supabase rate limit email verification.

### Cách giải quyết:

#### Option A: Dùng test email services (Khuyến nghị cho development)
1. Đăng ký tài khoản tại https://mailtrap.io/
2. Vào **Email Testing** > **Inboxes**
3. Copy SMTP credentials
4. Vào **Project Settings** > **SMTP**
5. Paste credentials vào
6. Test đăng ký, email sẽ hiện trong Mailtrap inbox

#### Option B: Tắt email confirmation (CHỈ cho development)
1. Vào **Authentication** > **Settings**
2. Bỏ tick **"Enable email confirmations"**
3. Lưu lại
4. Test đăng ký không cần xác thực email

#### Option C: Dùng demo account (Nhanh nhất)
Sử dụng tài khoản đã được setup sẵn:
- **Owner**: `demo.owner@healthy-check.app` / `demo_pass_1`
- **Receiver**: `demo.receiver@healthy-check.app` / `demo_pass_2`

---

## Vấn đề 3: Link xác nhận redirect về localhost

**Giải pháp:** Đã cấu hình deep linking trong app.

### Cấu hình Supabase Dashboard:
1. Vào **Authentication** > **URL Configuration**
2. Thêm vào **Redirect URLs**:
   ```
   healthy-check-g7://auth/callback
   ```
3. Thêm vào **Allowed Redirect URLs**:
   ```
   healthy-check-g7://
   ```
4. Lưu lại

### Lưu ý:
- Deep linking chỉ hoạt động trên **development build** hoặc **production app**
- Expo Go có thể không hỗ trợ deep linking đầy đủ
- Cần build native app để test deep linking: `npx expo run:android`

---

## Kiểm tra trạng thái Database

Chạy query sau để kiểm tra:
```sql
-- Kiểm tra demo users
SELECT id, email, created_at FROM auth.users WHERE email LIKE '%demo%';

-- Kiểm tra profiles
SELECT id, full_name, created_at FROM public.profiles WHERE id IN (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);
```

Nếu không có kết quả, chạy migration `0006_fix_demo_accounts.sql`.
