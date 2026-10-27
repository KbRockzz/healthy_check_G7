-- =====================================================================
-- FIX DEMO ACCOUNTS AND USER PROFILES
-- Chạy migration này để sửa lỗi đăng nhập
-- =====================================================================

-- 1. Fix demo owner account
do $$
begin
  -- Cập nhật password cho demo owner
  update auth.users
  set encrypted_password = crypt('demo_pass_1', gen_salt('bf')),
      confirmed_at = now(),
      email_confirmed_at = now(),
      updated_at = now()
  where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  -- Tạo profile nếu chưa có
  insert into public.profiles (id, full_name, gender, step_goal, calorie_goal, water_goal_ml, sleep_goal_minutes, bedtime, wake_time, cycle_length_days, period_length_days)
  values (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Nguyễn Minh Anh',
    'female',
    10000, 1800, 2000, 480, '22:00'::time, '07:00'::time, 28, 5
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    updated_at = now();

  -- Seed data cho owner
  insert into public.step_records (user_id, recorded_on, steps, distance_km, calories_burned, active_minutes, source)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date, 6432, 4.80, 320, 52, 'seed')
  on conflict (user_id, recorded_on) do update set
    steps = excluded.steps,
    updated_at = now();

  insert into public.sleep_records (user_id, sleep_date, total_minutes, deep_minutes, light_minutes, rem_minutes, source)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date, 450, 90, 225, 112, 'seed')
  on conflict (user_id, sleep_date) do update set
    total_minutes = excluded.total_minutes,
    updated_at = now();

  insert into public.nutrition_logs (user_id, logged_on, meal, food_name, calories, protein_g, carbs_g, fat_g, source)
  values
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date, 'breakfast', 'Phở bò', 500, 25, 60, 15, 'seed'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date, 'lunch', 'Cơm gà', 650, 30, 80, 20, 'seed')
  on conflict do nothing;
end $$;

-- 2. Fix demo receiver account
do $$
begin
  -- Cập nhật password cho demo receiver
  update auth.users
  set encrypted_password = crypt('demo_pass_2', gen_salt('bf')),
      confirmed_at = now(),
      email_confirmed_at = now(),
      updated_at = now()
  where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  -- Tạo profile nếu chưa có
  insert into public.profiles (id, full_name, gender, step_goal, calorie_goal, water_goal_ml, sleep_goal_minutes, bedtime, wake_time, cycle_length_days, period_length_days)
  values (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Trần Hoàng Long',
    'male',
    10000, 2000, 2000, 480, '23:00'::time, '06:30'::time, 28, 5
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    updated_at = now();
end $$;

-- 3. Tạo profiles cho các user thật đã đăng ký (nếu chưa có)
do $$
declare
  usr record;
begin
  for usr in select id, email, raw_user_meta_data from auth.users
             where confirmed_at is not null
             and not exists (select 1 from public.profiles p where p.id = auth.users.id)
  loop
    insert into public.profiles (id, full_name, gender)
    values (
      usr.id,
      coalesce(usr.raw_user_meta_data->>'full_name', split_part(usr.email, '@', 1)),
      'unspecified'
    );
  end loop;
end $$;

-- 4. Verify trigger exists
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Thông báo kết quả
do $$
begin
  raise notice 'Đã fix demo accounts và tạo profiles cho users';
  raise notice 'Demo Owner: demo.owner@healthy-check.app / demo_pass_1';
  raise notice 'Demo Receiver: demo.receiver@healthy-check.app / demo_pass_2';
end $$;
