/**
 * Explore — constants shared by the explore list and article-detail screens.
 *
 * Dùng thay vì duplicate `getCategoryColor()` / `getCategoryLabel()` inline
 * trong hai màn hình. Các giá trị này phải KHỚP với lược đồ:
 *   - enum `content_category` ở migration 0001 (7 giá trị)
 *   - `ContentCategory` type ở `@/lib/supabase`
 *
 * Nếu enum thêm giá trị mới (ví dụ 'lifestyle' đã có từ đầu nhưng chưa có tab),
 * chỉ cần cập nhật TRONG ĐÂY — hai màn hình tự động đồng bộ.
 */

import { COLORS } from '@/theme';
import type { ContentCategory } from '@/lib/supabase';

/** Danh mục bài viết — phải trùng tên enum `content_category` trong DB. */
export const CATEGORIES: readonly ContentCategory[] = [
  'nutrition',
  'sports',
  'running',
  'sleep',
  'mental_health',
  'womens_health',
  'lifestyle',
];

/** Key enum category + key UI 'saved' (không phải enum DB). */
type CategoryKey = ContentCategory | 'saved';

/** Màu nhận diện từng danh mục (thiết kế SDS 3.7). */
export const CATEGORY_COLORS: Record<CategoryKey, string> = {
  saved: COLORS.primary,
  nutrition: '#D97706',
  sports: '#10B981',
  running: '#0284C7',
  sleep: '#8B5CF6',
  mental_health: '#3B82F6',
  womens_health: '#DB2777',
  lifestyle: '#059669',
};

/** Nhãn tiếng Việt hiển thị UI — key phải trùng enum `content_category`. */
export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  saved: 'Đã lưu',
  nutrition: 'Dinh dưỡng',
  sports: 'Thể thao',
  running: 'Chạy bộ',
  sleep: 'Giấc ngủ',
  mental_health: 'Tâm lý',
  womens_health: 'Sức khỏe nữ',
  lifestyle: 'Lối sống',
};

/** Icon tab danh mục trên thanh category chips. */
export const CATEGORY_ICONS: Record<CategoryKey, string> = {
  saved: 'bookmark-outline',
  nutrition: 'restaurant-outline',
  sports: 'barbell-outline',
  running: 'walk-outline',
  sleep: 'moon-outline',
  mental_health: 'leaf-outline',
  womens_health: 'rose-outline',
  lifestyle: 'radio-outline',
};

/** Domain dùng cho nút chia sẻ — thay vì hardcode `healthycheck.io`. */
export const SHARE_DOMAIN = 'https://healthycheck.io';

/** Dòng chữ kiểm định y khoa hiển thị trên card tác giả. */
export const VERIFIED_STAMP = 'Đã kiểm định y khoa bởi Hội đồng Bác sĩ G7';

/** Nhãn thống kê nhanh trên header — text không cần sync DB, nhưng tập trung ở đây. */
export const EXPLORE_STATS = [
  {
    icon: 'book-outline' as const,
    text: 'Bài viết chuyên sâu',
    color: COLORS.primary,
    textColor: undefined,
  },
  {
    icon: 'shield-checkmark-outline' as const,
    text: '100% kiểm duyệt y khoa',
    color: '#10B981',
    textColor: '#047857',
  },
] as const;

export function getCategoryColor(cat: string): string {
  return CATEGORY_COLORS[cat as ContentCategory] ?? '#0284C7';
}

export function getCategoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat as ContentCategory] ?? cat;
}