/**
 * Lớp dữ liệu Explore — giao tiếp Supabase (health_content, content_votes,
 * content_bookmarks) và hợp nhất với kho bài local HEALTH_ARTICLES.
 *
 * Quy ước id:
 *  - uuid           → bài có trên server, gọi được RPC / FK.
 *  - khác uuid      → bài chỉ có trong app (art-1...), không gọi RPC được.
 */
import { supabase } from '@/lib/supabase';
import { HEALTH_ARTICLES, DetailedArticle } from '@/data/health-articles';
import type { ContentCategory } from '@/lib/supabase';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** true nếu id là uuid → bài nằm trên server. */
export function isServerId(id: string): boolean {
  return UUID_RE.test(id);
}

interface HealthContentRow {
  id: string;
  slug: string;
  category: ContentCategory;
  title: string;
  excerpt: string;
  body: string;
  cover_image_url: string | null;
  author: string;
  author_role?: string | null;
  read_minutes: number;
  tags: string[] | null;
  key_takeaways?: unknown;
  quote?: unknown;
  action_tips?: unknown;
  is_published: boolean;
  is_featured: boolean;
  upvotes: number;
  views: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  return [];
}

function toQuote(v: unknown): DetailedArticle['quote'] {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    if (typeof o.text === 'string' && typeof o.author === 'string') {
      return { text: o.text, author: o.author };
    }
  }
  return undefined;
}

/** Map một dòng health_content → DetailedArticle, lấp trường rỗng từ bài local cùng slug. */
function rowToArticle(row: HealthContentRow): DetailedArticle {
  const local = HEALTH_ARTICLES.find(a => a.slug === row.slug);
  const keyTakeaways = toStringArray(row.key_takeaways);
  const actionTips = toStringArray(row.action_tips);
  const quote = toQuote(row.quote);
  return {
    id: row.id,
    slug: row.slug,
    category: row.category,
    title: row.title,
    excerpt: row.excerpt ?? '',
    body: row.body ?? '',
    cover_image_url: row.cover_image_url ?? null,
    author: row.author ?? 'Healthy Check',
    author_role: row.author_role || local?.author_role || '',
    read_minutes: row.read_minutes ?? local?.read_minutes ?? 4,
    tags: row.tags && row.tags.length > 0 ? row.tags : local?.tags ?? [],
    is_published: row.is_published,
    is_featured: row.is_featured,
    upvotes: row.upvotes ?? 0,
    views: row.views ?? 0,
    published_at: row.published_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    key_takeaways: keyTakeaways.length > 0 ? keyTakeaways : local?.key_takeaways ?? [],
    quote: quote ?? local?.quote,
    action_tips: actionTips.length > 0 ? actionTips : local?.action_tips ?? [],
  };
}

export interface FetchArticlesResult {
  articles: DetailedArticle[];
  /** false khi lỗi mạng / không đọc được server — chỉ có bài local. */
  fromServer: boolean;
}

/**
 * Lấy danh sách bài đã publish từ server, sắp xếp published_at giảm dần,
 * nối thêm các bài local chưa có trên server. Lỗi mạng → trả về toàn bộ local.
 */
export async function fetchArticles(): Promise<FetchArticlesResult> {
  try {
    const { data, error } = await supabase
      .from('health_content')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false });

    if (error || !data) throw error ?? new Error('No data');

    const rows = data as HealthContentRow[];
    const serverArticles = rows.map(rowToArticle);
    const serverSlugs = new Set(serverArticles.map(a => a.slug));
    const localOnly = HEALTH_ARTICLES.filter(a => !serverSlugs.has(a.slug));
    return { articles: [...serverArticles, ...localOnly], fromServer: true };
  } catch {
    return { articles: HEALTH_ARTICLES, fromServer: false };
  }
}

/**
 * Danh sách content_id user đã thích. BẮT BUỘC lọc .eq('user_id', ...)
 * vì policy select của content_votes cho phép đọc mọi dòng.
 */
export async function fetchMyVotedIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('content_votes')
    .select('content_id')
    .eq('user_id', userId)
    .eq('voted', true);
  if (error || !data) return [];
  return data.map(r => (r as { content_id: string }).content_id);
}

/** Danh sách content_id user đã lưu (bookmark). */
export async function fetchMyBookmarkIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('content_bookmarks')
    .select('content_id')
    .eq('user_id', userId);
  if (error || !data) return [];
  return data.map(r => (r as { content_id: string }).content_id);
}

/**
 * Thích / bỏ thích qua RPC vote_article. Ném lỗi nếu thất bại để hook
 * hoàn tác optimistic update. Trả về số lượt thích hiện tại trên server.
 */
export async function setVote(contentId: string, liked: boolean): Promise<number> {
  const { data, error } = await supabase.rpc('vote_article', {
    p_content: contentId,
    p_vote: liked,
  });
  if (error) throw error;
  return typeof data === 'number' ? data : NaN;
}

/** Lưu / bỏ lưu bookmark. Upsert ignoreDuplicates khi thêm, delete khi bỏ. */
export async function setBookmark(contentId: string, userId: string, saved: boolean): Promise<void> {
  if (saved) {
    const { error } = await supabase
      .from('content_bookmarks')
      .upsert(
        { content_id: contentId, user_id: userId },
        { onConflict: 'content_id,user_id', ignoreDuplicates: true }
      );
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('content_bookmarks')
      .delete()
      .eq('content_id', contentId)
      .eq('user_id', userId);
    if (error) throw error;
  }
}

/** Ghi nhận lượt xem — fire-and-forget, nuốt lỗi, không chặn UI. */
export function registerView(contentId: string): void {
  if (!isServerId(contentId)) return;
  supabase.rpc('register_content_view', { p_content: contentId }).then(({ error }) => {
    if (error) {
      // Không chặn UI: chỉ log nhẹ.
      console.warn('register_content_view failed:', error.message);
    }
  });
}