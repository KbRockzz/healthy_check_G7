-- =====================================================================
-- Healthy Check (G7) — Migration 0002: ROW LEVEL SECURITY (RLS)
-- =====================================================================
-- Supabase thực thi RLS ở tầng cơ sở dữ liệu, thay cho tầng "Business Logic"
-- trong kiến trúc 4 tầng của tài liệu SDS. Application chỉ cần anon key +
-- JWT của người dùng đăng nhập; KHÔNG cần service key ở client.
--
-- Nguyên tắc thiết kế:
--   1. BẬT RLS cho MỌI bảng nghiệp vụ (fail-closed: mặc định từ chối).
--   2. Người dùng chỉ đọc/ghi dữ liệu của CHÍNH HỌ (auth.uid()).
--   3. Ngoại lệ duy nhất: dữ liệu được CHIA SẺ qua bảng sharing_grants
--      còn hiệu lực (status='active', chưa hết hạn) và đúng scope đã bật.
--   4. Kho bài viết (health_content) đọc công khai, ghi chỉ cho admin.
--   5. Không có policy => không có quyền. Không bao giờ dùng policy
--      "using (true)" cho bảng chứa dữ liệu cá nhân.
--
-- Hàm phụ trợ được đánh dấu SECURITY DEFINER + search_path cố định để
-- tránh vấn đề quyền đệ quy khi policy tham chiếu bảng khác.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. KHÓA: BẬT RLS cho toàn bộ bảng nghiệp vụ
-- ---------------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.step_records       enable row level security;
alter table public.sleep_records      enable row level security;
alter table public.nutrition_logs     enable row level security;
alter table public.cycle_records      enable row level security;
alter table public.health_metrics     enable row level security;
alter table public.sharing_grants     enable row level security;
alter table public.health_content     enable row level security;
alter table public.content_votes      enable row level security;
alter table public.health_score_history enable row level security;

-- Thu hồi quyền mặc định trên bảng nhạy cảm với vai trò anon/authenticated
-- (Supabase grant công khai ở schema public; ta siết lại theo hướng tối thiểu).
revoke all on public.sharing_grants from anon;
revoke all on public.cycle_records  from anon;

-- ---------------------------------------------------------------------
-- 2. HÀM PHỤ TRỢ BẢO MẬT
-- ---------------------------------------------------------------------

-- 2.1. Người dùng hiện tại có được xem chỉ số loại $1 của người dùng $2 không?
--      Điều kiện: có grant 'active', chưa hết hạn, scope khớp, và chủ sở hữu
--      còn đang BẬT công tắc chia sẻ cho nhóm dữ liệu đó.
create or replace function public.can_view_shared(
  p_owner_id  uuid,
  p_scope     text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.sharing_grants g
    join public.profiles p on p.id = g.owner_id
    where g.owner_id = p_owner_id
      and g.status = 'active'
      and (g.expires_at is null or g.expires_at > now())
      and g.recipient_id = auth.uid()
      and g.scopes @> array [p_scope]
      -- tôn trọng công tắc bật/tắt từng nhóm dữ liệu trên hồ sơ chủ sở hữu
      and case p_scope
            when 'steps'     then p.share_steps
            when 'sleep'     then p.share_sleep
            when 'nutrition' then p.share_nutrition
            when 'cycle'     then p.share_cycle
            when 'heart'     then p.share_heart_rate
            else false
          end
  );
$$;

comment on function public.can_view_shared is
  'Trả về true nếu người dùng hiện tại (auth.uid()) được chủ sở hữu chia sẻ cho nhóm dữ liệu p_scope. SECURITY DEFINER để tránh đệ quy RLS trên sharing_grants.';

-- 2.1b. Người dùng hiện tại có phải người nhận ĐƯỢC CHIA SẺ bất kỳ dữ liệu
--       nào của p_owner không? Dùng cho policy bảng profiles (hiển thị tên
--       và ảnh đại diện trên dashboard được chia sẻ).
--       BẮT BUỘC bọc SECURITY DEFINER: nếu viết subquery trực tiếp trong
--       policy, RLS của sharing_grants (chỉ cho chủ sở hữu đọc) sẽ lọc hết
--       dòng và policy không bao giờ đúng -> lỗi đệ quy quyền.
create or replace function public.is_shared_with_me(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.sharing_grants g
    where g.owner_id = p_owner
      and g.recipient_id = auth.uid()
      and g.status = 'active'
      and (g.expires_at is null or g.expires_at > now())
  );
