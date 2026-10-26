-- =====================================================================
-- Healthy Check (G7) — Migration 0005: DỮ LIỆU MẪU (DEMO) - ĐÃ SỬA LỖI
-- =====================================================================
-- Chạy ở môi trường DEVELOPMENT / STAGING qua SQL Editor.
-- Sử dụng auth.sign_up() hoặc hàm chuẩn của Supabase auth để tránh lỗi confirmed_at.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TẠO TÀI KHOẢN QUA HÀM NỘI BỘ HOẶC INSERT AN TOÀN
-- ---------------------------------------------------------------------
do $$
declare
  v_owner_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_recv_id  uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
begin
  -- Tạo user 1 nếu chưa tồn tại
  if not exists (select 1 from auth.users where id = v_owner_id) then
    insert into auth.users (
      id, instance_id, email, encrypted_password, aud, role, raw_user_meta_data
    )
    values (
      v_owner_id, '00000000-0000-0000-0000-000000000000',
      'demo.owner@healthy-check.app',
      crypt('demo_pass_1', gen_salt('bf')),
      'authenticated', 'authenticated',
      '{"full_name": "Nguyễn Minh Anh", "gender": "female"}'::jsonb
    );
  end if;

  -- Tạo user 2 nếu chưa tồn tại
  if not exists (select 1 from auth.users where id = v_recv_id) then
    insert into auth.users (
      id, instance_id, email, encrypted_password, aud, role, raw_user_meta_data
    )
    values (
      v_recv_id, '00000000-0000-0000-0000-000000000000',
      'demo.receiver@healthy-check.app',
      crypt('demo_pass_2', gen_salt('bf')),
      'authenticated', 'authenticated',
      '{"full_name": "Trần Hoàng Long", "gender": "male"}'::jsonb
    );
  end if;
end
$$;

-- Cập nhật hồ sơ: mục tiêu cá nhân hóa
update public.profiles set
  date_of_birth = '1995-08-12',
  height_cm = 163.00,
  weight_kg = 52.00,
  step_goal = 10000,
  calorie_goal = 1800,
  sleep_goal_minutes = 480,
  bedtime = '22:00',
  wake_time = '07:30',
  cycle_enabled = true,
  cycle_length_days = 28,
  period_length_days = 5,
  share_steps = true,
  share_sleep = false,
  share_nutrition = true
where id in (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);

-- ---------------------------------------------------------------------
-- 2. NHẬT KÝ VẬN ĐỘNG — 3 ngày gần nhất của user_1
-- ---------------------------------------------------------------------
insert into public.step_records (user_id, recorded_on, steps, distance_km,
                                  calories_burned, active_minutes, double_support_pct,
                                  hourly_breakdown, source)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date - 2, 11857, 8.42, 620, 95, 22.5,
   '[{"h":6,"steps":40},{"h":7,"steps":380},{"h":8,"steps":650},{"h":9,"steps":920},
     {"h":10,"steps":1100},{"h":11,"steps":1300},{"h":12,"steps":850},
     {"h":13,"steps":720},{"h":14,"steps":680},{"h":15,"steps":1050},
     {"h":16,"steps":1200},{"h":17,"steps":980},{"h":18,"steps":650},
     {"h":19,"steps":380}]'::jsonb, 'manual'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date - 1, 8432, 6.10, 410, 68, 24.1,
   '[{"h":6,"steps":30},{"h":7,"steps":280},{"h":8,"steps":520},{"h":9,"steps":780},
     {"h":10,"steps":950},{"h":11,"steps":1100},{"h":12,"steps":720},
     {"h":13,"steps":600},{"h":14,"steps":580},{"h":15,"steps":820},
     {"h":16,"steps":900},{"h":17,"steps":750},{"h":18,"steps":500},
     {"h":19,"steps":300}]'::jsonb, 'manual'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date, 6432, 4.80, 320, 52, 21.8,
   '[{"h":6,"steps":20},{"h":7,"steps":180},{"h":8,"steps":420},{"h":9,"steps":680},
     {"h":10,"steps":800},{"h":11,"steps":920},{"h":12,"steps":600},
     {"h":13,"steps":520},{"h":14,"steps":480},{"h":15,"steps":650},
     {"h":16,"steps":750},{"h":17,"steps":580},{"h":18,"steps":400},
     {"h":19,"steps":200}]'::jsonb, 'manual')
on conflict (user_id, recorded_on) do nothing;

-- ---------------------------------------------------------------------
-- 3. NHẬT KÝ GIẤC NGỦ
-- ---------------------------------------------------------------------
insert into public.sleep_records (user_id, sleep_date, bedtime_at, wake_at,
                                    total_minutes, deep_minutes, light_minutes,
                                    rem_minutes, awake_minutes, awakenings,
                                    quality_score, source)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date - 1,
   timestamp '2024-10-24 22:00', timestamp '2024-10-25 07:30',
   450, 135, 210, 60, 45, 2, 82, 'manual')
on conflict (user_id, sleep_date) do nothing;

-- ---------------------------------------------------------------------
-- 4. TÍNH ĐIỂM HEALTH SCORE
-- ---------------------------------------------------------------------
select public.record_health_score('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date - 2);
select public.record_health_score('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date - 1);
select public.record_health_score('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date);

-- ---------------------------------------------------------------------
-- 5. DỰ BÁO CHU KỲ
-- ---------------------------------------------------------------------
select * from public.predict_next_periods('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 3);

-- ---------------------------------------------------------------------
-- 6. GHI NHẬN CHỈ SỐ — water + heart rate
-- ---------------------------------------------------------------------
select public.log_metric('water_intake', 1800, 'ml', now() - interval '2 hours');
select public.log_metric('heart_rate', 68, 'bpm', now() - interval '30 minutes');

-- ---------------------------------------------------------------------
-- 7. MẪU DINH DƯỠNG
-- ---------------------------------------------------------------------
insert into public.nutrition_logs (user_id, logged_on, meal, food_name, quantity,
                                     unit, calories, protein_g, carbs_g, fat_g)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date - 1, 'breakfast', 'Phở bò', 1, 'bát', 450, 22, 60, 12),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date - 1, 'lunch', 'Cơm gà', 1, 'bát', 580, 28, 75, 16),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date - 1, 'snack', 'Chuối', 1, 'quả', 90, 1, 23, 0.3),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date - 1, 'dinner', 'Cơm rang', 1, 'bát', 420, 14, 58, 12);

-- ---------------------------------------------------------------------
-- 8. CHIA SẺ DỮ LIỆU & BỎ PHIẾU
-- ---------------------------------------------------------------------
select public.create_share_link(
  'demo.receiver@healthy-check.app', 'Trần Hoàng Long', array['steps', 'nutrition'], 30
);

do $$
declare
  v_token uuid;
  v_content_id uuid;
begin
  select g.invite_token into v_token
  from public.sharing_grants g
  where g.owner_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    and g.recipient_email = 'demo.receiver@healthy-check.app'
  order by g.created_at desc limit 1;

  if v_token is not null then
    -- Giả lập đổi context sang user 2 để accept
    perform set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
    perform public.accept_share_link(v_token);
    perform set_config('request.jwt.claim.sub', '', true);
  end if;

  select id into v_content_id from public.health_content where slug = 'more-about-apples-benefits-nutrition-and-tips';
  if v_content_id is not null then
    perform set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
    perform public.vote_article(v_content_id, true);
    perform public.register_content_view(v_content_id);
    perform set_config('request.jwt.claim.sub', '', true);
  end if;
end
$$;
