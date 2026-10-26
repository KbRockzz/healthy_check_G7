-- =====================================================================
-- Healthy Check (G7) — Migration 0001: KHỞI TẠO LƯỢC ĐỒ QUAN HỆ (ERD)
-- =====================================================================
-- Hệ quản trị: Supabase (PostgreSQL 15+)
-- Chuẩn hóa: 3NF. 8 bảng nghiệp vụ theo ERD Chương 3.5 của tài liệu SDS.
--
-- Ghi chú quan trọng về mô hình người dùng của Supabase:
--   * Supabase tự quản lý bảng `auth.users` (định danh, email, mật khẩu,
--     OAuth, JWT). Chúng ta KHÔNG tạo lại bảng `users` riêng để tránh
--     trùng lặp nguồn sự thật (single source of truth) về tài khoản.
--   * Thay vào đó, bảng `profiles` đóng vai trò "hồ sơ sức khỏe" gắn 1-1
--     với `auth.users` qua khóa ngoại `id`. Đây chính là bảng `users`
--     trung tâm trong ERD, được tách phần định danh sang auth.users.
--
-- Thứ tự áp dụng: 0001 -> 0002 -> 0003 -> 0004
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. TIỆN ÍCH MỞ RỘNG (extensions)
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";  -- gen_random_uuid()
create extension if not exists "citext";    -- email không phân biệt hoa/thường

-- ---------------------------------------------------------------------
-- 1. KIỂU DỮ LIỆU LIỆT KÊ (enums)
-- ---------------------------------------------------------------------

-- Giới tính — phục vụ tính BMI và bật/tắt module Cycle Tracker.
create type public.gender_type as enum ('male', 'female', 'other', 'unspecified');

-- Nguồn gốc bản ghi chỉ số: thiết bị đeo, nhập tay, hoặc đồng bộ từ
-- hệ sinh thái sức khỏe của nền tảng (HealthKit / Health Connect).
create type public.metric_source as enum ('manual', 'device', 'healthkit', 'health_connect', 'seed');

-- Loại bữa ăn trên màn hình Nutrition Tracker.
create type public.meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');

-- Nhóm bài viết y tế trên màn hình Explore ("For you": Nutrition, Sports, Running...).
create type public.content_category as enum (
  'nutrition', 'sports', 'running', 'sleep', 'mental_health', 'womens_health', 'lifestyle'
);

-- Trạng thái một lời mời chia sẻ dữ liệu (màn hình Sharing).
create type public.grant_status as enum ('pending', 'active', 'revoked', 'expired');

-- Loại triệu chứng ghi nhận hàng ngày trên màn hình Cycle Tracker.
create type public.symptom_type as enum (
  'cramps', 'headache', 'acne', 'fatigue', 'bloating', 'back_pain', 'nausea', 'none'
);

-- Cảm xúc (mood tracking) trên màn hình Cycle Tracker.
create type public.mood_type as enum ('happy', 'neutral', 'sad', 'anxious', 'irritated', 'tired');

-- Từ điển chỉ số cho bảng health_metrics (màn hình All Health Data).
-- Thiết kế "một bảng - nhiều chỉ số" (EAV có kiểm soát) để thêm chỉ số mới
-- (SpO2, huyết áp, ECG) mà không phải ALTER TABLE.
create type public.metric_kind as enum (
  'heart_rate',          -- BPM
  'body_mass_index',     -- BMI
  'body_weight',         -- kg
  'body_height',         -- cm
  'body_fat',            -- %
  'water_intake',        -- ml
  'resting_energy',      -- kcal
  'blood_oxygen',        -- %  (mở rộng)
  'blood_pressure_sys',  -- mmHg (mở rộng)
  'blood_pressure_dia'   -- mmHg (mở rộng)
);

