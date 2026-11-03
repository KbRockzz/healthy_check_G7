-- Migration 0012: Add content_bookmarks table and RPC functions
-- Cho phép người dùng lưu (bookmark) bài viết

BEGIN;

-- ---------------------------------------------------------------------
-- BẢNG PHỤ TRỢ — content_bookmarks
-- ---------------------------------------------------------------------
create table if not exists public.content_bookmarks (
  content_id  uuid not null references public.health_content (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),

  primary key (content_id, user_id)
);

comment on table public.content_bookmarks is 'Danh sách bài viết đã lưu (bookmark) của người dùng.';

-- RLS
alter table public.content_bookmarks enable row level security;

create policy "Users can view own bookmarks" on public.content_bookmarks
  for select using (user_id = auth.uid());

create policy "Users can insert own bookmarks" on public.content_bookmarks
  for insert with check (user_id = auth.uid());

create policy "Users can delete own bookmarks" on public.content_bookmarks
  for delete using (user_id = auth.uid());

grant select, insert, delete on public.content_bookmarks to authenticated;

-- ---------------------------------------------------------------------
-- RPC: bookmark_article - Toggle bookmark status
-- ---------------------------------------------------------------------
create or replace function public.bookmark_article(p_content uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_exists boolean;
begin
  if auth.uid() is null then
    raise exception 'Yêu cầu đăng nhập' using errcode = '42501';
  end if;

  if not exists (select 1 from public.health_content c
                 where c.id = p_content and c.is_published) then
    raise exception 'Bài viết không tồn tại hoặc chưa xuất bản';
  end if;

  -- Check if already bookmarked
  select exists(
    select 1 from public.content_bookmarks
    where content_id = p_content and user_id = auth.uid()
  ) into v_exists;

  if v_exists then
    -- Remove bookmark
    delete from public.content_bookmarks
    where content_id = p_content and user_id = auth.uid();
    return false;
  else
    -- Add bookmark
    insert into public.content_bookmarks (content_id, user_id)
    values (p_content, auth.uid());
    return true;
  end if;
end;
$$;

grant execute on function public.bookmark_article(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- RPC: get_user_bookmarks - Get user's bookmarked articles
-- ---------------------------------------------------------------------
create or replace function public.get_user_bookmarks()
returns table (
  id uuid,
  slug text,
  category public.content_category,
  title text,
  excerpt text,
  cover_image_url text,
  author text,
  read_minutes smallint,
  tags text[],
  upvotes integer,
  views integer,
  published_at timestamptz,
  bookmarked_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    hc.id,
    hc.slug,
    hc.category,
    hc.title,
    hc.excerpt,
    hc.cover_image_url,
    hc.author,
    hc.read_minutes,
    hc.tags,
    hc.upvotes,
    hc.views,
    hc.published_at,
    cb.created_at as bookmarked_at
  from public.content_bookmarks cb
  join public.health_content hc on hc.id = cb.content_id
  where cb.user_id = auth.uid()
    and hc.is_published = true
  order by cb.created_at desc;
$$;

grant execute on function public.get_user_bookmarks() to authenticated;

COMMIT;