/**
 * Seed generator: HEALTH_ARTICLES (12 bài local) → SQL insert on conflict (slug) do update.
 *
 * Dùng dollar-quoting ($hc$...$hc$) cho mọi chuỗi để tránh escape backslash.
 * tags là array[...]::text[]; các trường jsonb dùng JSON.stringify(...)::jsonb.
 *
 * Khi trùng slug chỉ cập nhật nội dung; KHÔNG ghi overwrite views/upvotes.
 *
 * Cách dùng:
 *   npx tsx scripts/gen-seed-articles.ts > supabase/migrations/0010_seed_local_articles.sql
 */
import { HEALTH_ARTICLES } from '../src/data/health-articles';

// Dollar-quote helper: chọn tag không xuất hiện trong text.
function dq(text: string): string {
  const tag = 'hc';
  return `$${tag}$${text}$${tag}$`;
}

function sqlStr(text: string | null | undefined): string {
  if (text == null) return 'null';
  return dq(text);
}

function sqlJson(value: unknown): string {
  return `${dq(JSON.stringify(value))}::jsonb`;
}

function sqlArray(arr: string[]): string {
  const items = arr.map(t => dq(t)).join(', ');
  return `array[${items}]::text[]`;
}

const lines: string[] = [];
lines.push('-- =====================================================================');
lines.push('-- Healthy Check (G7) — Migration 0010: SEED 12 BÀI LOCAL VÀO health_content');
lines.push('-- =====================================================================');
lines.push('-- Tạo bởi scripts/gen-seed-articles.ts. Idempotent: on conflict (slug)');
lines.push('-- chỉ cập nhật nội dung, KHÔNG reset views/upvotes.');
lines.push('-- =====================================================================');
lines.push('');
lines.push('insert into public.health_content');
lines.push('  (slug, category, title, excerpt, body, cover_image_url, author,');
lines.push('   author_role, read_minutes, tags, key_takeaways, quote, action_tips,');
lines.push('   is_published, is_featured, published_at)');
lines.push('values');

const rows: string[] = [];
for (const a of HEALTH_ARTICLES) {
  const row = `  (
    ${dq(a.slug)},
    ${dq(a.category)},
    ${dq(a.title)},
    ${dq(a.excerpt)},
    ${dq(a.body)},
    ${sqlStr(a.cover_image_url)},
    ${dq(a.author)},
    ${dq(a.author_role)},
    ${a.read_minutes},
    ${sqlArray(a.tags)},
    ${sqlJson(a.key_takeaways)},
    ${a.quote ? sqlJson(a.quote) : 'null'},
    ${sqlJson(a.action_tips)},
    ${a.is_published ? 'true' : 'false'},
    ${a.is_featured ? 'true' : 'false'},
    ${dq(a.published_at ?? '')}
  )`;
  rows.push(row);
}

lines.push(rows.join(',\n'));
lines.push('on conflict (slug) do update set');
lines.push('  title = excluded.title,');
lines.push('  excerpt = excluded.excerpt,');
lines.push('  body = excluded.body,');
lines.push('  author = excluded.author,');
lines.push('  author_role = excluded.author_role,');
lines.push('  read_minutes = excluded.read_minutes,');
lines.push('  tags = excluded.tags,');
lines.push('  key_takeaways = excluded.key_takeaways,');
lines.push('  quote = excluded.quote,');
lines.push('  action_tips = excluded.action_tips,');
lines.push('  is_published = excluded.is_published,');
lines.push('  is_featured = excluded.is_featured,');
lines.push('  updated_at = now();');
lines.push('');

process.stdout.write(lines.join('\n'));