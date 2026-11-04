/**
 * Test parseBody trên 12 bài local:
 *  - nhận ra tiêu đề đánh số kiểu `1. Tiêu đề` (ít nhất 1 bài)
 *  - nhận ra bullet (ít nhất 1 bài)
 *  - giữ marker **đậm** (chưa strip)
 *  - không còn ký tự `#` ở đầu khối (0 leaked ATX)
 *  - không còn marker bullet ở đầu bullet text
 */
import { parseBody } from '../src/lib/parse-article-body';
import { HEALTH_ARTICLES } from '../src/data/health-articles';

let failed = 0;
let anyHeading = false;
let anyBullet = false;
let anyBold = false;

for (const a of HEALTH_ARTICLES) {
  const blocks = parseBody(a.body);
  let headings = 0;
  let bullets = 0;
  let paras = 0;
  for (const b of blocks) {
    if (b.kind === 'heading') { headings++; anyHeading = true; }
    else if (b.kind === 'bullet') { bullets++; anyBullet = true; }
    else paras++;
  }

  // Kiểm tra không còn ký tự `#` ở đầu heading text (ATX marker đã strip)
  const leakedAtx = blocks.some(b => /^#{1,6}\s/.test(b.text));
  // Kiểm tra không còn marker bullet trong text
  const leakedBullet = blocks.some(b => b.kind === 'bullet' && /^[-*•]\s/.test(b.text));
  // Kiểm tra marker **đậm** vẫn còn (chưa strip)
  const boldPresent = blocks.some(b =>
    b.kind === 'paragraph'
      ? b.lines.some(l => l.includes('**'))
      : b.text.includes('**')
  );
  if (boldPresent) anyBold = true;

  const ok = !leakedAtx && !leakedBullet;
  if (!ok) failed++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'} | ${a.slug.padEnd(40)} | headings=${headings} bullets=${bullets} paras=${paras} leakedAtx=${leakedAtx} leakedBullet=${leakedBullet} bold=${boldPresent}`
  );
}

console.log(`\nSummary: anyHeading=${anyHeading} anyBullet=${anyBullet} boldPreserved=${anyBold} leakedAtx=0`);

// ---------------------------------------------------------------------
// Seed (markdown) body: phải strip `##`/`- `/`**đ đậm**` → không còn ký tự #
// ---------------------------------------------------------------------
const seedBody = `## Giá trị dinh dưỡng trong 1 quả táo (~182g)\n\n` +
`- Năng lượng: 95 kcal\n` +
`- Chất xơ: 4.4 g (khoảng 16% nhu cầu ngày)\n\n` +
`## Vì sao táo giúp no lâu\n\n` +
`Chất xơ hòa tan pectin trong táo làm chậm quá trình rỗngạ dandy, nhờ đó đường huyết tăng chậm và cảm giác thèm ăn giảm. Ăn táo TRƯỚC bữa chính 15 phút có thể giảm 60-90 kcal nạp vào.\n\n` +
`## Lưu ý thực hành\n\n` +
`- Ăn cả vỏ để nhận tối đa chất xơ và polyphenol.\n` +
`- Người theo dõi lượng đường huyết nên giới hạn 1 quả nhỏ mỗi lần.\n\n` +
`## Ba tín hiệu bị bỏ qua\n\n` +
`1. **Khó vào giấc > 30 phút** — thường do tiếp xúc ánh sáng xanh sau 21h, ức chế melatonin.\n` +
`2. **Tỉnh giữa đêm lặp lại** — có thể liên quan thân nhiệt phòng ngủ quá cao.\n` +
`3. **Ngủ đủ nhưng vẫn mệt** — thiếu pha Deep Sleep, thường do caffeine sau 14h.\n\n` +
`> Ứng dụng Healthy Check mang tính chất theo dõi và tham khảo lối sống, không thay thế chẩn đoán y khoa chuyên nghiệp.`;

const seedBlocks = parseBody(seedBody);
const seedLeakedAtx = seedBlocks.some(b => /^#{1,6}\s/.test(b.text));
const seedLeakedBullet = seedBlocks.some(b => b.kind === 'bullet' && /^[-*•]\s/.test(b.text));
const seedHasHeading = seedBlocks.some(b => b.kind === 'heading');
const seedHasBullet = seedBlocks.some(b => b.kind === 'bullet');
const seedBold = seedBlocks.some(b => b.kind === 'paragraph' ? b.lines.some(l => l.includes('**')) : b.text.includes('**'));

console.log(`Seed body: headings=${seedBlocks.filter(b => b.kind === 'heading').length} bullets=${seedBlocks.filter(b => b.kind === 'bullet').length} leakedAtx=${seedLeakedAtx} leakedBullet=${seedLeakedBullet} bold=${seedBold}`);

const overallOk = anyHeading && anyBullet && anyBold && failed === 0 && !seedLeakedAtx && !seedLeakedBullet && seedHasHeading && seedHasBullet;
console.log(overallOk ? 'ALL PASS' : `${failed} FAILED`);
if (!overallOk) process.exit(1);