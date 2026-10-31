/**
 * Kho dữ liệu kiến thức y tế & lối sống lành mạnh (Health Content Repository)
 * Được biên soạn chi tiết theo chuẩn khuyến nghị y khoa
 */
import { HealthContent } from '@/lib/supabase';

export interface DetailedArticle extends HealthContent {
  author_role: string;
  author_avatar?: string;
  key_takeaways: string[];
  quote?: {
    text: string;
    author: string;
  };
  action_tips: string[];
}

export const HEALTH_ARTICLES: DetailedArticle[] = [
  {
    id: 'art-1',
    slug: '10-sieu-thuc-pham-tang-trao-doi-chat',
    title: '10 Siêu thực phẩm giúp tăng trao đổi chất & phục hồi cơ bắp',
    category: 'nutrition',
    excerpt: 'Danh sách các loại thực phẩm giàu chất chống oxy hóa, protein nạc và axit béo omega-3 giúp cơ thể đốt cháy calo tự nhiên và duy trì vóc dáng săn chắc.',
    author: 'TS. BS. Nguyễn Thị Mai',
    author_role: 'Chuyên gia Dinh dưỡng Lâm sàng - Viện Dinh dưỡng Quốc gia',
    read_minutes: 6,
    tags: ['dinh_duong', 'trao_doi_chat', 'protein', 'calo'],
    views: 2450,
    upvotes: 218,
    is_featured: true,
    is_published: true,
    published_at: '2026-10-28T08:00:00Z',
    created_at: '2026-10-28T08:00:00Z',
    updated_at: '2026-10-28T08:00:00Z',
    cover_image_url: null,
    key_takeaways: [
      'Protein nạc (ức gà, cá hồi, đậu phụ) đòi hỏi cơ thể tiêu hao 20-30% năng lượng chỉ để tiêu hóa (Hiệu ứng nhiệt TEF).',
      'Trà xanh và ớt chuông chứa epigallocatechin gallate (EGCG) và capsaicin hỗ trợ quá trình oxy hóa chất béo tự nhiên.',
      'Cung cấp đủ chất xơ hòa tan giúp ổn định đường huyết, hạn chế cơn thèm ăn đột ngột vào giữa buổi chiều.',
    ],
    quote: {
      text: 'Thực phẩm bạn ăn mỗi ngày có thể là liều thuốc an toàn nhất hoặc là chất độc tích tụ chậm nhất. Hãy để dinh dưỡng là người bạn đồng hành cho sự bền bỉ của cơ thể.',
      author: 'TS. BS. Nguyễn Thị Mai',
    },
    body: `Quá trình trao đổi chất (Metabolism) là chuỗi các phản ứng sinh hóa chuyển hóa thức ăn thành năng lượng duy trì sự sống. Tốc độ trao đổi chất cơ bản (BMR) càng cao, cơ thể bạn càng đốt cháy nhiều năng lượng ngay cả trong lúc nghỉ ngơi.

1. Cá hồi và các loại cá béo nước lạnh
Cá hồi cực kỳ giàu axit béo Omega-3 (EPA và DHA). Omega-3 đã được chứng minh có khả năng giảm viêm mạn tính và kích thích sản sinh hormone leptin – hormone báo hiệu cảm giác no của não bộ.

2. Trứng nguyên quả
Nhiều người lầm tưởng lòng đỏ trứng gây hại, nhưng thực tế choline trong lòng đỏ đóng vai trò thiết yếu cho chức năng gan và dẫn truyền thần kinh. Hàm lượng axit amin leucine dồi dào trong trứng là yếu tố kích hoạt tái tạo mô cơ bắp sau khi tập luyện.

3. Trà xanh hữu cơ & Matcha
Chứa chất chống oxy hóa EGCG kết hợp cùng một lượng caffeine vừa phải. Nghiên cứu lâm sàng chỉ ra rằng uống 2-3 tách trà xanh mỗi ngày có thể tăng lượng calo đốt cháy thêm 3-4% trong vòng 24 giờ.

4. Quả bơ & Dầu ô liu nguyên chất
Chất béo không bão hòa đơn lành mạnh giúp màng tế bào nhạy cảm hơn với insulin, hỗ trợ chuyển hóa glucose vào cơ bắp thay vì tích trữ dưới dạng mô mỡ nội tạng.

5. Sữa chua Hy Lạp lên men tự nhiên
Cung cấp lượng protein gấp đôi sữa chua thông thường cùng hàng tỷ lợi khuẩn probiotics, nuôi dưỡng hệ vi sinh đường ruột khỏe mạnh – cơ quan điều hòa 70% hệ miễn dịch và chuyển hóa.`,
    action_tips: [
      'Uống 1 cốc nước ấm cùng vài giọt chanh hoặc 1 tách trà xanh vào mỗi buổi sáng.',
      'Đảm bảo mỗi bữa chính luôn có ít nhất 25-30g protein chất lượng cao.',
      'Bổ sung quả mọng (berries) hoặc một nắm nhỏ hạt hạnh nhân vào bữa phụ thay cho bánh ngọt.',
    ],
  },
  {
    id: 'art-2',
    slug: 'khoa-hoc-ve-giac-ngu-rem',
    title: 'Khoa học về giấc ngủ REM: Tại sao bạn cần 90 phút ngủ mơ mỗi đêm?',
    category: 'sleep',
    excerpt: 'Pha ngủ REM (Rapid Eye Movement) đóng vai trò quyết định trong việc củng cố trí nhớ dài hạn, thanh lọc độc tố não bộ và cân bằng cảm xúc sau ngày dài.',
    author: 'ThS. BS. Lê Minh Tuấn',
    author_role: 'Chuyên gia Y học Giấc ngủ - BV Đại học Y Dược',
    read_minutes: 7,
    tags: ['giac_ngu', 'rem', 'tri_nho', 'phuc_hoi'],
    views: 1890,
    upvotes: 164,
    is_featured: false,
    is_published: true,
    published_at: '2026-10-27T10:00:00Z',
    created_at: '2026-10-27T10:00:00Z',
    updated_at: '2026-10-27T10:00:00Z',
    cover_image_url: null,
    key_takeaways: [
      'Giấc ngủ REM chiếm khoảng 20-25% tổng thời gian ngủ ở người trưởng thành khỏe mạnh (khoảng 90-120 phút).',
      'Trong pha REM, não bộ xử lý và kết nối các dữ liệu mới học được với ký ức cũ, thúc đẩy khả năng sáng tạo đột phá.',
      'Thiếu hụt REM kéo dài dẫn đến suy giảm khả năng điều tiết cảm xúc, dễ cáu gắt và tăng nguy cơ thoái hóa thần kinh.',
    ],
    quote: {
      text: 'Giấc ngủ không phải là thời gian lãng phí không hoạt động; đó là thời khắc tối quan trọng để não bộ tự sửa chữa và nâng cấp chính nó.',
      author: 'GS. Matthew Walker - Tác giả cuốn sách "Why We Sleep"',
    },
    body: `Mỗi đêm, giấc ngủ của chúng ta trải qua chu kỳ 90-110 phút gồm 4 giai đoạn: Ngủ nông (N1, N2), Ngủ sâu (N3/Deep Sleep) và Giấc ngủ chuyển động mắt nhanh (REM).

Nếu giấc ngủ sâu (Deep Sleep) tập trung phục hồi thể chất, tiết hormone tăng trưởng và sửa chữa mô cơ bắp; thì giấc ngủ REM chính là "liệu pháp tâm lý miễn phí" của não bộ.

1. Não bộ hoạt động tương đương khi thức
Khi bước vào pha REM, nhịp tim và nhịp thở của bạn tăng nhẹ, mắt chuyển động nhanh dưới mi mắt, sóng não tương tự như trạng thái thức tỉnh. Đây là thời điểm những giấc mơ sống động nhất xuất hiện.

2. Thanh lọc cảm xúc tiêu cực
Trong pha REM, nồng độ hormone căng thẳng noradrenaline trong não hạ xuống mức gần bằng 0. Não bộ sẽ "phát lại" các sự kiện căng thẳng ban ngày trong một môi trường hóa học an toàn, giúp bạn thức dậy với tâm thế bình thản hơn.

3. Củng cố trí nhớ & Tư duy trừu tượng
Các kết nối nơ-ron thần kinh mới được hình thành trong ngày sẽ được củng cố vĩnh viễn vào vỏ não dài hạn. Đó là lý do những người ngủ đủ REM thường có khả năng giải quyết vấn đề phức tạp nhanh hơn 30%.`,
    action_tips: [
      'Tắt màn hình điện thoại và máy tính trước khi đi ngủ ít nhất 45 phút.',
      'Giữ nhiệt độ phòng ngủ mát mẻ lý tưởng từ 19 - 22°C.',
      'Hạn chế uống rượu bia vào buổi tối vì cồn ức chế trực tiếp pha ngủ REM.',
    ],
  },
  {
    id: 'art-3',
    slug: 'zone-2-cardio-dot-mo-sieu-viet',
    title: 'Zone 2 Cardio: Bí quyết đốt mỡ thừa và xây dựng trái tim thép của VĐV',
    category: 'running',
    excerpt: 'Luyện tập ở cường độ nhịp tim Zone 2 tối đa hóa số lượng ty thể tế bào, biến cơ thể bạn thành một cỗ máy đốt mỡ hiệu quả suốt cả ngày.',
    author: 'HLV. Đỗ Hoàng Long',
    author_role: 'Chuyên gia Y học Thể thao & Huấn luyện viên Ba môn phối hợp',
    read_minutes: 5,
    tags: ['cardio', 'zone2', 'chay_bo', 'dot_mo', 'tim_mach'],
    views: 3120,
    upvotes: 289,
    is_featured: false,
    is_published: true,
    published_at: '2026-10-26T14:30:00Z',
    created_at: '2026-10-26T14:30:00Z',
    updated_at: '2026-10-26T14:30:00Z',
    cover_image_url: null,
    key_takeaways: [
      'Zone 2 là vùng nhịp tim khoảng 60-70% nhịp tim tối đa (vẫn có thể vừa chạy vừa nói chuyện thành câu trọn vẹn).',
      'Ở Zone 2, cơ thể sử dụng gần như 100% chất béo làm nguồn nhiên liệu chính thay vì cạn kiệt đường glycogen.',
      'Gia tăng mật độ ty thể (nhà máy năng lượng tế bào) giúp tăng tuổi thọ và giảm nguy cơ mắc bệnh tim mạch.',
    ],
    body: `Nhiều người nghĩ rằng tập thể dục phải thở dốc, kiệt sức thì mới hiệu quả. Tuy nhiên, các vận động viên điền kinh Olympic hàng đầu thế giới dành đến 80% tổng thời gian tập luyện của họ ở một cường độ rất nhẹ nhàng: Vùng nhịp tim Zone 2.

Khi bạn tập ở cường độ quá cao, cơ thể không kịp cung cấp oxy và bắt buộc phải chuyển sang cơ chế đường phân yếm khí, tạo ra nhiều axit lactic gây đau mỏi. Ngược lại, Zone 2 kích hoạt tối đa sợi cơ co rút chậm (Type 1), kích thích ty thể phát triển về cả số lượng lẫn kích thước.

Cách xác định Zone 2 đơn giản không cần máy móc:
Bài kiểm tra giao tiếp (Talk Test): Bạn có thể duy trì tốc độ chạy hoặc đạp xe sao cho vẫn nói chuyện được câu dài với người bên cạnh mà không phải ngắt quãng để thở hổn hển.`,
    action_tips: [
      'Dành 3-4 buổi mỗi tuần, mỗi buổi 45-60 phút tập luyện trong vùng Zone 2 (đi bộ dốc, chạy bước nhỏ, đạp xe).',
      'Theo dõi nhịp tim trên đồng hồ thông minh hoặc ứng dụng Healthy Check để không vượt quá ngưỡng.',
      'Uống đủ nước và bổ sung điện giải trong suốt buổi tập.',
    ],
  },
  {
    id: 'art-4',
    slug: 'chu-ky-sinh-hoc-va-cua-so-rung-trung',
    title: 'Hiểu đúng về nhịp sinh học và cửa sổ rụng trứng cho phái đẹp',
    category: 'womens_health',
    excerpt: 'Hướng dẫn nhận biết sự biến thiên hormone estrogen và progesterone, nhiệt độ cơ thể và các dấu hiệu tự nhiên để chăm sóc sức khỏe sinh sản một cách khoa học.',
    author: 'BS. CKII. Lê Thu Thảo',
    author_role: 'Bác sĩ Sản Phụ khoa - BV Phụ sản Trung Ương',
    read_minutes: 8,
    tags: ['chu_ky', 'rung_trung', 'noi_tiet_to', 'phu_nu'],
    views: 2180,
    upvotes: 195,
    is_featured: false,
    is_published: true,
    published_at: '2026-10-25T09:15:00Z',
    created_at: '2026-10-25T09:15:00Z',
    updated_at: '2026-10-25T09:15:00Z',
    cover_image_url: null,
    key_takeaways: [
      'Chu kỳ kinh nguyệt gồm 4 giai đoạn rõ rệt: Hành kinh, Nang trứng, Rụng trứng và Hoàng thể.',
      'Cửa sổ thụ thai kéo dài khoảng 6 ngày (5 ngày trước rụng trứng và ngày rụng trứng) do tinh trùng có thể sống tối đa 5 ngày trong đường sinh dục.',
      'Nhiệt độ cơ thể cơ bản (BBT) tăng nhẹ 0.3 - 0.5°C ngay sau thời điểm rụng trứng dưới tác động của progesterone.',
    ],
    quote: {
      text: 'Chu kỳ kinh nguyệt được ví như dấu hiệu sinh tồn thứ năm của phụ nữ. Lắng nghe nhịp điệu hormone là chìa khóa để làm chủ năng lượng và sức khỏe cả đời.',
      author: 'BS. CKII. Lê Thu Thảo',
    },
    body: `Cơ thể phụ nữ không vận hành theo nhịp 24 giờ đơn điệu của nam giới, mà vận hành theo nhịp sinh học mở rộng (Infradian Rhythm) kéo dài trung bình 28 ngày.

1. Pha nang trứng (Follicular Phase)
Nồng độ Estrogen tăng dần giúp tinh thần phấn chấn, làn da căng mịn, khả năng tiếp thu kiến thức mới và sức bền cơ bắp đạt đỉnh cao. Đây là thời điểm lý tưởng để thử thách các bài tập cường độ cao.

2. Pha rụng trứng (Ovulation Phase - Khoảng ngày 14)
Trứng chín rời buồng trứng. Nồng độ hormone LH và Estrogen chạm đỉnh. Bạn sẽ cảm thấy tràn đầy năng lượng, sự tự tin và ham muốn giao tiếp xã hội.

3. Pha hoàng thể (Luteal Phase)
Progesterone chiếm ưu thế để chuẩn bị niêm mạc tử cung. Chuyển hóa cơ thể tăng nhẹ, bạn cần thêm khoảng 150-200 kcal mỗi ngày. Đây là lúc nên chuyển sang các bài tập thư giãn như Yoga, đi bộ nhẹ nhàng.`,
    action_tips: [
      'Ghi chép đều đặn ngày bắt đầu chu kỳ trên Healthy Check để thuật toán dự đoán chính xác cửa sổ rụng trứng.',
      'Bổ sung thêm sắt và magiê từ rau xanh đậm, các loại hạt và chocolate đen trong nửa sau chu kỳ.',
      'Hạn chế căng thẳng và ngủ đủ giấc khi chuẩn bị bước vào giai đoạn hoàng thể.',
    ],
  },
  {
    id: 'art-5',
    slug: 'ky-thuat-tho-4-7-8-ha-stress',
    title: 'Kỹ thuật thở 4-7-8: Kích hoạt hệ thần kinh phó giao cảm hạ stress trong 60 giây',
    category: 'mental_health',
    excerpt: 'Phương pháp điều hòa hơi thở chuẩn y khoa giúp làm dịu tâm trí, giảm nhịp tim tức thì và chuẩn bị cho giấc ngủ sâu không mộng mị.',
    author: 'TS. Tâm lý học Trần Đăng Khoa',
    author_role: 'Chuyên gia Tâm lý Trị liệu & Sức khỏe Tâm thần',
    read_minutes: 4,
    tags: ['tam_ly', 'giam_stress', 'tho_478', 'lo_au'],
    views: 1740,
    upvotes: 152,
    is_featured: false,
    is_published: true,
    published_at: '2026-10-24T16:00:00Z',
    created_at: '2026-10-24T16:00:00Z',
    updated_at: '2026-10-24T16:00:00Z',
    cover_image_url: null,
    key_takeaways: [
      'Thở 4-7-8 được phát triển bởi TS. Andrew Weil dựa trên phương pháp Pranayama cổ truyền của Yoga.',
      'Kéo dài thời gian thở ra kích thích trực tiếp dây thần kinh phế vị (Vagus Nerve), gửi tín hiệu an toàn đến tim và não bộ.',
      'Có thể thực hiện bất cứ lúc nào cảm thấy tim đập nhanh, lo lắng trước cuộc họp hoặc khi trằn trọc mất ngủ.',
    ],
    body: `Khi chúng ta đối mặt với áp lực công việc hoặc căng thẳng, hệ thần kinh giao cảm (Sympathetic Nervous System) bị kích hoạt quá mức, giải phóng adrenaline và cortisol khiến tim đập nhanh, huyết áp tăng và nhịp thở trở nên nông, gấp gáp.

Kỹ thuật thở 4-7-8 đóng vai trò như một chiếc phanh sinh học khẩn cấp:

Cách thực hiện chuẩn xác trong 4 bước:
1. Thở ra hoàn toàn qua miệng tạo ra âm thanh nhẹ "vù".
2. Khép miệng lại, hít vào từ từ bằng mũi trong khi đếm thầm từ 1 đến 4.
3. Nín thở và giữ yên không khí trong phổi trong vòng 7 giây.
4. Thở ra từ từ toàn bộ qua miệng trong vòng 8 giây.

Lặp lại chu kỳ này 4 lần liên tiếp. Bạn sẽ cảm nhận cơ thể mềm mại, vai hạ xuống và tâm trí lắng dịu một cách rõ rệt.`,
    action_tips: [
      'Thực hiện 4 nhịp thở 4-7-8 ngay trước khi đi ngủ mỗi đêm.',
      'Áp dụng ngay khi gặp tình huống gây bực bội hoặc trước các cuộc trao đổi quan trọng.',
      'Giữ lưng thẳng khi ngồi thở để lồng ngực mở rộng tối đa.',
    ],
  },
  {
    id: 'art-6',
    slug: 'quy-tac-dia-an-50-25-25',
    title: 'Quy tắc đĩa ăn cân bằng 50-25-25: Kiểm soát calo không cần nhịn ăn khắc nghiệt',
    category: 'nutrition',
    excerpt: 'Phương pháp phân chia tỷ lệ khẩu phần trực quan theo khuyến nghị của Trường Y Harvard giúp kiểm soát đường huyết và duy trì cân nặng lý tưởng.',
    author: 'BS. Dinh dưỡng Phạm Thảo Nguyên',
    author_role: 'Chuyên gia Tư vấn Chế độ ăn Bệnh viện Chợ Rẫy',
    read_minutes: 5,
    tags: ['dinh_duong', 'dia_an_harvard', 'kiem_soat_calo', 'giam_can'],
    views: 3290,
    upvotes: 310,
    is_featured: false,
    is_published: true,
    published_at: '2026-10-23T11:20:00Z',
    created_at: '2026-10-23T11:20:00Z',
    updated_at: '2026-10-23T11:20:00Z',
    cover_image_url: null,
    key_takeaways: [
      '50% đĩa ăn là rau củ nhiều màu sắc và trái cây ít ngọt (cung cấp chất xơ, vitamin và khoáng chất).',
      '25% đĩa ăn là protein chất lượng cao (cá, thịt nạc, trứng, các loại đậu).',
      '25% còn lại là tinh bột phức hợp nguyên cám (gạo lứt, yến mạch, khoai lang, quinoa).',
    ],
    body: `Đếm từng gram calo thường khiến nhiều người cảm thấy căng thẳng và khó duy trì lâu dài. Mô hình đĩa ăn lành mạnh (Healthy Eating Plate) giải quyết triệt để vấn đề này bằng một công thức trực quan, dễ áp dụng ở bất kỳ nhà hàng hay bữa cơm gia đình nào.

1. Nửa đĩa (50%): Rau củ đa sắc màu
Càng nhiều màu sắc, cơ thể bạn càng nhận được đa dạng nhóm hợp chất thực vật chống oxy hóa (Phytonutrients). Chất xơ tạo lớp màng nhớt trong ruột non làm chậm quá trình hấp thu glucose, tránh tăng đột biến đường huyết sau ăn.

2. Một phần tư đĩa (25%): Protein nạc
Protein là chất dinh dưỡng tạo cảm giác no lâu nhất. Nó kích thích tiết hormone peptide YY và GLP-1, đồng thời ức chế hormone ghrelin gây đói bụng.

3. Một phần tư đĩa (25%): Ngũ cốc nguyên cám
Thay thế cơm trắng hay bánh mì tinh chế bằng ngũ cốc nguyên hạt giúp cung cấp năng lượng giải phóng chậm, nuôi dưỡng hệ thần kinh và cơ bắp ổn định suốt 4-5 tiếng làm việc.`,
    action_tips: [
      'Áp dụng quy tắc ăn theo thứ tự: Rau củ trước -> Protein & Mỡ -> Tinh bột sau cùng.',
      'Uống 1 cốc nước lọc 15 phút trước bữa ăn để hỗ trợ tiêu hóa.',
      'Sử dụng các loại dầu lành mạnh như dầu ô liu hoặc dầu hạt cải để chế biến.',
    ],
  },
  {
    id: 'art-7',
    slug: 'nguyen-ly-progressive-overload',
    title: 'Nguyên lý Progressive Overload: Chìa khóa tăng cơ bắp & sức mạnh bền vững',
    category: 'sports',
    excerpt: 'Hiểu rõ cơ chế thích ứng của sợi cơ đối với khối lượng tập luyện tăng tiến để tránh tình trạng chững cơ (Plateau) và tối ưu hóa thời gian tập gym.',
    author: 'HLV. Nguyễn Thành Đạt',
    author_role: 'Chuyên gia Thể hình & Huấn luyện viên Cá nhân Cấp cao (CSCS)',
    read_minutes: 6,
    tags: ['the_thao', 'tap_gym', 'tang_co', 'progressive_overload'],
    views: 1980,
    upvotes: 182,
    is_featured: false,
    is_published: true,
    published_at: '2026-10-22T08:30:00Z',
    created_at: '2026-10-22T08:30:00Z',
    updated_at: '2026-10-22T08:30:00Z',
    cover_image_url: null,
    key_takeaways: [
      'Cơ bắp chỉ phát triển khi bị đặt dưới áp lực cơ học lớn hơn mức nó đã quen thuộc trước đó.',
      'Progressive Overload không chỉ là tăng tạ; bạn có thể tăng số lần lặp (reps), tăng số hiệp (sets), giảm thời gian nghỉ hoặc cải thiện biên độ chuyển động (ROM).',
      'Kỷ luật trong việc ghi chép nhật ký tập luyện là yếu tố số 1 phân biệt người tập thành công và người mãi dậm chân tại chỗ.',
    ],
    body: `Khi bạn tập một mức tạ 50kg trong suốt 6 tháng, cơ bắp của bạn đã hoàn toàn thích nghi sinh học với kích thích đó và không còn bất kỳ lý do sinh tồn nào để phải tổng hợp thêm protein tạo cơ mới.

Các hình thức áp dụng Progressive Overload thông minh:
1. Tăng mức kháng lực (Intensity): Nâng mức tạ từ 50kg lên 52.5kg.
2. Tăng số lần lặp (Volume): Thực hiện 10 reps thay vì 8 reps với cùng mức tạ cũ.
3. Kiểm soát nhịp độ (Tempo): Hạ tạ chậm trong 3-4 giây để kéo dài thời gian cơ chịu áp lực căng cơ học (Time Under Tension).
4. Cải thiện kỹ thuật form chuẩn: Biên độ chuyển động sâu hơn, chuẩn xác hơn mà không dùng đà của cơ thể.`,
    action_tips: [
      'Ghi chép số tạ và số rep của mỗi bài tập vào sổ tay hoặc điện thoại.',
      'Cố gắng tiến bộ ít nhất 1 thông số (thêm 1 rep hoặc thêm 1kg) sau mỗi tuần.',
      'Ngủ đủ 7-8 tiếng mỗi đêm vì 90% quá trình sửa chữa vi tổn thương cơ diễn ra trong giấc ngủ.',
    ],
  },
  {
    id: 'art-8',
    slug: 'hydration-va-dien-giai-khi-nao-nuoc-loc-chua-du',
    title: 'Hydration & Điện giải: Khi nào nước lọc thông thường là chưa đủ?',
    category: 'nutrition',
    excerpt: 'Tìm hiểu vai trò thiết yếu của Natri, Kali, Magiê đối với dẫn truyền xung thần kinh và cách bù nước hiệu quả cho người tập luyện thể thao.',
    author: 'TS. Dược học Hoàng Văn Nam',
    author_role: 'Chuyên gia Sinh hóa & Dinh dưỡng Thể thao',
    read_minutes: 5,
    tags: ['uong_nuoc', 'dien_giai', 'khoang_chat', 'hydration'],
    views: 2650,
    upvotes: 234,
    is_featured: false,
    is_published: true,
    published_at: '2026-10-21T13:45:00Z',
    created_at: '2026-10-21T13:45:00Z',
    updated_at: '2026-10-21T13:45:00Z',
    cover_image_url: null,
    key_takeaways: [
      'Chỉ cần cơ thể mất đi 2% lượng nước, khả năng tập trung tinh thần và hiệu suất vận động đã suy giảm tới 15%.',
      'Uống quá nhiều nước lọc tinh khiết khi đang đổ mồ hôi nhiều có thể gây hạ natri máu nguy hiểm (Hyponatremia).',
      'Các chất điện giải chính gồm Natri (giữ nước ngoại bào), Kali (duy trì áp suất nội bào) và Magiê (ngăn ngừa chuột rút).',
    ],
    body: `Nước chiếm tới 60% trọng lượng cơ thể người trưởng thành và 75% khối lượng cơ bắp. Tuy nhiên, việc bù nước không đơn giản chỉ là uống thật nhiều lít nước lọc mỗi ngày.

Khi bạn vận động mạnh dưới trời nóng hoặc tập cardio cường độ cao, cơ thể đào thải mồ hôi chứa lượng lớn khoáng chất điện giải. Nếu bạn chỉ liên tục nạp nước tinh khiết, nồng độ khoáng chất trong huyết tương sẽ bị pha loãng quá mức, dẫn đến hiện tượng chóng mặt, đau đầu, mệt mỏi và chuột rút cơ bắp.

Công thức nước điện giải tự nhiên tại nhà:
- 500ml nước lọc hoặc nước dừa tươi
- 1 nhúm nhỏ muối biển hồng Himalaya (cung cấp natri và vi khoáng)
- 1 thìa nước cốt chanh tươi (cung cấp kali và vitamin C)
- 1 thìa nhỏ mật ong nguyên chất (hỗ trợ hấp thu natri qua kênh đồng vận chuyển glucose ở ruột)`,
    action_tips: [
      'Bật tính năng nhắc nhở uống nước thông minh trên ứng dụng Healthy Check.',
      'Kiểm tra màu nước tiểu: Màu vàng rơm nhạt là dấu hiệu cơ thể đủ nước.',
      'Bổ sung gói điện giải hoặc nước dừa sau các buổi chạy ngoài trời trên 60 phút.',
    ],
  },
  {
    id: 'art-9',
    slug: 'lo-trinh-chay-bo-5km',
    title: 'Lộ trình 4 tuần tập chạy bộ từ 0 lên 5km an toàn cho người mới bắt đầu',
    category: 'running',
    excerpt: 'Phương pháp phối hợp xen kẽ đi bộ và chạy bước ngắn giúp hệ tim mạch và cơ xương khớp thích ứng dần dần, bảo vệ khớp gối và tăng sức bền tối ưu.',
    author: 'HLV Trần Hùng',
    author_role: 'Chủ nhiệm CLB Chạy bộ Bán chuyên Nghiệp Marathon Việt Nam',
    read_minutes: 6,
    tags: ['chay_bo', '5km', 'nguoi_moi', 'cardio'],
    views: 3890,
    upvotes: 342,
    is_featured: false,
    is_published: true,
    published_at: '2026-10-20T07:00:00Z',
    created_at: '2026-10-20T07:00:00Z',
    updated_at: '2026-10-20T07:00:00Z',
    cover_image_url: null,
    key_takeaways: [
      'Sai lầm lớn nhất của người mới là chạy quá nhanh ngay từ những mét đầu tiên dẫn đến đau ống đồng (Shin Splints) và bỏ cuộc.',
      'Phương pháp Run-Walk-Run xen kẽ 1 phút chạy chậm + 2 phút đi bộ giúp nhịp tim không bị tăng vọt.',
      'Đầu tư vào một đôi giày chạy bộ có độ đệm êm ái phù hợp với bàn chân là bước chuẩn bị quan trọng nhất.',
    ],
    body: `Chạy bộ là bộ môn thể thao tự nhiên và dễ tiếp cận nhất của con người. Nhưng khớp gối, gân Achilles và dây chằng của bạn cần thời gian thích nghi sinh học chậm hơn nhiều so với hệ tim mạch.

Lộ trình 4 tuần chuẩn khoa học:
- Tuần 1: Khởi động đi bộ 5 phút. Lặp lại 8 lần chu kỳ: Chạy nhẹ 1 phút + Đi bộ hồi phục 2 phút. (Tổng 30 phút).
- Tuần 2: Chạy 2 phút + Đi bộ 2 phút (Lặp lại 6 lần).
- Tuần 3: Chạy 3 phút + Đi bộ 1 phút (Lặp lại 6 lần).
- Tuần 4: Chạy liên tục 20-25 phút với tốc độ thả lỏng, bạn sẽ hoàn thành cự ly 5km đầu tiên trong đời một cách tự hào!`,
    action_tips: [
      'Duy trì guồng chân (Cadence) khoảng 165 - 175 bước mỗi phút.',
      'Khởi động kỹ các khớp cổ chân, đầu gối và hông trước mỗi buổi chạy.',
      'Dành ít nhất 1 ngày nghỉ ngơi hoàn toàn giữa các buổi chạy trong tuần.',
    ],
  },
  {
    id: 'art-10',
    slug: 'nghe-thuat-power-nap-20-phut',
    title: 'Nghệ thuật Power Nap: Cách chợp mắt 20 phút để tái nạp 100% năng lượng',
    category: 'sleep',
    excerpt: 'Khoa học về giấc ngủ ngắn buổi trưa đã được NASA ứng dụng giúp nâng cao độ tỉnh táo lên 54% và hiệu suất làm việc lên 34%.',
    author: 'ThS. BS. Nguyễn Lê Giang',
    author_role: 'Chuyên gia Thần kinh học & Hiệu suất Não bộ',
    read_minutes: 4,
    tags: ['power_nap', 'giac_ngu_trua', 'nang_luong', 'tap_trung'],
    views: 1920,
    upvotes: 178,
    is_featured: false,
    is_published: true,
    published_at: '2026-10-19T12:00:00Z',
    created_at: '2026-10-19T12:00:00Z',
    updated_at: '2026-10-19T12:00:00Z',
    cover_image_url: null,
    key_takeaways: [
      'Thời lượng lý tưởng của một giấc ngủ ngắn là đúng 20 - 25 phút để không bị rơi vào giấc ngủ sâu (N3).',
      'Nếu ngủ trưa quá 30 phút, bạn sẽ gặp hiện tượng "quán tính giấc ngủ" (Sleep Inertia), thức dậy lờ đờ và uể oải hơn.',
      'Mẹo "Coffee Nap": Uống 1 ngụm cà phê ngay trước khi chợp mắt; caffeine sẽ phát huy tác dụng đúng lúc bạn thức dậy sau 20 phút.',
    ],
    body: `Sau khi ăn trưa, theo nhịp sinh học tự nhiên, nhiệt độ cơ thể giảm nhẹ cùng sự tích tụ chất adenosine trong não bộ tạo ra một cơn buồn ngủ sinh lý (cơn chùng trưa - Post-lunch dip).

Thay vì uống thêm nhiều cốc cà phê đặc để chống lại cơn buồn ngủ, một giấc ngủ ngắn 20 phút là liều thuốc tăng cường sinh lực tuyệt vời:
- Dọn dẹp một phần chất ức chế adenosine trong các thụ thể thần kinh.
- Làm dịu hệ tim mạch, hạ huyết áp tạm thời.
- Phục hồi khả năng phản xạ và tinh thần tập trung cao độ cho ca làm việc buổi chiều.`,
    action_tips: [
      'Đặt báo thức chính xác 25 phút (tính cả 5 phút thời gian chìm vào giấc ngủ).',
      'Sử dụng bịt mắt và nút tai chống ồn nếu ngủ tại văn phòng.',
      'Thời điểm ngủ trưa tốt nhất là trong khoảng từ 12h30 đến 13h30.',
    ],
  },
  {
    id: 'art-11',
    slug: 'dopamine-detox-lay-lai-su-tap-trung',
    title: 'Dopamine Detox: Lấy lại khả năng tập trung sâu trong kỷ nguyên số',
    category: 'mental_health',
    excerpt: 'Cách thiết lập lại thụ thể dopamine trong não bộ để thoát khỏi chứng nghiện lướt mạng xã hội vô thức và lấy lại cảm hứng làm việc thực sự.',
    author: 'TS. Tâm lý Vũ Tuấn Anh',
    author_role: 'Nghiên cứu viên Hành vi & Khoa học Nhận thức',
    read_minutes: 7,
    tags: ['dopamine', 'tap_trung', 'cai_nghien_so', 'suc_khoe_tinh_than'],
    views: 2840,
    upvotes: 275,
    is_featured: false,
    is_published: true,
    published_at: '2026-10-18T15:20:00Z',
    created_at: '2026-10-18T15:20:00Z',
    updated_at: '2026-10-18T15:20:00Z',
    cover_image_url: null,
    key_takeaways: [
      'Dopamine không phải là phân tử của niềm vui sướng; nó là phân tử của "sự khao khát và tìm kiếm phần thưởng".',
      'Các thông báo điện thoại, video ngắn TikTok/Reels tạo ra phần thưởng biến thiên bất định khiến não tiết dopamine liên tục, làm trơ thụ thể.',
      'Detox dopamine giúp đưa ngưỡng kích thích của não về mức bình thường, giúp những công việc như đọc sách, làm việc sâu trở nên hấp dẫn trở lại.',
    ],
    body: `Bạn có bao giờ cảm thấy không thể ngồi yên đọc sách quá 5 phút mà không với tay lấy chiếc điện thoại? Đó là vì hệ thống tưởng thưởng của não bạn đã bị bão hòa bởi các kích thích dopamine siêu tự nhiên (Supernormal Stimuli).

Khi dopamine bị kích thích liên tục ở cường độ cao, não bộ sẽ tự vệ bằng cách giảm số lượng thụ thể D2. Hậu quả là những niềm vui bình dị như đi dạo, trò chuyện hay nấu ăn đều trở nên nhàm chán.

Kế hoạch tái lập trạng thái não bộ trong 3 bước:
1. Tạo rào cản ma sát: Xóa các ứng dụng gây nghiện trên điện thoại hoặc chuyển màn hình sang chế độ đen trắng (Grayscale).
2. Quy tắc 1 giờ đầu ngày và 1 giờ cuối ngày không màn hình điện tử.
3. Thay thế kích thích nhanh bằng hoạt động tĩnh lặng: Đi dạo thiên nhiên không đeo tai nghe, thiền định hoặc viết nhật ký cảm xúc.`,
    action_tips: [
      'Tắt toàn bộ thông báo không khẩn cấp từ các ứng dụng mạng xã hội.',
      'Dành ra mỗi tuần 1 ngày "Digital Sabbath" - hoàn toàn không dùng mạng xã hội.',
      'Áp dụng phương pháp Pomodoro 25 phút làm việc tập trung sâu không chạm vào điện thoại.',
    ],
  },
  {
    id: 'art-12',
    slug: 'thoi-quen-gian-co-10-phut-chong-doms',
    title: 'Thói quen giãn cơ phục hồi 10 phút sau tập luyện chống đau mỏi cơ (DOMS)',
    category: 'sports',
    excerpt: 'Bài tập kéo giãn cơ tĩnh (Static Stretching) kết hợp con lăn bọt Foam Roller giúp lưu thông máu, giải phóng axit lactic và ngừa chấn thương.',
    author: 'HLV. Bác sĩ Trị liệu Lê Hải',
    author_role: 'Chuyên gia Phục hồi Chức năng Thể thao',
    read_minutes: 5,
    tags: ['gian_co', 'phuc_hoi', 'doms', 'chong_chan_thuong'],
    views: 1680,
    upvotes: 142,
    is_featured: false,
    is_published: true,
    published_at: '2026-10-17T17:00:00Z',
    created_at: '2026-10-17T17:00:00Z',
    updated_at: '2026-10-17T17:00:00Z',
    cover_image_url: null,
    key_takeaways: [
      'Hiện tượng đau nhức cơ bắp khởi phát muộn (DOMS) thường đạt đỉnh sau 24 - 48 giờ sau khi tập các động tác hạ tạ (eccentric).',
      'Giãn cơ tĩnh chỉ nên thực hiện SAU khi tập lúc cơ bắp đã ấm nóng, không thực hiện trước khi nâng tạ nặng.',
      'Sử dụng con lăn bọt Foam Roller giúp giải phóng màng cơ (Myofascial Release), khôi phục độ đàn hồi của sợi cơ.',
    ],
    body: `Nhiều người kết thúc hiệp tập cuối cùng là vội vã ra về ngay mà bỏ qua 10 phút hồi phục then chốt. Việc bỏ qua bước làm nguội (Cool-down) khiến máu bị ứ đọng ở các chi, làm giảm tốc độ thanh lọc độc tố tế bào.

Chuỗi 5 động tác giãn cơ vàng sau tập:
1. Giãn cơ đùi trước (Quad Stretch): Đứng một chân, kéo gót chân chạm mông giữ 30 giây mỗi bên.
2. Giãn gân kheo (Hamstring Stretch): Ngồi duỗi thẳng chân, với tay chạm mũi chân giữ lưng thẳng.
3. Tư thế chim bồ câu (Pigeon Pose): Kéo giãn sâu nhóm cơ mông và cơ hình lê, giải tỏa áp lực dây thần kinh tọa.
4. Giãn cơ ngực và vai qua khung cửa: Mở rộng lồng ngực, đảo ngược tư thế khom lưng của dân văn phòng.
5. Tư thế đứa trẻ (Child's Pose): Kéo giãn toàn bộ cột sống thắt lưng và làm dịu nhịp tim.`,
    action_tips: [
      'Dành đúng 10 phút ngay sau khi tập xong để giãn cơ.',
      'Hít thở sâu và đều đặn trong suốt quá trình giữ động tác, không nhịn thở.',
      'Tắm nước ấm hoặc ngâm bồn với muối Epsom giàu magiê để tăng tốc độ hồi phục.',
    ],
  },
];