-- ---------------------------------------------------------------------
-- 2. BẢNG 1 — profiles (hồ sơ người dùng, trung tâm của ERD)
-- ---------------------------------------------------------------------
create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  full_name           text,
  avatar_url          text,
  gender              public.gender_type not null default 'unspecified',
  date_of_birth       date,
  height_cm           numeric(5, 2) check (height_cm is null or (height_cm > 0 and height_cm < 300)),
  weight_kg           numeric(5, 2) check (weight_kg is null or (weight_kg > 0 and weight_kg < 500)),

  -- Mục tiêu cá nhân hóa (dùng cho các vòng tiến độ trên Dashboard)
  step_goal           integer not null default 10000 check (step_goal between 500 and 100000),
  calorie_goal        integer not null default 2200 check (calorie_goal between 500 and 10000),
  water_goal_ml       integer not null default 2000 check (water_goal_ml between 200 and 15000),
  sleep_goal_minutes  integer not null default 480  check (sleep_goal_minutes between 120 and 960),

  -- Lịch trình ngủ (màn hình Sleep Tracker: "Set your schedule")
  bedtime             time not null default '22:00',
  wake_time           time not null default '07:30',

  -- Cấu hình chu kỳ (màn hình Cycle Tracker)
  cycle_enabled       boolean not null default false,
  cycle_length_days   integer not null default 28 check (cycle_length_days between 21 and 45),
  period_length_days  integer not null default 5  check (period_length_days between 2 and 10),

  -- Bật/tắt từng nhóm dữ liệu trong phạm vi được chia sẻ
  share_steps         boolean not null default false,
  share_sleep         boolean not null default false,
  share_nutrition     boolean not null default false,
  share_cycle         boolean not null default false,
  share_heart_rate    boolean not null default false,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.profiles is
  'Hồ sơ người dùng — 1-1 với auth.users. Chứa thông tin định danh mở rộng, mục tiêu cá nhân và cấu hình chia sẻ.';

create index idx_profiles_full_name on public.profiles using gin (to_tsvector('simple', coalesce(full_name, '')));

-- ---------------------------------------------------------------------
-- 3. BẢNG 2 — step_records (nhật ký vận động theo ngày)
-- ---------------------------------------------------------------------
-- Màn hình Step Tracker + widget "Steps" trên Overview.
-- Khóa UNIQUE(user_id, recorded_on): mỗi người dùng có đúng một bản ghi
-- tổng hợp cho mỗi ngày, cho phép "đồng bộ upsert" từ cảm biến nhiều lần
-- trong ngày mà không tạo bản ghi trùng.
create table public.step_records (
  id                 bigint generated always as identity primary key,
  user_id            uuid not null references public.profiles (id) on delete cascade,
  recorded_on        date not null default current_date,

  steps              integer not null default 0 check (steps >= 0 and steps < 500000),
  distance_km        numeric(7, 2) not null default 0 check (distance_km >= 0),
  calories_burned    numeric(7, 2) not null default 0 check (calories_burned >= 0),
  active_minutes     integer not null default 0 check (active_minutes >= 0 and active_minutes <= 1440),
  double_support_pct numeric(5, 2) check (double_support_pct is null or (double_support_pct >= 0 and double_support_pct <= 100)),

  -- Chuỗi JSON phân bố số bước theo 24 khung giờ: [{h:6, steps:120}, ...]
  hourly_breakdown   jsonb not null default '[]'::jsonb,

  source             public.metric_source not null default 'manual',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint uq_step_records_user_day unique (user_id, recorded_on)
);

comment on table public.step_records is 'Tổng hợp vận động theo ngày: bước chân, quãng đường, calo đốt, thời gian hoạt động.';

create index idx_step_records_user_day on public.step_records (user_id, recorded_on desc);

-- ---------------------------------------------------------------------
-- 4. BẢNG 3 — sleep_records (nhật ký giấc ngủ theo đêm)
-- ---------------------------------------------------------------------
-- Màn hình Sleep Tracker. sleep_date là ngày THỨC DẬY (đêm-crossing day),
-- quy ước để biểu đồ "Mon..Sun" xếp đúng trục thời gian.
create table public.sleep_records (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  sleep_date      date not null default current_date,

  bedtime_at      timestamptz,
  wake_at         timestamptz,
  total_minutes   integer not null default 0 check (total_minutes >= 0 and total_minutes <= 1440),
  deep_minutes    integer not null default 0 check (deep_minutes >= 0),
  light_minutes   integer not null default 0 check (light_minutes >= 0),
  rem_minutes     integer not null default 0 check (rem_minutes >= 0),
  awake_minutes   integer not null default 0 check (awake_minutes >= 0),
  awakenings      smallint  not null default 0 check (awakenings >= 0),

  -- "Sleep rate 82%" trên giao diện: điểm chất lượng 0-100
  quality_score   numeric(5, 2) check (quality_score is null or (quality_score >= 0 and quality_score <= 100)),

  source          public.metric_source not null default 'manual',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint uq_sleep_records_user_day unique (user_id, sleep_date),
  -- Tổng các pha không được vượt quá tổng thời lượng ngủ (toàn vẹn dữ liệu)
  constraint chk_sleep_phases_sum check (
    deep_minutes + light_minutes + rem_minutes + awake_minutes <= total_minutes + 60
  )
);

