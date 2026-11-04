-- =====================================================================
-- Healthy Check (G7) — Migration 0013: HEALTH COACH CHATBOT
-- =====================================================================
-- Tạo bảng lưu lịch sử hội thoại chatbot "Health Coach":
--   * chat_conversations  — mỗi cuộc trò chuyện (1 user, nhiều message)
--   * chat_messages       — user / assistant, có cột safety_flag
--   * chat_usage          — hạn mức tin nhắn theo ngày (user_id, usage_date)
-- Quy tắc bảo mật (đã chốt trong plan §4):
--   - Client (authenticated) chỉ ĐƯỢC select + delete của chính mình.
--   - Không có policy insert/update cho client: mọi ghi do Edge Function
--     dùng service role thực hiện, tránh client giả mạo lượt assistant.
--   - chat_usage không có policy cho client (chỉ service role truy cập).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. BẢNG chat_conversations
-- ---------------------------------------------------------------------
create table if not exists public.chat_conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  title       text not null default 'Cuộc trò chuyện mới' check (char_length(title) <= 120),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_chat_conversations_user
  on public.chat_conversations (user_id, updated_at desc);

-- ---------------------------------------------------------------------
-- 2. BẢNG chat_messages
-- ---------------------------------------------------------------------
create table if not exists public.chat_messages (
  id               bigint generated always as identity primary key,
  conversation_id  uuid not null references public.chat_conversations (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  role             text not null check (role in ('user', 'assistant')),
  content          text not null check (char_length(content) between 1 and 8000),
  safety_flag      text check (safety_flag in ('emergency', 'refused')),
  created_at       timestamptz not null default now()
);

create index if not exists idx_chat_messages_conv
  on public.chat_messages (conversation_id, id);

-- ---------------------------------------------------------------------
-- 3. BẢNG chat_usage — hạn mức tin nhắn/ngày
-- ---------------------------------------------------------------------
create table if not exists public.chat_usage (
  user_id        uuid not null references public.profiles (id) on delete cascade,
  usage_date     date not null default current_date,
  message_count  integer not null default 0,
  primary key (user_id, usage_date)
);

-- ---------------------------------------------------------------------
-- 4. RLS: client chỉ ĐỌC và XOÁ của chính mình
-- ---------------------------------------------------------------------
alter table public.chat_conversations enable row level security;
alter table public.chat_messages      enable row level security;
alter table public.chat_usage         enable row level security;

create policy "own conversations select"
  on public.chat_conversations for select
  using (user_id = auth.uid());

create policy "own conversations delete"
  on public.chat_conversations for delete
  using (user_id = auth.uid());

create policy "own messages select"
  on public.chat_messages for select
  using (user_id = auth.uid());

-- chat_usage: không có policy cho client → chỉ service role truy cập.

-- ---------------------------------------------------------------------
-- 5. Quyền bảng (PostgREST)
-- ---------------------------------------------------------------------
revoke all on public.chat_conversations, public.chat_messages, public.chat_usage from anon;
grant select, delete on public.chat_conversations to authenticated;
grant select on public.chat_messages to authenticated;

-- ---------------------------------------------------------------------
-- 6. Hàm consume_chat_quota — giảm hạn mức ngày (security definer)
--    Trả true nếu còn quota (message_count sau khi tăng <= p_limit).
--    Chỉ service role gọi; không cho client.
-- ---------------------------------------------------------------------
create or replace function public.consume_chat_quota(p_user uuid, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_count integer;
begin
  insert into public.chat_usage (user_id, usage_date, message_count)
  values (p_user, current_date, 1)
  on conflict (user_id, usage_date)
  do update set message_count = chat_usage.message_count + 1
  returning message_count into v_count;
  return v_count <= p_limit;
end;
$$;

revoke all on function public.consume_chat_quota(uuid, integer) from public, anon, authenticated;
-- Service role (Edge Function client B) là thành viên nhóm PUBLIC → sau REVOKE
-- vẫn phải được cấp rõ thì PostgREST mới cho gọi.
grant execute on function public.consume_chat_quota(uuid, integer) to service_role;

-- ---------------------------------------------------------------------
-- 7. Trigger tự cập nhật updated_at cho chat_conversations
--    Dùng chung touch_updated_at() đã có từ migration 0003.
-- ---------------------------------------------------------------------
drop trigger if exists trg_touch_chat_conversations on public.chat_conversations;
create trigger trg_touch_chat_conversations
  before update on public.chat_conversations
  for each row execute function public.touch_updated_at();

COMMIT;