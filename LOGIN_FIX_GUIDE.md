# Hướng dẫn Fix Lỗi Đăng Nhập

## Vấn đề đang gặp:
1. **Login 500 error** - Server trả về lỗi 500 khi đăng nhập
2. **Demo account không đăng nhập được** - Do chưa có password và profile
3. **User thật đăng nhập xong không có phản hồi** - Có thể do profile chưa tồn tại

## Bước 1: Chạy Migration Fix (QUAN TRỌNG)

### Cách 1: Chạy qua SQL Editor (Khuyến nghị)
1. Mở Supabase Dashboard: https://supabase.com/dashboard/project/pmaxtdfevzncqpbamwcq
2. Vào **SQL Editor** (bên trái)
3. Click **New Query**
4. Copy toàn bộ nội dung file `supabase/migrations/0007_fix_login_issues.sql`
5. Paste vào và click **Run**
6. Đợi hoàn thành (sẽ có thông báo success)

### Cách 2: Chạy từng bước thủ công
Nếu cách 1 không được, chạy từng lệnh sau:

```sql
-- Fix demo owner
update auth.users 
set encrypted_password = crypt('demo_pass_1', gen_salt('bf')),
    confirmed_at = now(),
    email_confirmed_at = now()
where email = 'demo.owner@healthy-check.app';

-- Tạo profile cho demo owner
insert into public.profiles (id, full_name, gender)
select id, 'Nguyễn Minh Anh', 'female'
from auth.users 
where email = 'demo.owner@healthy-check.app'
and not exists (select 1 from public.profiles p where p.id = auth.users.id);

-- Fix demo receiver  
update auth.users 
set encrypted_password = crypt('demo_pass_2', gen_salt('bf')),
    confirmed_at = now(),
    email_confirmed_at = now()
where email = 'demo.receiver@healthy-check.app';

-- Tạo profile cho demo receiver
insert into public.profiles (id, full_name, gender)
select id, 'Trần Hoàng Long', 'male'
from auth.users 
where email = 'demo.receiver@healthy-check.app'
and not exists (select 1 from public.profiles p where p.id = auth.users.id);

-- Tạo profiles cho các user thật
insert into public.profiles (id, full_name, gender)
select 
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  'unspecified'
from auth.users u
where u.confirmed_at is not null
and not exists (select 1 from public.profiles p where p.id = u.id);
```

## Bước 2: Kiểm tra lại sau khi chạy fix

### Test demo account:
- Email: `demo.owner@healthy-check.app`
- Password: `demo_pass_1`

### Test tài khoản thật:
- Dùng email/password bạn đã đăng ký

## Bước 3: Nếu vẫn lỗi, kiểm tra Logs

Vào **Database** → **Logs** trong Supabase Dashboard để xem chi tiết lỗi.

## Nguyên nhân lỗi:

1. **500 Error khi login**: Có thể do trigger không chạy hoặc policy RLS bị lỗi
2. **Demo account không đăng nhập được**: Do `encrypted_password` null hoặc `confirmed_at` null
3. **Không có phản hồi sau khi login**: Profile chưa được tạo tự động

## Cách phòng tránh:

Sau khi chạy migration fix, trigger `on_auth_user_created` sẽ tự động tạo profile khi user đăng ký mới.