comment on table public.sleep_records is 'Giấc ngủ theo đêm: thời lượng, phân bổ pha Deep/Light/REM, điểm chất lượng.';

create index idx_sleep_records_user_day on public.sleep_records (user_id, sleep_date desc);

-- ---------------------------------------------------------------------
-- 5. BẢNG 4 — nutrition_logs (nhật ký bữa ăn)
-- ---------------------------------------------------------------------
-- Màn hình Nutrition Tracker. Granularity là TỪNG MÓN ĂN (không phải tổng
-- ngày) để tổng hợp (SUM) ra calo + đa lượng của vòng tròn tiến độ.
create table public.nutrition_logs (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  logged_on    date not null default current_date,
  meal         public.meal_type not null default 'snack',

  food_name    text not null check (char_length(trim(food_name)) > 0),
  quantity     numeric(8, 2) not null default 1 check (quantity > 0),
  unit         text not null default 'portion' check (char_length(unit) <= 20),

  calories     numeric(8, 2) not null default 0 check (calories >= 0),
  protein_g    numeric(7, 2) not null default 0 check (protein_g >= 0),
  carbs_g      numeric(7, 2) not null default 0 check (carbs_g >= 0),
  fat_g        numeric(7, 2) not null default 0 check (fat_g >= 0),

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.nutrition_logs is 'Một món ăn trong một bữa. Tổng hợp theo ngày ra calo và đa lượng.';

create index idx_nutrition_logs_user_day on public.nutrition_logs (user_id, logged_on desc, meal);

-- ---------------------------------------------------------------------
-- 6. BẢNG 5 — cycle_records (chu kỳ kinh nguyệt + triệu chứng)
-- ---------------------------------------------------------------------
-- Màn hình Cycle Tracker. Một dòng = một kỳ kinh đã diễn ra HOẶC đã dự báo
-- (is_predicted = true). Dự báo được sinh ra bởi hàm predict_next_periods().
create table public.cycle_records (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references public.profiles (id) on delete cascade,

  period_start   date not null,
  period_end     date,
  cycle_length   integer check (cycle_length is null or (cycle_length between 15 and 60)),
  is_predicted   boolean not null default false,

  -- Ghi nhận triệu chứng / cảm xúc hàng ngày ("Share your symptoms with us")
  symptom        public.symptom_type,
  mood           public.mood_type,
  fertility_risk text check (fertility_risk is null or fertility_risk in ('low', 'medium', 'high')),
  notes          text check (notes is null or char_length(notes) <= 1000),

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint chk_cycle_dates check (period_end is null or period_end >= period_start)
);

comment on table public.cycle_records is 'Kỳ kinh (thực tế hoặc dự báo) kèm triệu chứng và cảm xúc ghi nhận theo ngày.';

create index idx_cycle_records_user_start on public.cycle_records (user_id, period_start desc);

-- ---------------------------------------------------------------------
-- 7. BẢNG 6 — health_metrics (thư viện chỉ số tổng hợp)
-- ---------------------------------------------------------------------
-- Màn hình All Health Data: Heart 68 BPM, BMI 18.69, Water 10,659 ml...
-- Dùng mô hình EAV có kiểm soát (metric_kind + value + unit) để thêm chỉ số
-- mới mà không phải đổi lược đồ.
create table public.health_metrics (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  metric_kind  public.metric_kind not null,
  value        numeric(10, 2) not null,
  unit         text not null check (char_length(unit) <= 20),
  recorded_at  timestamptz not null default now(),
  source       public.metric_source not null default 'manual',
  created_at   timestamptz not null default now()
);

comment on table public.health_metrics is 'Chuỗi thời gian cho mọi chỉ số sinh học không thuộc 4 module chính.';

create index idx_health_metrics_lookup on public.health_metrics (user_id, metric_kind, recorded_at desc);

-- ---------------------------------------------------------------------
-- 8. BẢNG 7 — sharing_grants (phân quyền chia sẻ dữ liệu)
-- ---------------------------------------------------------------------
-- Màn hình Sharing. Chủ sở hữu cấp quyền cho bác sĩ / người thân theo email,
-- có thời hạn, có thể thu hồi tức thì (Revoke).
create table public.sharing_grants (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references public.profiles (id) on delete cascade,

  recipient_email  citext not null,
  recipient_name   text,
  recipient_id     uuid references public.profiles (id) on delete set null,

  -- Mã liên kết an toàn dùng để xác thực lượt truy cập của người được mời
  invite_token     uuid not null unique default gen_random_uuid(),

  status           public.grant_status not null default 'pending',

  -- Phạm vi chia sẻ: mảng các khóa tương ứng cột share_* trên profiles
  scopes           text[] not null default '{}',

  validity_days    integer check (validity_days is null or validity_days > 0),
  expires_at       timestamptz,
  notify_on_update boolean not null default true,

  accepted_at      timestamptz,
  revoked_at       timestamptz,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint uq_sharing_grant unique (owner_id, recipient_email)
);

comment on table public.sharing_grants is 'Bản ghi phân quyền chia sẻ dữ liệu sức khỏe cho bên thứ ba, có thời hạn và thu hồi được.';

create index idx_sharing_grants_owner on public.sharing_grants (owner_id, status);
create index idx_sharing_grants_recipient on public.sharing_grants (recipient_email, status);

-- ---------------------------------------------------------------------
-- 9. BẢNG 8 — health_content (kho bài viết y tế)
-- ---------------------------------------------------------------------
-- Màn hình Explore + mục "Blogs" trên Overview.
-- Bảng độc lập, không có khóa ngoại user_id (nội dung công khai).
create table public.health_content (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

  category        public.content_category not null,
  title           text not null check (char_length(trim(title)) between 3 and 200),
  excerpt         text not null default '',
  body            text not null default '',
  cover_image_url text,

  author          text not null default 'Healthy Check',
  read_minutes    smallint not null default 4 check (read_minutes between 1 and 240),
  tags            text[] not null default '{}',

  is_published    boolean not null default false,
  is_featured     boolean not null default false,

  -- Bộ đếm lan truyền (denormalize để đọc nhanh; cập nhật bởi trigger)
  upvotes         integer not null default 0 check (upvotes >= 0),
  views           integer not null default 0 check (views >= 0),

  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint chk_published_at check (not is_published or published_at is not null)
);

comment on table public.health_content is 'Bài viết kiến thức y tế hiển thị ở Explore và Blogs trên Overview.';

create index idx_content_category on public.health_content (category, published_at desc) where is_published;
create index idx_content_search on public.health_content
  using gin (to_tsvector('simple', title || ' ' || excerpt || ' ' || body));

-- ---------------------------------------------------------------------
-- 10. BẢNG PHỤ TRỢ — content_votes
-- ---------------------------------------------------------------------
-- KHÔNG nằm trong ERD 8 bảng của tài liệu SDS, nhưng bắt buộc phải có để
-- nút "78 votes" trên thẻ bài viết hoạt động đúng (chống bỏ phiếu lặp và
-- cho phép bỏ phiếu lại). Tách riêng để không làm sai lệch tài liệu thiết kế.
create table public.content_votes (
  content_id  uuid not null references public.health_content (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  voted       boolean not null default true,
  created_at  timestamptz not null default now(),

  primary key (content_id, user_id)
);

comment on table public.content_votes is 'Lịch sử bỏ phiếu bài viết theo từng người dùng (bảng mở rộng ngoài ERD).';

-- ---------------------------------------------------------------------
-- 11. BẢNG PHỤ TRỢ — health_score_history
-- ---------------------------------------------------------------------
-- Ảnh chụp điểm Health Score theo ngày để vẽ biểu đồ xu hướng tuần/tháng.
-- Điểm hiện tại luôn tính lại được từ các bảng nguồn; bảng này chỉ lưu lịch sử.
create table public.health_score_history (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  score_date  date not null default current_date,
  score       numeric(5, 2) not null check (score between 0 and 100),
  label       text not null default 'fair',
  components  jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now(),

  primary key (user_id, score_date)
);

comment on table public.health_score_history is 'Lịch sử điểm sức khỏe tổng hợp theo ngày (component weights lưu trong JSONB).';
