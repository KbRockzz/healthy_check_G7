-- Migration 0011: Add shared_with_me RPC for listing incoming shares
-- Cho phép người dùng xem danh sách các lời mời chia sẻ mà họ đang nhận được

BEGIN;

-- Drop existing function if any (to allow recreating with new columns)
drop function if exists public.list_my_shared_with_me();

-- Tạo hàm RPC để liệt kê các grants mà user hiện tại là người nhận
create or replace function public.list_my_shared_with_me()
returns table (
  id uuid,
  owner_id uuid,
  owner_email text,
  owner_name text,
  scopes text[],
  status public.grant_status,
  expires_at timestamptz,
  invite_token uuid,
  accepted_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    g.id,
    g.owner_id,
    COALESCE(u.email, 'unknown') as owner_email,
    COALESCE(p.full_name, 'Người dùng') as owner_name,
    g.scopes,
    g.status,
    g.expires_at,
    g.invite_token,
    g.accepted_at,
    g.created_at
  from public.sharing_grants g
  left join auth.users u on u.id = g.owner_id
  left join public.profiles p on p.id = g.owner_id
  where g.recipient_id = auth.uid()
    and g.status = 'active'
  order by g.created_at desc;
$$;

grant execute on function public.list_my_shared_with_me() to authenticated;

COMMIT;
