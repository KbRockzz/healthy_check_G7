/**
 * Parse bài viết body (markdown-lite) thành các block để render.
 *
 * Hỗ trợ:
 *  - `#`–`######` → tiêu đề (strip dấu #)
 *  - dòng `1. Tiêu đề` (dưới 70 ký tự, không kết thúc bằng `. : ; ,`) → tiêu đề
 *  - dòng đơn ngắn (< 60 ký tự, không có `.` và `:`) → tiêu đề
 *  - `- `, `* `, `•` → bullet
 *  - `**đậm**` → chữ đậm (parse inline)
 *  - blockquote `> ` → strip dấu `>`
 *
 * Trong một đoạn, nối các dòng bằng `\n` (KHÔNG nối bằng khoảng trắng)
 * để giữ ngắt dòng như bản gốc.
 */
export type ArticleBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'bullet'; text: string }
  | { kind: 'paragraph'; lines: string[] };

/** Dòng markdown ATX: `#`, `##`, ..., `######` */
function isAtxHeading(line: string): boolean {
  return /^#{1,6}\s+/.test(line.trim());
}

/** Dòng đánh số: `1. Tiêu đề` */
function isNumberedHeading(line: string): boolean {
  const t = line.trim();
  if (!/^\d+\.\s+/.test(t)) return false;
  if (t.length >= 70) return false;
  if (/[.:;,]$/.test(t)) return false;
  return true;
}

/** Dòng đơn ngắn, không có `.` và `:` → tiêu đề (quy tắc cũ). */
function isShortHeading(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (t.length >= 60) return false;
  if (t.includes('.') || t.includes(':')) return false;
  return true;
}

function isHeadingLine(line: string): boolean {
  return (
    isAtxHeading(line) ||
    isNumberedHeading(line) ||
    isShortHeading(line)
  );
}

/** Strip dấu `#` ở heading ATX. */
function stripAtx(line: string): string {
  return line.trim().replace(/^#{1,6}\s+/, '');
}

/** Strip dấu bullet ở đầu dòng. */
function stripBullet(line: string): string {
  return line.trim().replace(/^[-*•]\s+/, '');
}

/** Strip dấu blockquote `> `. */
function stripBlockquote(line: string): string {
  return line.trim().replace(/^>\s?/, '');
}

/** true nếu dòng là bullet. */
function isBulletLine(line: string): boolean {
  return /^[-*•]\s+/.test(line.trim());
}

/**
 * Parse body → mảng block. Block headings/bullets là text đã strip marker;
 * paragraph là mảng dòng (giữ nguyên, chỉ strip blockquote).
 */
export function parseBody(body: string): ArticleBlock[] {
  if (!body) return [];

  // Chia thành các đoạn bằng \n\n, giữ thứ tự.
  const groups = body.split(/\n\n/);
  const blocks: ArticleBlock[] = [];

  for (const group of groups) {
    const rawLines = group.split('\n');
    const lines: string[] = [];
    for (const l of rawLines) {
      const t = l.trim();
      if (!t) continue;
      // Blockquote: strip `> ` nhưng vẫn giữ là một dòng.
      lines.push(stripBlockquote(l));
    }
    if (lines.length === 0) continue;

    let i = 0;
    // Dòng đầu có thể là heading.
    if (isHeadingLine(lines[0])) {
      blocks.push({ kind: 'heading', text: stripAtx(lines[0]) });
      i = 1;
    }

    while (i < lines.length) {
      if (isBulletLine(lines[i])) {
        // Nhóm các bullet liên tiếp.
        const bullets: string[] = [];
        while (i < lines.length && isBulletLine(lines[i])) {
          bullets.push(stripBullet(lines[i]));
          i++;
        } 
        for (const b of bullets) {
          blocks.push({ kind: 'bullet', text: b });
        }
      } else if (isHeadingLine(lines[i])) {
        blocks.push({ kind: 'heading', text: stripAtx(lines[i]) });
        i++;
      } else {
        // Paragraph: nối các dòng không phải bullet cho đến khi gặp bullet/heading.
        const paraLines: string[] = [];
        while (i < lines.length && !isBulletLine(lines[i]) && !isHeadingLine(lines[i])) {
          paraLines.push(lines[i].trim());
          i++;
        }
        if (paraLines.length > 0) {
          blocks.push({ kind: 'paragraph', lines: paraLines });
        }
      }
    }
  }

  return blocks;
}