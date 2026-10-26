-- =====================================================================
-- Healthy Check (G7) — Migration 0003: HÀM NGHIỆP VỤ & TRIGGER
-- =====================================================================
-- Hiện thực "Tầng Nghiệp vụ" (Business Logic Layer) của kiến trúc 4 tầng
-- ngay trong PostgreSQL, theo đúng các thuật toán đã giả định trong SDS:
--
--   * HealthScoreEngine ....... compute_health_score()   [SDS 3.4.2]
--   * DashboardController ..... get_dashboard_summary()  [UC-02]
--   * CyclePredictor .......... predict_next_periods()   [FR-08]
--   * Privacy & Sharing ....... create_share_link() / accept / revoke
--
-- Hai quy tắc an toàn bắt buộc trong file này:
--   1. Mọi hàm SECURITY DEFINER đều đặt search_path cứng (public, pg_temp)
--      để chống tấn công search_path hijacking.
--   2. Mọi hàm nhận tham số p_user đều đi qua assert_readable_user() TRƯỚC
--      khi đọc dữ liệu. Nếu không, chỉ cần đổi p_user là đọc được hồ sơ sức
--      khỏe của người khác — RLS sẽ bị vô hiệu hóa hoàn toàn vì hàm chạy
--      với quyền chủ thể định nghĩa (bypass RLS).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TRIGGER CHUNG: TỰ CẬP CỘT updated_at
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Duyệt mọi bảng có cột updated_at và gắn trigger.
-- Lưu ý: dùng c.oid::regclass (tự quote đúng dạng 'public"."profiles')
-- cho vị trí tên bảng, và quote_ident(nspname||relname) cho TÊN trigger —
-- không dùng %1$I cho regclass vì sẽ biến 'public.profiles' thành một
-- identifier duy nhất không tồn tại.
do $$
declare
  r record;
begin
  for r in
    select c.oid::regclass as tbl,
           quote_ident('trg_touch_' || c.relname) as trg
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and exists (
        select 1 from pg_attribute a
        where a.attrelid = c.oid and a.attname = 'updated_at' and a.attnum > 0
      )
  loop
    execute format(
      'drop trigger if exists %s on %s;
       create trigger %s before update on %s
       for each row execute function public.touch_updated_at();',
      r.trg, r.tbl, r.trg, r.tbl
    );
  end loop;
end
$$;