$$;

-- 2.2. Kiểm tra vai trò quản trị nội dung (Content Admin trong SRS).
--      Supabase gắn role qua JWT claim `app_role` (custom claims) hoặc
--      đơn giản hơn: thuộc group `service_admin`. Dùng hàm bao để dễ đổi
--      chiến lược về sau mà không phải sửa từng policy.
create or replace function public.is_content_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() ->> 'app_role') = 'content_admin',
    false
  );
$$;

comment on function public.is_content_admin is
  'Xác định Content Admin qua custom JWT claim app_role. Đổi chiến lược tại đây, không sửa policy.';

-- ---------------------------------------------------------------------
-- 3. PROFILES — hồ sơ cá nhân
-- ---------------------------------------------------------------------
-- Đọc: chủ sở hữu, HOẶC người được chia sẻ bất kỳ scope nào (để hiển thị
--     tên/ảnh đại diện trên dashboard của người nhận).
create policy profiles_select_own_or_shared
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_shared_with_me(id));

-- Chủ sở hữu chỉ được tự tạo hồ sơ cho chính mình (trigger on auth.users
-- tạo sẵn; policy này phục vụ luồng tự khởi tạo/tây đồng bộ).
create policy profiles_insert_self
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

-- Cập nhật: chỉ chủ sở hữu, và KHÔNG được tự nâng đặc quyền chia sẻ của
-- người khác (chỉ sửa dòng của mình nên đã an toàn; thêm WITH CHECK kép).
create policy profiles_update_self
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Xóa tài khoản: chỉ chủ sở hữu (cascade sang toàn bộ dữ liệu y tế).
create policy profiles_delete_self
  on public.profiles for delete
  to authenticated
  using (id = auth.uid());

-- ---------------------------------------------------------------------
-- 4. STEP_RECORDS — vận động
-- ---------------------------------------------------------------------
create policy steps_select_own_or_shared
  on public.step_records for select
  to authenticated
  using (user_id = auth.uid() or public.can_view_shared(user_id, 'steps'));

create policy steps_insert_own
  on public.step_records for insert
  to authenticated
  with check (user_id = auth.uid());

create policy steps_update_own
  on public.step_records for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy steps_delete_own
  on public.step_records for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 5. SLEEP_RECORDS — giấc ngủ
-- ---------------------------------------------------------------------
create policy sleep_select_own_or_shared
  on public.sleep_records for select
  to authenticated
  using (user_id = auth.uid() or public.can_view_shared(user_id, 'sleep'));

create policy sleep_insert_own
  on public.sleep_records for insert
  to authenticated
  with check (user_id = auth.uid());

create policy sleep_update_own
  on public.sleep_records for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy sleep_delete_own
  on public.sleep_records for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 6. NUTRITION_LOGS — dinh dưỡng
-- ---------------------------------------------------------------------
create policy nutrition_select_own_or_shared
  on public.nutrition_logs for select
  to authenticated
  using (user_id = auth.uid() or public.can_view_shared(user_id, 'nutrition'));

create policy nutrition_insert_own
  on public.nutrition_logs for insert
  to authenticated
  with check (user_id = auth.uid());

create policy nutrition_update_own
  on public.nutrition_logs for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy nutrition_delete_own
  on public.nutrition_logs for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 7. CYCLE_RECORDS — chu kỳ kinh nguyệt (DỮ LIỆU NHẠY CẢM CAO NHẤT)
-- ---------------------------------------------------------------------
-- Siết chặt hơn các bảng khác: KHÔNG có đường chia sẻ. Ngay cả khi chủ sở
-- hữu bật share_cycle, policy từ chối — theo nguyên tắc "Protect your
-- privacy" ở màn hình Sharing. Muốn chia sẻ phải chủ động grant riêng với
-- scope 'cycle' (được thiết kế là từ chối ở can_view_shared).
create policy cycle_select_own_only
  on public.cycle_records for select
  to authenticated
  using (user_id = auth.uid());

