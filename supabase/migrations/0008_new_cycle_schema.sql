-- Migration 0008: Overhaul Cycle Tracker Schema
-- Tách cycle_records thành 2 bảng:
--   - cycle_periods: lưu các kỳ kinh (start/end date)
--   - cycle_daily_logs: lưu nhật ký triệu chứng/cảm xúc hàng ngày

BEGIN;

-- 1. Tạo bảng cycle_periods (thay thế cho việc lưu period start/end)
create table if not exists public.cycle_periods (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  period_start    date not null,
  period_end      date,
  cycle_length    integer check (cycle_length is null or (cycle_length between 15 and 60)),
  is_predicted    boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint uq_cycle_periods_user_latest unique (user_id, is_predicted)
);

comment on table public.cycle_periods is 'Các kỳ kinh đã diễn ra hoặc dự báo';

create index idx_cycle_periods_user_start on public.cycle_periods (user_id, period_start desc);

-- 2. Tạo bảng cycle_daily_logs (nhật ký triệu chứng hàng ngày)
create table if not exists public.cycle_daily_logs (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  log_date    date not null default current_date,
  flow        text check (flow in ('none', 'spotting', 'light', 'medium', 'heavy')),
  symptoms    text[] not null default '{}',
  mood        public.mood_type,
  notes       text check (notes is null or char_length(notes) <= 1000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint uq_cycle_daily_logs_user_date unique (user_id, log_date)
);

comment on table public.cycle_daily_logs is 'Nhật ký triệu chứng và cảm xúc hàng ngày của chu kỳ';

create index idx_cycle_daily_logs_user_date on public.cycle_daily_logs (user_id, log_date desc);

-- 3. Di chuyển dữ liệu cũ từ cycle_records (nếu có)
-- Chỉ di chuyển các bản ghi có period_start để tạo cycle_periods
insert into public.cycle_periods (user_id, period_start, cycle_length, is_predicted)
select
  user_id,
  period_start,
  cycle_length,
  is_predicted
from public.cycle_records
where period_start is not null
  and user_id not in (select user_id from public.cycle_periods)
on conflict do nothing;

-- 4. Di chuyển dữ liệu cũ sang daily logs (nếu có)
-- Sử dụng created_at date làm log_date
insert into public.cycle_daily_logs (user_id, log_date, symptoms, mood, notes)
select
  user_id,
  created_at::date,
  case when symptom is not null then array[symptom] else '{}' end,
  mood,
  notes
from public.cycle_records
where symptom is not null or mood is not null
  and not exists (select 1 from public.cycle_daily_logs cdl where cdl.user_id = cycle_records.user_id and cdl.log_date = cycle_records.created_at::date)
on conflict do nothing;

COMMIT;
