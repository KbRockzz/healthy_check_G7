-- =====================================================================
-- Healthy Check (G7) — Migration 0004: DỮ LIỆU MẪU CHO KHO BÀI VIẾT
-- =====================================================================
-- Nạp nội dung cho màn hình Explore và mục "Blogs" trên Overview.
-- Đây là dữ liệu CÔNG KHAI (không phải dữ liệu y tế cá nhân) nên an toàn
-- khi đưa vào migration. Dữ liệu người dùng demo nằm ở 0005_seed_demo.sql
-- (chỉ chạy ở môi trường phát triển).
--
-- Nội dung khớp với mockup: bài "More about Apples..." (Nutrition, 78 votes)
-- và "The si... to ma..." (Lifestyle, 54 votes).
-- =====================================================================

insert into public.health_content
  (slug, category, title, excerpt, body, cover_image_url, author,
   read_minutes, tags, is_published, is_featured, upvotes, views, published_at)
values
  (
    'more-about-apples-benefits-nutrition-and-tips',
    'nutrition',
    'More about Apples: Benefits, nutrition, and tips',
    'Một quả táo mỗi ngày có thật sự thay thế được bữa phụ? Phân tích định lượng chất xơ, vitamin C và đường tự nhiên trong táo, kèm gợi ý thời điểm ăn tốt nhất.',
    E'## Giá trị dinh dưỡng trong 1 quả táo (~182g)\n\n'
    || E'- Năng lượng: 95 kcal\n'
    || E'- Chất xơ: 4.4 g (khoảng 16% nhu cầu ngày)\n'
    || E'- Vitamin C: 14% nhu cầu ngày\n'
    || E'- Kali: 6% nhu cầu ngày\n\n'
    || E'## Vì sao táo giúp no lâu\n\n'
    || E'Chất xơ hòa tan pectin trong táo làm chậm quá trình rỗng dạ dày, nhờ đó đường huyết tăng chậm và cảm giác thèm ăn giảm. Ăn táo TRƯỚC bữa chính 15 phút có thể giảm 60-90 kcal nạp vào.\n\n'
    || E'## Lưu ý thực hành\n\n'
    || E'- Ăn cả vỏ để nhận tối đa chất xơ và polyphenol.\n'
    || E'- Người theo dõi lượng đường huyết nên giới hạn 1 quả nhỏ mỗi lần.\n'
    || E'- Nước ép táo mất toàn bộ chất xơ: không phải lựa chọn tương đương.\n\n'
    || E'> Ứng dụng Healthy Check mang tính chất theo dõi và tham khảo lối sống, không thay thế chẩn đoán y khoa chuyên nghiệp.',
    'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=800&q=80',
    'DS. Trần Minh Anh', 4,
    array['nutrition', 'fruit', 'fiber'],
    true, true, 78, 1240,
    now() - interval '3 day'
  ),
  (
    'the-signal-your-sleep-is-trying-to-max-out',
    'sleep',
    'The signal your sleep is trying to max out',
    'Nhịp sinh học, ánh sáng xanh và cửa sổ melatonin: giải thích vì sao thức dậy mệt dù đã ngủ đủ 7 tiếng, và cách chỉnh lại lịch ngủ trong 10 ngày.',
    E'## Ba tín hiệu bị bỏ qua\n\n'
    || E'1. **Khó vào giấc > 30 phút** — thường do tiếp xúc ánh sáng xanh sau 21h, ức chế melatonin.\n'
    || E'2. **Tỉnh giữa đêm lặp lại** — có thể liên quan thân nhiệt phòng ngủ quá cao.\n'
    || E'3. **Ngủ đủ nhưng vẫn mệt** — thiếu pha Deep Sleep, thường do caffeine sau 14h.\n\n'
    || E'## Phác đồ điều chỉnh 10 ngày\n\n'
    || E'- Ngày 1-3: cố định giờ thức dậy, kể cả cuối tuần.\n'
    || E'- Ngày 4-6: cắt caffeine sau 14h, phòng ngủ 26-28°C.\n'
    || E'- Ngày 7-10: tắt màn hình 45 phút trước giờ ngủ mục tiêu.\n\n'
    || E'Theo dõi cột "Deep sleep" trên màn hình Sleep Tracker để kiểm chứng tiến bộ.',
    'https://images.unsplash.com/photo-1515894786818-6a518420e043?w=800&q=80',
    'ThS. Nguyễn Hà Linh', 6,
    array['sleep', 'circadian', 'recovery'],
    true, true, 54, 890,
    now() - interval '5 day'
  ),
  (
    'craving-sweets-on-your-period-why-and-what-to-do',
    'womens_health',
    'Craving sweets on your period? Here''s why & what to do about it',
    'Hormone estrogen và serotonin tụt trong giai đoạn hoàng thể là thủ phạm chính của cảm giác thèm đồ ngọt. Cách đáp ứng mà không phá vỡ mục tiêu calo.',
    E'## Cơ chế\n\n'
    || E'Cuối chu kỳ, estrogen và serotonin cùng giảm, làm tăng nhu cầu carbohydrate nhanh để cơ thể tự tổng hợp tryptophan → serotonin. Đây là phản ứng sinh lý bình thường, không phải thiếu ý chí.\n\n'
    || E'## Chiến lược đáp ứng thông minh\n\n'
    || E'- Chọn trái cây đông lạnh xay + cacao: thỏa cơn thèm với ~150 kcal.\n'
    || E'- Ăn đủ protein trong bữa chính để ổn định đường huyết.\n'
    || E'- Ngủ đủ 7 tiếng: thiếu ngủ làm tăng ghrelin, khuếch đại cơn thèm.\n\n'
    || E'Ghi lại triệu chứng mỗi ngày bằng nút "Share your symptoms" trên màn hình Cycle Tracker để tìm quy luật riêng của bạn.',
    'https://images.unsplash.com/photo-1541783245831-573504df2826?w=800&q=80',
    'BS. Lê Thu Hằng', 5,
    array['womens_health', 'nutrition', 'hormones'],
    true, false, 41, 620,
    now() - interval '2 day'
  ),
  (
    'is-birth-control-safe-for-your-mental-health',
    'womens_health',
    'Is birth control safe for your mental health?',
    'Tổng hợp bằng chứng hiện tại về tác động của biện pháp tránh thai nội tiết lên tâm trạng, và những gì nên trao đổi với bác sĩ trước khi dùng.',
    E'## Bằng chứng nói gì\n\n'
    || E'Các nghiên cứu đoàn hệ lớn ghi nhận một nhóm nhỏ người dùng báo cáo tâm trạng thấp hơn, nhưng quan hệ nhân quả chưa được thiết lập chắc chắn và khác biệt rõ rệt theo loại chế phẩm và theo cá nhân.\n\n'
    || E'## Điều nên làm\n\n'
    || E'- Ghi nhận mood hằng tuần trong 3 tháng đầu sử dụng.\n'
    || E'- So sánh với dữ liệu Sleep và Cycle trong ứng dụng để tìm tương quan.\n'
    || E'- Mang theo bảng ghi nhận này khi tái khám để bác sĩ điều chỉnh phù hợp.\n\n'
    || E'> Nội dung mang tính tham khảo, không thay thế tư vấn của bác sĩ sản phụ khoa.',
    'https://images.unsplash.com/photo-1584346168426-5c7b3b85f4c7?w=800&q=80',
    'BS. Lê Thu Hằng', 7,
    array['womens_health', 'mental_health'],
    true, false, 33, 410,
    now() - interval '8 day'
  ),
  (
    'how-to-build-a-running-habit-in-8-weeks',
    'running',
    'How to build a running habit in 8 weeks',
    'Lộ trình chạy bộ 8 tuần cho người bắt đầu: tăng cự ly không quá 10% mỗi tuần, xen kẽ đi bộ, và cách dùng chỉ số Steps để biết bạn đang quá tải.',
    E'## Nguyên tắc 10%\n\n'
    || E'Tổng quãng đường mỗi tuần không tăng quá 10% so với tuần trước để mô và gân có thời gian thích nghi.\n\n'
    || E'## Lộ trình rút gọn\n\n'
    || E'- Tuần 1-2: đi bộ nhanh 20 phút x 3 buổi.\n'
    || E'- Tuần 3-4: ngắt quãng chạy 1 phút / đi 2 phút, 25 phút.\n'
    || E'- Tuần 5-6: chạy liên tục 20 phút x 3 buổi.\n'
    || E'- Tuần 7-8: chạy 30 phút, thêm 1 buổi chạy dài.\n\n'
    || E'Theo dõi Active Time và Double Support Time trên màn hình Step Tracker; nếu số bước tụt 2 ngày liên tiếp sau buổi chạy dài, đó là dấu hiệu cần nghỉ.',
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80',
    'HLV Phạm Đức Long', 5,
    array['running', 'fitness', 'habit'],
    true, false, 67, 980,
    now() - interval '1 day'
  ),
  (
    'protein-intake-how-much-do-you-actually-need',
    'nutrition',
    'Protein intake: how much do you actually need?',
    '1.6 g/kg hay 2.0 g/kg? Con số nhu cầu đạm thay đổi theo mức vận động. Cách đọc thanh Protein trên màn hình Nutrition cho đúng.',
    E'## Nhu cầu theo nhóm\n\n'
    || E'- Ít vận động: 0.8 - 1.0 g/kg cân nặng\n'
    || E'- Vận động đều: 1.2 - 1.6 g/kg\n'
    || E'- Tập sức mạnh / chạy bền: 1.6 - 2.0 g/kg\n\n'
    || E'## Chia trong ngày\n\n'
    || E'Hiệu quả tổng hợp protein cơ cao nhất khi chia đều 25-40 g mỗi bữa thay vì dồn vào bữa tối.\n\n'
    || E'Mục tiêu mẫu 160 g đạm mỗi ngày của bạn tương đương 4 bữa x 40 g. Theo dõi bằng thanh Protein trên màn hình Nutrition.',
    'https://images.unsplash.com/photo-1532601224472-55a79077c2f5?w=800&q=80',
    'DS. Trần Minh Anh', 4,
    array['nutrition', 'protein', 'muscle'],
    true, false, 29, 350,
    now() - interval '6 day'
  ),
  (
    'water-intake-the-real-number-not-8-glasses',
    'nutrition',
    'Water intake: the real number, not "8 glasses"',
    'Con số 2 lít mỗi ngày là ước mơ hồ. Cách tính nhu cầu nước theo cân nặng, mức vận động và khí hậu, cùng dấu hiệu cảnh báo sớm.',
    E'## Cách tính nhanh\n\n'
    || E'30-35 ml mỗi kg cân nặng, cộng thêm 350-700 ml cho mỗi giờ vận động ra mồ hôi.\n\n'
    || E'Người 60 kg ít vận động: ~1.8-2.1 L/ngày.\n'
    || E'Người 60 kg chạy 1 tiếng: ~2.5-2.8 L/ngày.\n\n'
    || E'## Dấu hiệu sớm\n\n'
    || E'- Nước tiểu sẫm màu kéo dài cả ngày\n'
    || E'- Nhức đầu nhẹ buổi chiều\n'
    || E'- Mệt mỏi khi leo cầu thang\n\n'
    || E'Ghi nhận lượng nước bằng chỉ số Water trên màn hình All Health Data.',
    'https://images.unsplash.com/photo-1548834925-e40f4667fb0a?w=800&q=80',
    'BS. Ngô Gia Bảo', 3,
    array['nutrition', 'hydration'],
    true, false, 22, 260,
    now() - interval '9 day'
  ),
  (
    'strength-training-for-beginners-three-lifts',
    'sports',
    'Strength training for beginners: the three lifts that matter',
    'Không cần phòng gym đông đủ máy. Squat, hinge và push bao phủ gần như toàn bộ chuỗi vận động khép và mở.',
    E'## Ba nhóm động tác nền\n\n'
    || E'1. **Squat** (ngồi - đứng): nhóm cơ đùi trước, mông.\n'
    || E'2. **Hinge** (gập hông): chuỗi sau, giữ lưng thẳng.\n'
    || E'3. **Push** (đẩy): ngực, vai, tay sau.\n\n'
    || E'## Cấu trúc buổi tập\n\n'
    || E'2-3 buổi mỗi tuần, mỗi nhóm 2-3 hiệp x 8-12 lần, nghỉ 90 giây giữa hiệp. Tăng tải khi hoàn thành đủ 3 hiệp x 12 lần ở 2 buổi liên tiếp.\n\n'
    || E'Theo dõi Active Time trên Step Tracker để đảm bảo tổng thời gian vận động đạt 30 phút mỗi ngày.',
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    'HLV Phạm Đức Long', 6,
    array['sports', 'strength', 'beginner'],
    true, false, 48, 700,
    now() - interval '4 day'
  ),
  (
    'understanding-your-resting-heart-rate',
    'lifestyle',
    'Understanding your resting heart rate',
    'Nhịp tim nghỉ là một trong những chỉ số tổng quát nhất về thể trạng. Vùng bình thường, vì sao vận động viên có nhịp tim thấp, và khi nào cần gặp bác sĩ.',
    E'## Vùng tham chiếu\n\n'
    || E'Người trưởng thành: 60-100 nhịp/phút khi nghỉ.\n'
    || E'Người tập luyện đều: thường 50-70.\n\n'
    || E'## Xu hướng quan trọng hơn con số\n\n'
    || E'Một nhịp tim nghỉ TĂNG dần qua nhiều tuần thường báo hiệu quá tải, mất ngủ, hoặc nhiễm trùng nhẹ — ngay cả khi vẫn trong vùng "bình thường".\n\n'
    || E'## Khi nào cần gặp bác sĩ\n\n'
    || E'- Thường xuyên dưới 50 kèm chóng mặt\n'
    || E'- Trên 100 khi nghỉ kéo dài\n'
    || E'- Nhịp không đều kèm hồi hộp\n\n'
    || E'Theo dõi chỉ số Heart trên màn hình All Health Data.',
    'https://images.unsplash.com/photo-1509541449511-0e2662d06d61?w=800&q=80',
    'BS. Ngô Gia Bảo', 5,
    array['lifestyle', 'heart', 'recovery'],
    true, false, 36, 520,
    now() - interval '7 day'
  ),
  (
    'mental-health-and-sleep-the-two-way-street',
    'mental_health',
    'Mental health and sleep: the two-way street',
    'Mất ngủ vừa là triệu chứng vừa là nguyên nhân của lo âu. Phá vòng lặp bằng kỹ thuật kiểm soát kích thích và hạn chế thời gian trên giường.',
    E'## Vòng lặp hai chiều\n\n'
    || E'Lo âu làm tăng kích hoạt hệ thần giao cảm -> khó vào giấc. Thiếu ngủ lại làm vùng amygdala phản ứng mạnh hơn -> lo âu tăng. Cắt vòng lặp cần tác động cả hai đầu.\n\n'
    || E'## Kỹ thuật kiểm soát kích thích\n\n'
    || E'- Giường chỉ dùng cho ngủ.\n'
    || E'- Sau 20 phút không ngủ được: rời giường, làm việc nhẹ dưới ánh sáng vàng, quay lại khi buồn ngủ.\n'
    || E'- Giữ giờ thức dậy cố định kể cả đêm ngủ kém.\n\n'
    || E'Ghi nhận mood hằng ngày trên màn hình Cycle Tracker để thấy tương quan với Sleep rate.',
    'https://images.unsplash.com/photo-1499591934245-40b5ed3fe6e0?w=800&q=80',
    'ThS. Nguyễn Hà Linh', 6,
    array['mental_health', 'sleep'],
    true, false, 27, 330,
    now() - interval '10 day'
  )
