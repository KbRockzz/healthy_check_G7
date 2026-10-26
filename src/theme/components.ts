import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS } from './tokens';

export const styles = {
  // Button
  buttonPrimary: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.md,
  },
  buttonSecondary: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: BORDER_RADIUS.lg,
  },

  // Card
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: 16,
    ...SHADOWS.sm,
  },

  // Input
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.bg,
  },

  // Text
  heading: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: 'bold' as const,
    color: COLORS.textPrimary,
  },
  body: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  caption: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
  },
} as const;