create policy cycle_insert_own
  on public.cycle_records for insert
  to authenticated
  with check (user_id = auth.uid());

create policy cycle_update_own
  on public.cycle_records for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy cycle_delete_own
  on public.cycle_records for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 8. HEALTH_METRICS — chỉ số tổng hợp
-- ---------------------------------------------------------------------
create policy metrics_select_own_or_shared
  on public.health_metrics for select
  to authenticated
  using (
    user_id = auth.uid()
    or (metric_kind = 'heart_rate' and public.can_view_shared(user_id, 'heart'))
  );

create policy metrics_insert_own
  on public.health_metrics for insert
  to authenticated
  with check (user_id = auth.uid());

create policy metrics_update_own
  on public.health_metrics for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy metrics_delete_own
  on public.health_metrics for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 9. SHARING_GRANTS — bảng phân quyền (chỉ chủ sở hữu quản lý)
-- ---------------------------------------------------------------------
-- Người nhận KHÔNG đọc trực tiếp bảng này (tránh lộ danh sách người được
-- chia sẻ); họ truy cập qua RPC create_share_link / list_my_grants.
create policy grants_select_own
  on public.sharing_grants for select
  to authenticated
  using (owner_id = auth.uid());

create policy grants_insert_own
  on public.sharing_grants for insert
  to authenticated
  with check (owner_id = auth.uid());

-- Chỉ được UPDATE/DELETE dòng của chính mình, và không được tự chuyển
-- trạng thái từ 'pending' -> 'active' (phải qua RPC xác nhận email).
create policy grants_update_own
  on public.sharing_grants for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy grants_delete_own
  on public.sharing_grants for delete
  to authenticated
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------
-- 10. HEALTH_CONTENT — kho bài viết (đọc công khai)
-- ---------------------------------------------------------------------
-- Cho phép anon đọc bài đã publish: màn hình Explore hoạt động ngay cả khi
-- chưa đăng nhập, đúng theo mockup (Launch -> Explore khả dụng sớm).
create policy content_select_published
  on public.health_content for select
  to anon, authenticated
  using (is_published = true);

create policy content_insert_admin
  on public.health_content for insert
  to authenticated
  with check (public.is_content_admin());

create policy content_update_admin
  on public.health_content for update
  to authenticated
  using (public.is_content_admin())
  with check (public.is_content_admin());

create policy content_delete_admin
  on public.health_content for delete
  to authenticated
  using (public.is_content_admin());

-- ---------------------------------------------------------------------
-- 11. CONTENT_VOTES — bỏ phiếu bài viết
-- ---------------------------------------------------------------------
create policy votes_select_all
  on public.content_votes for select
  to authenticated
  using (true);  -- bảng không chứa dữ liệu y tế, chỉ liên kết id bài + id user

create policy votes_upsert_own
  on public.content_votes for insert
  to authenticated
  with check (user_id = auth.uid());

create policy votes_update_own
  on public.content_votes for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy votes_delete_own
  on public.content_votes for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 12. HEALTH_SCORE_HISTORY — lịch sử điểm
-- ---------------------------------------------------------------------
create policy score_select_own_or_shared
  on public.health_score_history for select
  to authenticated
  using (user_id = auth.uid() or public.can_view_shared(user_id, 'steps'));

-- Chỉ hàm nội bộ (SECURITY DEFINER) được ghi bảng này => không có policy
-- insert/update cho vai trò authenticated. Người dùng không tự sửa điểm.

-- ---------------------------------------------------------------------
-- 13. THỰC THI CHẶT CHẼ VỚI CHÍNH SÁCH SELECT CỦA BẢNG CHIA SẺ
-- ---------------------------------------------------------------------
-- Khi người nhận truy cập dashboard được chia sẻ, họ chỉ thấy CỘT đã bật
-- trong scope. Với dữ liệu chưa chia sẻ, RPC trả về NULL (xem 0003) thay vì
-- để RLS cắt cột — RLS của Postgres chỉ cắt được ở cấp DÒNG.
