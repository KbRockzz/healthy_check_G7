-- =====================================================================
-- Healthy Check (G7) — Migration 0009: HOÀN THIỆN CHỨC NĂNG EXPLORE
-- =====================================================================
-- Mở rộng bảng health_content, tạo bảng bookmark, và sửa lỗi vote_article
-- (đếm lại số dòng content_votes rồi ghi overwrite upvotes → bài đang
-- có 164 lượt thích sẽ tụt về 1 ngay phiếu thật đầu tiên).
--
-- Idempotent: có thể chạy lại nhiều lần không lỗi, không reset views/upvotes.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. MỞ RỘNG health_content: cột mà UI dùng nhưng chưa có
-- ---------------------------------------------------------------------
alter table public.health_content
  add column if not exists author_role   text not null default '',
  add column if not exists key_takeaways jsonb not null default '[]'::jsonb,
  add column if not exists quote         jsonb,
  add column if not exists action_tips   jsonb not null default '[]'::jsonb;

-- ---------------------------------------------------------------------
-- 2. BẢNG content_bookmarks (lưu bài viết của từng user)
-- ---------------------------------------------------------------------
create table if not exists public.content_bookmarks (
  content_id  uuid not null references public.health_content (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (content_id, user_id)
);

comment on table public.content_bookmarks is 'Danh sách bài viết đã lưu của từng người dùng (bookmark).';

create index if not exists idx_content_bookmarks_user
  on public.content_bookmarks (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- 3. RLS cho content_bookmarks
-- ---------------------------------------------------------------------
alter table public.content_bookmarks enable row level security;

drop policy if exists "content_bookmarks_select" on public.content_bookmarks;
create policy "content_bookmarks_select"
  on public.content_bookmarks
  for select
  using (user_id = auth.uid());

drop policy if exists "content_bookmarks_insert" on public.content_bookmarks;
create policy "content_bookmarks_insert"
  on public.content_bookmarks
  for insert
  with check (user_id = auth.uid());

drop policy if exists "content_bookmarks_delete" on public.content_bookmarks;
create policy "content_bookmarks_delete"
  on public.content_bookmarks
  for delete
  using (user_id = auth.uid());

grant select, insert, delete on public.content_bookmarks to authenticated;

-- ---------------------------------------------------------------------
-- 4. SỬA LỖI vote_article: không đếm lại toàn bộ content_votes
-- ---------------------------------------------------------------------
-- Logic mới:
--   * Đọc phiếu trước đó của user (nếu có).
--   * Upsert phiếu mới.
--   * Chỉ điều chỉnh upvotes = greatest(0, upvotes ± 1) khi trạng thái
--     phiếu thay đổi (null → true, true → false, false → true).
--   * Trả về upvotes hiện tại.
-- --
-- Kết quả: bài đang có 164 upvotes (seed) + 1 phiếu thật → 165.
-- Thích lần nữa (không đổi trạng thái) → vẫn 165. Bỏ thích → 164.
-- ---------------------------------------------------------------------
create or replace function public.vote_article(p_content uuid, p_vote boolean default true)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_prev_vote boolean;
  v_upvotes   integer;
begin
  if auth.uid() is null then
    raise exception 'Yêu cầu đăng nhập' using errcode = '42501';
  end if;

  if not exists (select 1 from public.health_content c
                 where c.id = p_content and c.is_published) then
    raise exception 'Bài viết không tồn tại hoặc chưa xuất bản';
  end if;

  -- Đọc phiếu trước đó của user (null nếu chưa từng bỏ phiếu)
  select cv.voted into v_prev_vote
  from public.content_votes cv
  where cv.content_id = p_content and cv.user_id = auth.uid();

  -- Upsert phiếu của user
  insert into public.content_votes (content_id, user_id, voted)
  values (p_content, auth.uid(), p_vote)
  on conflict (content_id, user_id) do update
    set voted = excluded.voted;

  -- Chỉ điều chỉnh upvotes khi trạng thái phiếu thay đổi
  if v_prev_vote is distinct from p_vote then
    select c.upvotes into v_upvotes
    from public.health_content c
    where c.id = p_content;

    if p_vote then
      v_upvotes := greatest(0, coalesce(v_upvotes, 0) + 1);
    else
      v_upvotes := greatest(0, coalesce(v_upvotes, 0) - 1);
    end if;

    update public.health_content set upvotes = v_upvotes where id = p_content;
  else
    -- Phiếu không đổi → trả về upvotes hiện tại
    select c.upvotes into v_upvotes
    from public.health_content c
    where c.id = p_content;
  end if;

  return coalesce(v_upvotes, 0);
end;
$$;

comment on function public.vote_article(uuid, boolean) is
  'Bỏ phiếu bài viết: chỉ điều chỉnh upvotes khi trạng thái phiếu thay đổi, không reset về số phiếu thật.';

grant execute on function public.vote_article(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- 5. TỰ ĐỘNG CẬP NHẬT updated_at cho content_bookmarks
-- ---------------------------------------------------------------------
drop trigger if exists trg_touch_content_bookmarks on public.content_bookmarks;
create trigger trg_touch_content_bookmarks
  before update on public.content_bookmarks
  for each row execute function public.touch_updated_at();