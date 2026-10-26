/**
 * Theme tokens — Bảng màu và typography chuẩn theo SDS 3.7
 */

// Brand color chính (Cyan Blue #0EA5E9)
export const COLORS = {
  primary: '#0EA5E9',       // Xanh ngọc thương hiệu
  secondary: '#06B6D4',     // Cyan nhạt hơn
  accent: '#F43F5E',        // Hồng đào — chu kỳ kinh nguyệt
  warning: '#F59E0B',       // Cam hổ phách — cảnh báo dinh dưỡng
  success: '#10B981',       // Xanh lục — vận động/giấc ngủ đạt chuẩn
  danger: '#EF4444',        // Đỏ — lỗi/alert

  // Neutrals (Slate Navy #0F172A family)
  bg: '#FFFFFF',            // Nền trắng
  surface: '#F8FAFC',       // Surface nhạt
  card: '#FFFFFF',          // Card nền
  border: '#E2E8F0',        // Viền card

  // Typography
  textPrimary: '#0F172A',   // Chữ chính
  textSecondary: '#64748B', // Chữ phụ
  textTertiary: '#94A3B8',  // Chữ mờ
  textInverse: '#FFFFFF',   // Chữ trên nền tối

  // Functional
  disabled: '#CBD5E1',      // Trạng thái disabled
  overlay: 'rgba(15, 23, 42, 0.5)', // Overlay mờ
} as const;

// Typography scale
export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

// Border radius
export const BORDER_RADIUS = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

// Shadows
export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;
