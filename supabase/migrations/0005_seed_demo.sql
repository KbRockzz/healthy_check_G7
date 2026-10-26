-- =====================================================================
-- Healthy Check (G7) — Migration 0005: DỮ LIỆU MẪU (DEMO)
-- =====================================================================

do $$
declare
  v_owner_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_recv_id  uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
begin
  if not exists (select 1 from auth.users where id = v_owner_id) then
    insert into auth.users (id, instance_id, email, encrypted_password, aud, role, raw_user_meta_data)
    values (v_owner_id, '00000000-0000-0000-0000-000000000000', 'demo.owner@healthy-check.app', crypt('demo_pass_1', gen_salt('bf')), 'authenticated', 'authenticated', '{"full_name": "Nguyễn Minh Anh"}'::jsonb);
  end if;

  if not exists (select 1 from auth.users where id = v_recv_id) then
    insert into auth.users (id, instance_id, email, encrypted_password, aud, role, raw_user_meta_data)
    values (v_recv_id, '00000000-0000-0000-0000-000000000000', 'demo.receiver@healthy-check.app', crypt('demo_pass_2', gen_salt('bf')), 'authenticated', 'authenticated', '{"full_name": "Trần Hoàng Long"}'::jsonb);
  end if;
end $$;

update public.profiles set
  step_goal = 10000, calorie_goal = 1800, sleep_goal_minutes = 480
where id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

-- Giả lập phiên làm việc của owner
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);

insert into public.step_records (user_id, recorded_on, steps, distance_km, calories_burned, active_minutes)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date, 6432, 4.80, 320, 52)
on conflict (user_id, recorded_on) do nothing;

select public.record_health_score('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date);
select public.predict_next_periods('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 3);

-- Gọi hàm chia sẻ với ép kiểu tường minh text[]
select public.create_share_link(
  'demo.receiver@healthy-check.app',
  'Trần Hoàng Long',
  ARRAY['steps']::text[],
  30
);

select set_config('request.jwt.claim.sub', '', true);