on conflict (slug) do nothing;

-- =====================================================================
-- BÀI VIẾT NHÁP (chưa publish) — phục vụ kiểm thử bộ lọc is_published
-- =====================================================================
insert into public.health_content
  (slug, category, title, excerpt, body, author, read_minutes, is_published)
values
  ('upcoming-guide-to-hrv', 'lifestyle', 'A practical guide to HRV',
   'Biến thiên nhịp tim là gì và nó nói gì về mức độ phục hồi của bạn.',
   'Nội dung đang trong quá trình biên soạn.', 'BS. Ngô Gia Bảo', 8, false)
on conflict (slug) do nothing;

-- =====================================================================
-- BẢO ĐẢM RÀNG BUỘC: bài đã publish phải có published_at
-- (đã được đảm bảo ở INSERT trên; trigger dưới đây giữ bất biến khi cập nhật)
-- =====================================================================
create or replace function public.enforce_published_at()
returns trigger
language plpgsql
as $$
begin
  if new.is_published and new.published_at is null then
    new.published_at := now();
  end if;
  if not new.is_published then
    new.published_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_published_at on public.health_content;
create trigger trg_enforce_published_at
  before insert or update on public.health_content
  for each row execute function public.enforce_published_at();

-- =====================================================================
-- XÁC MINH NHANH
-- =====================================================================
-- select category, count(*), sum(upvotes) from public.health_content
--   where is_published group by category order by category;
