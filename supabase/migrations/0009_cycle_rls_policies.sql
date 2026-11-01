-- Migration 0009: Add RLS Policies for new cycle tables
-- Cho phép người dùng truy cập và chỉnh sửa dữ liệu của chính mình

-- 1. Bật RLS cho các bảng
alter table public.cycle_periods enable row level security;
alter table public.cycle_daily_logs enable row level security;

-- 2. Chính sách cho cycle_periods
create policy "Users can view their own cycle periods"
  on public.cycle_periods for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own cycle periods"
  on public.cycle_periods for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own cycle periods"
  on public.cycle_periods for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own cycle periods"
  on public.cycle_periods for delete
  using ( auth.uid() = user_id );

-- 3. Chính sách cho cycle_daily_logs
create policy "Users can view their own daily logs"
  on public.cycle_daily_logs for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own daily logs"
  on public.cycle_daily_logs for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own daily logs"
  on public.cycle_daily_logs for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own daily logs"
  on public.cycle_daily_logs for delete
  using ( auth.uid() = user_id );