-- ---------------------------------------------------------------------
-- 2. TỰ KHỞI TẠO HỒ SƠ KHI ĐĂNG KÝ (auth.users -> profiles)
-- ---------------------------------------------------------------------
-- Supabase gợi ý mẫu trigger này; ta mở rộng lấy tên/ảnh đại diện từ
-- user metadata của luồng đăng nhập OAuth (Google/Apple/Facebook).
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
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 3. CẢNH VỆ TRUY CẬP — bắt buộc trước mọi hàm có tham số p_user
-- ---------------------------------------------------------------------
create or replace function public.assert_readable_user(p_target uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'Yêu cầu đăng nhập' using errcode = '42501';
  end if;

  if p_target is null or p_target = v_me then
    return v_me;
  end if;

  if public.is_shared_with_me(p_target) then
    return p_target;   -- được chia sẻ: cho phép đọc (sẽ bị cắt cột ở bước sau)
  end if;

  raise exception 'Không có quyền truy cập dữ liệu của người dùng khác'
    using errcode = '42501';
end;
$$;

comment on function public.assert_readable_user is
  'Chốt chặn IDOR cho các RPC nhận uuid đối phương. Bypass RLS của hàm DEFINER chỉ an toàn khi đi qua hàm này.';

-- ---------------------------------------------------------------------
-- 4. VIEW TIỆN ÍCH
-- ---------------------------------------------------------------------

-- Nutrition Tracker cần "960 kcal / 1300 kcal" + Fat/Protein/Carbs gam.
-- View gộp sẵn theo (user, ngày) để client query 1 lần.
create or replace view public.v_nutrition_daily as
select
  n.user_id,
  n.logged_on,
  coalesce(sum(n.calories),  0)::numeric(10, 2) as calories,
  coalesce(sum(n.protein_g), 0)::numeric(10, 2) as protein_g,
  coalesce(sum(n.carbs_g),   0)::numeric(10, 2) as carbs_g,
  coalesce(sum(n.fat_g),     0)::numeric(10, 2) as fat_g,
  count(*)::integer                             as meal_count
from public.nutrition_logs n
group by n.user_id, n.logged_on;

comment on view public.v_nutrition_daily is
  'Calo và đa lượng đã tổng hợp theo từng ngày cho từng người dùng.';

-- View là SECURITY INVOKER: RLS của nutrition_logs vẫn áp cho người gọi.
grant select on public.v_nutrition_daily to authenticated;

-- Chỉ số mới nhất mỗi loại — phục vụ màn hình All Health Data.
create or replace view public.v_latest_metrics as
select distinct on (h.user_id, h.metric_kind)
  h.user_id,
  h.metric_kind,
  h.value,
  h.unit,
  h.recorded_at
from public.health_metrics h
order by h.user_id, h.metric_kind, h.recorded_at desc;

grant select on public.v_latest_metrics to authenticated;

-- ---------------------------------------------------------------------
-- 5. THUẬT TOÁN HEALTH SCORE  (HealthScoreEngine — SDS 3.4.2)
-- ---------------------------------------------------------------------
-- Trọng số đúng như giả định thiết kế trong tài liệu:
--   bước chân 30% | giấc ngủ 30% | dinh dưỡng 25% | vận động phụ 15%
-- Mỗi thành phần chuẩn hóa về [0..100] rồi nhân trọng số.
create or replace function public.compute_health_score(
  p_user uuid,
  p_day  date default current_date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile       record;
  v_steps         integer := 0;
  v_active        integer := 0;
  v_sleep_min     integer := 0;
  v_sleep_quality numeric := 0;
  v_calories      numeric := 0;
  s_steps         numeric := 0;
  s_sleep         numeric := 0;
  s_nutrition     numeric := 0;
  s_activity      numeric := 0;
  v_total         numeric;
  v_label         text;
  v_has_data      boolean := false;
begin
  select * into v_profile from public.profiles where id = p_user;
  if not found then
    return jsonb_build_object('score', 0, 'label', 'unknown', 'error', 'profile_not_found');
  end if;

  -- (a) BƯỚC CHÂN — đạt 100% mục tiêu là trọn điểm
  select coalesce(s.steps, 0), coalesce(s.active_minutes, 0)
    into v_steps, v_active
  from public.step_records s
  where s.user_id = p_user and s.recorded_on = p_day;

  if v_steps is null then v_steps := 0; end if;
  if v_active is null then v_active := 0; end if;
  if v_steps > 0 or v_active > 0 then v_has_data := true; end if;

  s_steps := least(100.0, v_steps::numeric / nullif(v_profile.step_goal, 0) * 100);

  -- (b) GIẤC NGỦ — % mục tiêu, phạt khi ngủ quá dài, trung bình với chất lượng
  select coalesce(sl.total_minutes, 0), coalesce(sl.quality_score, 0)
    into v_sleep_min, v_sleep_quality
  from public.sleep_records sl
  where sl.user_id = p_user and sl.sleep_date = p_day;

  if v_sleep_min is null then v_sleep_min := 0; end if;
  if v_sleep_quality is null then v_sleep_quality := 0; end if;
  if v_sleep_min > 0 then v_has_data := true; end if;

  if v_sleep_min > 0 then
    s_sleep := least(100.0,
      v_sleep_min::numeric / nullif(v_profile.sleep_goal_minutes, 0) * 100
    );
    -- Ngủ quá mục tiêu > 90 phút bị trừ tối đa 10 điểm
    if v_sleep_min > v_profile.sleep_goal_minutes + 90 then
      s_sleep := greatest(0, s_sleep - 10);
    end if;
    -- Điểm chất lượng pha ngủ (nếu có) trung bình hóa 50/50
    if v_sleep_quality > 0 then
      s_sleep := (s_sleep + v_sleep_quality) / 2.0;
    end if;
  else
    s_sleep := 0;
  end if;

  -- (c) DINH DƯỠNG — phạt cả ăn thiếu lẫn ăn vượt định mức
  select coalesce(sum(n.calories), 0) into v_calories
  from public.nutrition_logs n
  where n.user_id = p_user and n.logged_on = p_day;

  if v_calories is null then v_calories := 0; end if;
  if v_calories > 0 then v_has_data := true; end if;

  if v_calories > 0 then
    s_nutrition := case
      when v_calories <= v_profile.calorie_goal then
        100.0 * (v_calories / nullif(v_profile.calorie_goal, 0))
      else
        -- vượt mục tiêu: trừ 0.5 điểm cho mỗi 1% vượt, sàn 40
        greatest(40, 100 - (v_calories / nullif(v_profile.calorie_goal, 0) - 1) * 100 * 0.5)
    end;
  else
    s_nutrition := 0;
  end if;

  -- (d) VẬN ĐỘNG PHỤ — 30 phút hoạt động tích cực là trọn điểm
  s_activity := least(100.0, v_active::numeric / 30.0 * 100);

  if not v_has_data then
    return jsonb_build_object(
      'score', 0, 'label', 'no_data', 'date', p_day,
      'components', '{}'::jsonb
    );
  end if;

  v_total := round(
    coalesce(s_steps, 0)     * 0.30 +
    coalesce(s_sleep, 0)     * 0.30 +
    coalesce(s_nutrition, 0) * 0.25 +
    coalesce(s_activity, 0)  * 0.15
  , 0);

  v_label := case
    when v_total >= 85 then 'excellent'
    when v_total >= 70 then 'good'
    when v_total >= 50 then 'fair'
    else 'poor'
  end;

  return jsonb_build_object(
    'score', v_total,
    'label', v_label,
    'date',  p_day,
    'components', jsonb_build_object(
      'steps',     round(coalesce(s_steps, 0), 1),
      'sleep',     round(coalesce(s_sleep, 0), 1),
      'nutrition', round(coalesce(s_nutrition, 0), 1),
      'activity',  round(coalesce(s_activity, 0), 1),
      'weights',   jsonb_build_object(
        'steps', 0.30, 'sleep', 0.30, 'nutrition', 0.25, 'activity', 0.15
      )
    )
  );
end;
$$;

comment on function public.compute_health_score is
  'HealthScoreEngine: điểm tổng hợp 0-100 theo trọng số 30/30/25/15 (bước/ngủ/dinh dưỡng/vận động).';

-- ---------------------------------------------------------------------
-- 6. LƯU LỊCH SỬ ĐIỂM (gọi từ client hoặc pg_cron mỗi cuối ngày)
-- ---------------------------------------------------------------------
create or replace function public.record_health_score(
  p_user uuid default auth.uid(),
  p_day  date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid;
  v      jsonb;
begin
  v_owner := public.assert_readable_user(p_user);
  v := public.compute_health_score(v_owner, p_day);

  -- Chỉ chủ sở hữu mới được ghi lịch sử điểm của mình
  if v_owner <> auth.uid() then
    return v;   -- người được chia sẻ: tính để xem, không lưu
  end if;

  insert into public.health_score_history as h
    (user_id, score_date, score, label, components)
  values
    (v_owner, p_day,
     coalesce((v ->> 'score')::numeric, 0),
     coalesce(v ->> 'label', 'fair'),
     coalesce(v -> 'components', '{}'::jsonb))
  on conflict (user_id, score_date) do update
    set score = excluded.score,
        label = excluded.label,
        components = excluded.components,
        computed_at = now();

  return v;
end;
$$;

-- ---------------------------------------------------------------------
-- 7. RPC: GET DASHBOARD SUMMARY  (UC-02 — màn hình Overview)
-- ---------------------------------------------------------------------
-- Trả về MỘT lần gọi duy nhất toàn bộ dữ liệu Overview cần: điểm, 4 thẻ
-- highlight, báo cáo tuần. Giảm 6 round-trip mạng còn 1 (NFR hiệu năng).
create or replace function public.get_dashboard_summary(
  p_user uuid default auth.uid(),
  p_day  date default current_date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner        uuid;
  v_profile      record;
  v_score        jsonb;
  v_steps        record;
  v_sleep        record;
  v_nutro        record;
  v_cycle        record;
  v_week         record;
  v_week_sleep   integer := 0;
  v_water        numeric := 0;
begin
  v_owner := public.assert_readable_user(p_user);

  select * into v_profile from public.profiles where id = v_owner;
  if not found then
    raise exception 'Không tìm thấy hồ sơ người dùng %', v_owner;
  end if;

  v_score := public.compute_health_score(v_owner, p_day);

  select s.steps, s.distance_km, s.calories_burned, s.active_minutes, s.updated_at
    into v_steps
  from public.step_records s
  where s.user_id = v_owner and s.recorded_on = p_day;

  select sl.total_minutes, sl.deep_minutes, sl.quality_score, sl.updated_at
    into v_sleep
  from public.sleep_records sl
  where sl.user_id = v_owner and sl.sleep_date = p_day;

  select coalesce(sum(n.calories), 0)  as calories,
         coalesce(sum(n.protein_g), 0) as protein_g,
         coalesce(sum(n.carbs_g), 0)   as carbs_g,
         coalesce(sum(n.fat_g), 0)     as fat_g
    into v_nutro
  from public.nutrition_logs n
  where n.user_id = v_owner and n.logged_on = p_day;

  -- Kỳ kinh gần nhất + số ngày còn lại tới kỳ kế tiếp
  select c.period_start,
         c.period_end,
         (c.period_start + make_interval(days => v_profile.cycle_length_days))::date - p_day
           as days_to_next
    into v_cycle
  from public.cycle_records c
  where c.user_id = v_owner
    and c.is_predicted = false
    and c.period_start = (
      select max(c2.period_start)
      from public.cycle_records c2
      where c2.user_id = v_owner and c2.is_predicted = false
    )
  limit 1;

  -- "This week report": tổng 7 ngày gần nhất.
  -- TÍNH RIÊNG TỪNG NGUỒN rồi mới ghép: join thẳng step_records x
  -- sleep_records sẽ sinh tích Đề Các và làm sai mọi con số SUM.
  select coalesce(sum(s.steps), 0)           as week_steps,
         coalesce(sum(s.active_minutes), 0)  as week_active_minutes,
         coalesce(sum(s.calories_burned), 0) as week_calories_burned
    into v_week
  from public.step_records s
  where s.user_id = v_owner and s.recorded_on between p_day - 6 and p_day;

  select coalesce(sum(sl.total_minutes), 0)::integer
    into v_week_sleep
  from public.sleep_records sl
  where sl.user_id = v_owner and sl.sleep_date between p_day - 6 and p_day;

  select coalesce(sum(h.value), 0) into v_water
  from public.health_metrics h
  where h.user_id = v_owner
    and h.metric_kind = 'water_intake'
    and h.recorded_at::date = p_day;

  return jsonb_build_object(
    'date', p_day,
    'owner_id', v_owner,
    'is_viewing_shared', (v_owner <> auth.uid()),
    'health_score', v_score,
    'goals', jsonb_build_object(
      'step_goal', v_profile.step_goal,
      'calorie_goal', v_profile.calorie_goal,
      'sleep_goal_minutes', v_profile.sleep_goal_minutes,
      'water_goal_ml', v_profile.water_goal_ml
    ),
    'steps', jsonb_build_object(
      'count', coalesce(v_steps.steps, 0),
      'distance_km', coalesce(v_steps.distance_km, 0),
      'calories_burned', coalesce(v_steps.calories_burned, 0),
      'active_minutes', coalesce(v_steps.active_minutes, 0),
      'updated_at', v_steps.updated_at
    ),
    'sleep', jsonb_build_object(
      'total_minutes', coalesce(v_sleep.total_minutes, 0),
      'deep_minutes', coalesce(v_sleep.deep_minutes, 0),
      'quality_score', coalesce(v_sleep.quality_score, 0),
      'updated_at', v_sleep.updated_at
    ),
    'nutrition', jsonb_build_object(
      'calories', coalesce(v_nutro.calories, 0),
      'protein_g', coalesce(v_nutro.protein_g, 0),
      'carbs_g', coalesce(v_nutro.carbs_g, 0),
      'fat_g', coalesce(v_nutro.fat_g, 0)
    ),
    'cycle', case when v_cycle.period_start is null then null else jsonb_build_object(
      'last_period_start', v_cycle.period_start,
      'days_to_next', coalesce(v_cycle.days_to_next, 0),
      'cycle_length', v_profile.cycle_length_days
    ) end,
    'week_report', jsonb_build_object(
      'steps', coalesce(v_week.week_steps, 0),
      'active_minutes', coalesce(v_week.week_active_minutes, 0),
      'calories_burned', coalesce(v_week.week_calories_burned, 0),
      'sleep_minutes', v_week_sleep
    ),
    'water', coalesce(v_water, 0),
    'schedule', jsonb_build_object(
      'bedtime', to_char(v_profile.bedtime, 'HH24:MI'),
      'wake_time', to_char(v_profile.wake_time, 'HH24:MI')
    )
  );
end;
$$;

comment on function public.get_dashboard_summary is
  'Gom toàn bộ dữ liệu màn hình Overview trong một lần gọi (tối ưu round-trip).';

-- ---------------------------------------------------------------------
-- 8. RPC: SERIES BIỂU ĐỒ (Today / Weekly / Monthly)
-- ---------------------------------------------------------------------
-- Dùng cho bộ chuyển Today-Weekly-Monthly trên Step / Sleep / Nutrition.
-- Mỗi nhánh join được "khóa" bởi điều kiện p_kind nên không sinh tích Đề Các.
create or replace function public.get_metric_series(
  p_user  uuid default auth.uid(),
  p_kind  text default 'steps',      -- steps | sleep | calories | water
  p_range text default 'weekly',     -- today | weekly | monthly
  p_end   date default current_date
)
returns table (bucket date, value numeric)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid;
  v_days  integer;
begin
  v_owner := public.assert_readable_user(p_user);

  if p_kind not in ('steps', 'sleep', 'calories', 'water') then
    raise exception 'Loại chuỗi dữ liệu không hợp lệ: %', p_kind;
  end if;

  v_days := case p_range
    when 'today'   then 1
    when 'monthly' then 30
    else 7
  end;

  return query
  with days as (
    select generate_series(
      p_end - make_interval(days => v_days - 1), p_end, interval '1 day'
    )::date as bucket
  )
  select d.bucket,
    case p_kind
      when 'steps'    then coalesce(sum(s.steps), 0)::numeric
      when 'sleep'    then coalesce(sum(sl.total_minutes), 0)::numeric
      when 'calories' then coalesce(sum(n.calories), 0)::numeric
      when 'water'    then coalesce(sum(h.value), 0)::numeric
    end
  from days d
  left join public.step_records   s
         on p_kind = 'steps'    and s.user_id = v_owner and s.recorded_on = d.bucket
  left join public.sleep_records  sl
         on p_kind = 'sleep'    and sl.user_id = v_owner and sl.sleep_date = d.bucket
  left join public.nutrition_logs n
         on p_kind = 'calories' and n.user_id = v_owner and n.logged_on = d.bucket
  left join public.health_metrics h
         on p_kind = 'water'    and h.user_id = v_owner
                     and h.metric_kind = 'water_intake' and h.recorded_at::date = d.bucket
  group by d.bucket
  order by d.bucket;
end;
$$;

-- ---------------------------------------------------------------------
-- 9. THUẬT TOÁN DỰ BÁO CHU KỲ  (CyclePredictor — FR-08)
-- ---------------------------------------------------------------------
-- Trung bình động độ dài chu kỳ từ lịch sử thực tế (Ogino-Knaus có cập nhật
-- động), kẹp trong ngưỡng sinh lý 21-45 ngày. Sinh trước N kỳ kế tiếp dưới
-- dạng bản ghi is_predicted = true. Hàm Idempotent: gọi lại sẽ xóa và sinh mới.
create or replace function public.predict_next_periods(
  p_user uuid default auth.uid(),
  p_horizon integer default 3
)
returns table (predicted_start date, predicted_end date, cycle_length integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner    uuid;
  v_profile  record;
  v_last     date;
  v_avg_cycle  integer;
  v_avg_period integer;
  v_start      date;
  v_end        date;
  i            integer;
begin
  v_owner := public.assert_readable_user(p_user);

  if p_horizon < 1 or p_horizon > 12 then
    raise exception 'p_horizon phải trong khoảng 1..12';
  end if;

  select * into v_profile from public.profiles where id = v_owner;
  if not found then
    raise exception 'Không tìm thấy hồ sơ người dùng';
  end if;

  select max(c.period_start) into v_last
  from public.cycle_records c
  where c.user_id = v_owner and c.is_predicted = false;

  if v_last is null then
    return;   -- chưa có dữ liệu thực tế => không dự báo
  end if;

  -- Độ dài chu kỳ trung bình = trung bình khoảng cách giữa các kỳ liên tiếp
  select coalesce(avg(x.gap)::integer, v_profile.cycle_length_days)
    into v_avg_cycle
  from (
    select c.period_start
         - lag(c.period_start) over (order by c.period_start) as gap
    from public.cycle_records c
    where c.user_id = v_owner and c.is_predicted = false
  ) x
  where x.gap is not null;

  v_avg_cycle  := greatest(21, least(45, coalesce(v_avg_cycle, v_profile.cycle_length_days)));
  v_avg_period := greatest(2, least(10, coalesce(v_profile.period_length_days, 5)));

  -- Xóa dự báo cũ để tránh dồn bản ghi qua nhiều lần gọi
  delete from public.cycle_records
  where user_id = v_owner and is_predicted = true;

  v_start := v_last;
  for i in 1..p_horizon loop
    v_start := (v_start + make_interval(days => v_avg_cycle))::date;
    v_end   := (v_start + make_interval(days => v_avg_period - 1))::date;

    insert into public.cycle_records
      (user_id, period_start, period_end, cycle_length, is_predicted)
    values (v_owner, v_start, v_end, v_avg_cycle, true);

    predicted_start := v_start;
    predicted_end   := v_end;
    cycle_length    := v_avg_cycle;
    return next;
  end loop;
end;
$$;

comment on function public.predict_next_periods is
  'Dự báo N kỳ kinh kế tiếp bằng trung bình động lịch sử (Ogino-Knaus cập nhật động).';

-- ---------------------------------------------------------------------
-- 10. CHIA SẺ DỮ LIỆU: tạo lời mời / chấp nhận / thu hồi / liệt kê
-- ---------------------------------------------------------------------

-- 10.1 Chủ sở hữu tạo lời mời chia sẻ. Trả về invite_token (mã liên kết).
create or replace function public.create_share_link(
  p_recipient_email text,
  p_recipient_name  text default null,
  p_scopes          text[] default array['steps'],
  p_validity_days   integer default 30
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner   uuid := auth.uid();
  v_id      uuid;
  v_token   uuid;
  v_valid   integer;
begin
  if v_owner is null then
    raise exception 'Yêu cầu đăng nhập' using errcode = '42501';
  end if;

  if p_recipient_email is null
     or p_recipient_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    raise exception 'Địa chỉ email người nhận không hợp lệ';
  end if;

  if p_scopes is null or array_length(p_scopes, 1) is null then
    raise exception 'Phải chọn ít nhất một nhóm dữ liệu để chia sẻ';
  end if;

  -- 'cycle' bị loại trừ có chủ đích: dữ liệu nhạy cảm nhất không chia sẻ qua link
  select array_agg(distinct s) into v_valid
  from unnest(p_scopes) s
  where s in ('steps', 'sleep', 'nutrition', 'heart');

  if v_valid is null then
    raise exception 'Phạm vi chia sẻ không hợp lệ';
  end if;

  if p_validity_days is not null and p_validity_days not between 1 and 3650 then
    raise exception 'Thời hạn chia sẻ phải trong khoảng 1..3650 ngày';
  end if;

  -- Không tự mời chính mình
  if exists (select 1 from auth.users u
             where u.id = v_owner and lower(u.email) = lower(p_recipient_email)) then
    raise exception 'Không thể chia sẻ dữ liệu với chính mình';
  end if;

  -- Người nhận đã có tài khoản thì gắn sẵn recipient_id
  select u.id into v_id
  from auth.users u
  where lower(u.email) = lower(p_recipient_email)
  limit 1;

  insert into public.sharing_grants as g
    (owner_id, recipient_email, recipient_name, recipient_id, scopes,
     validity_days, expires_at, status)
  values
    (v_owner, p_recipient_email, p_recipient_name, v_id,
     v_valid, p_validity_days,
     case when p_validity_days is null then null
          else now() + make_interval(days => p_validity_days) end,
     'pending')
  on conflict (owner_id, recipient_email) do update
    set scopes          = excluded.scopes,
        recipient_id    = coalesce(excluded.recipient_id, g.recipient_id),
        validity_days   = excluded.validity_days,
        expires_at      = excluded.expires_at,
        status          = 'pending',
        revoked_at      = null,
        accepted_at     = null
  returning g.invite_token into v_token;

  return v_token;
end;
$$;

-- 10.2 Người nhận chấp nhận lời mời bằng mã liên kết.
create or replace function public.accept_share_link(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_grant record;
begin
  if auth.uid() is null then
    raise exception 'Yêu cầu đăng nhập' using errcode = '42501';
  end if;

  -- Không cho tự chấp nhận lời mời do chính mình tạo
  if exists (select 1 from public.sharing_grants g
             where g.invite_token = p_token and g.owner_id = auth.uid()) then
    raise exception 'Không thể tự chấp nhận lời mời của chính mình';
  end if;

  select * into v_grant
  from public.sharing_grants g
  where g.invite_token = p_token
    and g.status in ('pending', 'expired')
  for update;

  if not found then
    return false;
  end if;

  if v_grant.expires_at is not null and v_grant.expires_at < now() then
    update public.sharing_grants set status = 'expired' where id = v_grant.id;
    return false;
  end if;

  update public.sharing_grants
     set status = 'active',
         recipient_id = auth.uid(),
         accepted_at = now()
   where id = v_grant.id;

  return true;
end;
$$;

-- 10.3 Thu hồi quyền — chủ sở hữu làm, có hiệu lực tức thì ("Stop anytime").
create or replace function public.revoke_share_link(p_grant_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_updated integer;
begin
  if auth.uid() is null then
    raise exception 'Yêu cầu đăng nhập' using errcode = '42501';
  end if;

  update public.sharing_grants
     set status = 'revoked', revoked_at = now()
   where id = p_grant_id and owner_id = auth.uid();

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

-- 10.4 Danh sách lời mời của chủ sở hữu.
create or replace function public.list_my_shares()
returns table (
  id uuid, recipient_email text, recipient_name text, scopes text[],
  status public.grant_status, expires_at timestamptz, invite_token uuid,
  created_at timestamptz, accepted_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select g.id, g.recipient_email, g.recipient_name, g.scopes,
         g.status, g.expires_at, g.invite_token, g.created_at, g.accepted_at
  from public.sharing_grants g
  where g.owner_id = auth.uid()
  order by g.created_at desc;
$$;

-- 10.5 Người nhận xem dashboard được chia sẻ — cắt bỏ nhóm dữ liệu chưa cấp
--      quyền. RLS Postgres chỉ lọc được ở cấp DÒNG, không cắt CỘT, nên việc
--      cắt theo scope phải làm ở đây.
create or replace function public.get_shared_dashboard(p_owner uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_scopes  text[];
  v_summary jsonb;
begin
  if auth.uid() is null then
    raise exception 'Yêu cầu đăng nhập' using errcode = '42501';
  end if;

  select coalesce(array_agg(distinct s), '{}'::text[]) into v_scopes
  from public.sharing_grants g, unnest(g.scopes) s
  where g.owner_id = p_owner
    and g.recipient_id = auth.uid()
    and g.status = 'active'
    and (g.expires_at is null or g.expires_at > now());

  if v_scopes = '{}'::text[] then
    raise exception 'Bạn không được chia sẻ dữ liệu của người dùng này';
  end if;

  v_summary := public.get_dashboard_summary(p_owner, current_date);

  if not ('steps' = any (v_scopes)) then
    v_summary := v_summary - 'steps' - 'week_report' - 'water';
  end if;
  if not ('sleep' = any (v_scopes)) then
    v_summary := v_summary - 'sleep';
  end if;
  if not ('nutrition' = any (v_scopes)) then
    v_summary := v_summary - 'nutrition';
  end if;

  -- Chu kỳ kinh nguyệt không bao giờ được chia sẻ qua liên kết
  v_summary := v_summary - 'cycle';

  return jsonb_set(v_summary, '{viewer_scopes}', to_jsonb(v_scopes), true);
end;
$$;

-- ---------------------------------------------------------------------
-- 11. BỎ PHIẾU & LƯỢT XEM BÀI VIẾT
-- ---------------------------------------------------------------------
create or replace function public.vote_article(p_content uuid, p_vote boolean default true)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_total integer;
begin
  if auth.uid() is null then
    raise exception 'Yêu cầu đăng nhập' using errcode = '42501';
  end if;

  if not exists (select 1 from public.health_content c
                 where c.id = p_content and c.is_published) then
    raise exception 'Bài viết không tồn tại hoặc chưa xuất bản';
  end if;

  insert into public.content_votes (content_id, user_id, voted)
  values (p_content, auth.uid(), p_vote)
  on conflict (content_id, user_id) do update
    set voted = excluded.voted;

  select count(*) filter (where voted) into v_total
  from public.content_votes
  where content_id = p_content;

  update public.health_content set upvotes = v_total where id = p_content;

  return v_total;
end;
$$;

create or replace function public.register_content_view(p_content uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.health_content
     set views = views + 1
   where id = p_content and is_published = true;
$$;

-- ---------------------------------------------------------------------
-- 12. GHI NHẬN CHỈ SỐ NHANH (nước uống, nhịp tim) từ All Health Data
-- ---------------------------------------------------------------------
create or replace function public.log_metric(
  p_kind  public.metric_kind,
  p_value numeric,
  p_unit  text,
  p_at    timestamptz default now()
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id bigint;
begin
  if auth.uid() is null then
    raise exception 'Yêu cầu đăng nhập' using errcode = '42501';
  end if;
  if p_value is null or p_value < 0 then
    raise exception 'Giá trị chỉ số không hợp lệ';
  end if;
  if p_unit is null or char_length(p_unit) > 20 then
    raise exception 'Đơn vị tính không hợp lệ';
  end if;

  insert into public.health_metrics (user_id, metric_kind, value, unit, recorded_at, source)
  values (auth.uid(), p_kind, p_value, p_unit, p_at, 'manual')
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 13. TỰ ĐỘNG TÍNH LẠI BMI khi đổi chiều cao / cân nặng trên hồ sơ
-- ---------------------------------------------------------------------
create or replace function public.sync_bmi()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_bmi numeric;
begin
  if new.height_cm is not null and new.weight_kg is not null then
    v_bmi := round(new.weight_kg / power(new.height_cm / 100.0, 2), 2);
    insert into public.health_metrics (user_id, metric_kind, value, unit, source)
    values (new.id, 'body_mass_index', v_bmi, 'BMI', 'manual');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_bmi on public.profiles;
create trigger trg_sync_bmi
  after update of height_cm, weight_kg on public.profiles
  for each row
  when (old.height_cm is distinct from new.height_cm
        or old.weight_kg is distinct from new.weight_kg)
  execute function public.sync_bmi();

-- ---------------------------------------------------------------------
-- 14. DỌN DẸT: đánh dấu hết hạn định kỳ các lời mời quá hạn
-- ---------------------------------------------------------------------
create or replace function public.expire_stale_grants()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  update public.sharing_grants
     set status = 'expired'
   where status = 'active'
     and expires_at is not null
     and expires_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------
-- 15. CẤP QUYỀN THỰC THI RPC (PostgREST /exposed functions)
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public;

grant execute on function public.assert_readable_user(uuid)                        to authenticated;
grant execute on function public.compute_health_score(uuid, date)                  to authenticated;
grant execute on function public.record_health_score(uuid, date)                   to authenticated;
grant execute on function public.get_dashboard_summary(uuid, date)                 to authenticated;
grant execute on function public.get_metric_series(uuid, text, text, date)         to authenticated;
grant execute on function public.predict_next_periods(uuid, integer)               to authenticated;
grant execute on function public.create_share_link(text, text, text[], integer)    to authenticated;
grant execute on function public.accept_share_link(uuid)                           to authenticated;
grant execute on function public.revoke_share_link(uuid)                           to authenticated;
grant execute on function public.list_my_shares()                                  to authenticated;
grant execute on function public.get_shared_dashboard(uuid)                        to authenticated;
grant execute on function public.vote_article(uuid, boolean)                       to authenticated;
grant execute on function public.register_content_view(uuid)                       to anon, authenticated;
grant execute on function public.log_metric(public.metric_kind, numeric, text, timestamptz) to authenticated;
grant execute on function public.expire_stale_grants()                             to authenticated;

-- Hàm nội bộ: không cho client gọi trực tiếp
revoke execute on function public.touch_updated_at()         from public;
revoke execute on function public.handle_new_user()          from public;
revoke execute on function public.sync_bmi()                 from public;
revoke execute on function public.is_content_admin()         from public, anon;
grant execute on function public.is_content_admin()          to authenticated;
