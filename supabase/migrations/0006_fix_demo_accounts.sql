-- =====================================================================
-- FIX: Đảm bảo demo users có profile record
-- Chạy migration này sau khi đã chạy 0001-0004
-- =====================================================================

-- Đảm bảo extension pgcrypto tồn tại
create extension if not exists "pgcrypto";

-- Tạo lại trigger function nếu cần
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, gender)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      nullif(split_part(coalesce(new.email, ''), '@', 1), '')
    ),
    new.raw_user_meta_data ->> 'avatar_url',
    case
      when new.raw_user_meta_data ->> 'gender' in ('male', 'female', 'other')
        then (new.raw_user_meta_data ->> 'gender')::public.gender_type
      else 'unspecified'::public.gender_type
    end
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    updated_at = now();
  return new;
end;
$$;

-- Đảm bảo trigger tồn tại
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Tạo demo users nếu chưa có
do $$
declare
  v_owner_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_recv_id  uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
begin
  -- Tạo demo owner
  if not exists (select 1 from auth.users where id = v_owner_id) then
    insert into auth.users (id, instance_id, email, encrypted_password, aud, role, raw_user_meta_data, created_at, updated_at)
    values (
      v_owner_id,
      '00000000-0000-0000-0000-000000000000',
      'demo.owner@healthy-check.app',
      crypt('demo_pass_1', gen_salt('bf')),
      'authenticated',
      'authenticated',
      '{"full_name": "Nguyễn Minh Anh"}'::jsonb,
      now(),
      now()
    );
  end if;

  -- Tạo demo receiver
  if not exists (select 1 from auth.users where id = v_recv_id) then
    insert into auth.users (id, instance_id, email, encrypted_password, aud, role, raw_user_meta_data, created_at, updated_at)
    values (
      v_recv_id,
      '00000000-0000-0000-0000-000000000000',
      'demo.receiver@healthy-check.app',
      crypt('demo_pass_2', gen_salt('bf')),
      'authenticated',
      'authenticated',
      '{"full_name": "Trần Hoàng Long"}'::jsonb,
      now(),
      now()
    );
  end if;

  -- Đảm bảo profiles tồn tại
  insert into public.profiles (id, full_name, gender, step_goal, calorie_goal, water_goal_ml, sleep_goal_minutes, bedtime, wake_time, cycle_length_days, period_length_days)
  values
    (v_owner_id, 'Nguyễn Minh Anh', 'female', 10000, 1800, 2000, 480, '22:00'::time, '07:00'::time, 28, 5)
  on conflict (id) do nothing;

  insert into public.profiles (id, full_name, gender, step_goal, calorie_goal, water_goal_ml, sleep_goal_minutes, bedtime, wake_time, cycle_length_days, period_length_days)
  values
    (v_recv_id, 'Trần Hoàng Long', 'male', 10000, 2000, 2000, 480, '23:00'::time, '06:30'::time, 28, 5)
  on conflict (id) do nothing;

  -- Seed dữ liệu demo cho owner
  insert into public.step_records (user_id, recorded_on, steps, distance_km, calories_burned, active_minutes, source)
  values
    (v_owner_id, current_date, 6432, 4.80, 320, 52, 'seed')
  on conflict (user_id, recorded_on) do update set
    steps = excluded.steps,
    updated_at = now();

  insert into public.sleep_records (user_id, sleep_date, total_minutes, deep_minutes, light_minutes, rem_minutes, source)
  values
    (v_owner_id, current_date, 450, 90, 225, 112, 'seed')
  on conflict (user_id, sleep_date) do update set
    total_minutes = excluded.total_minutes,
    updated_at = now();

  insert into public.nutrition_logs (user_id, logged_on, meal, food_name, calories, protein_g, carbs_g, fat_g, source)
  values
    (v_owner_id, current_date, 'breakfast', 'Phở bò', 500, 25, 60, 15, 'seed'),
    (v_owner_id, current_date, 'lunch', 'Cơm gà', 650, 30, 80, 20, 'seed')
  on conflict do nothing;

  insert into public.cycle_records (user_id, period_start, cycle_length, is_predicted, source)
  values
    (v_owner_id, current_date - interval '14 days', 28, false, 'seed')
  on conflict do nothing;

end $$;
