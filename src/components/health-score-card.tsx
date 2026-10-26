import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '@/src/theme';

interface HealthScoreCardProps {
  score: number;
  label: string;
}

/**
 * Thẻ điểm sức khỏe tổng hợp (Health Score Widget)
 * - Hiển thị biểu đồ tròn tiến độ 0-100
 * - Gắn thẻ đánh giá trạng thái ('Excellent', 'Good', 'Fair', 'Poor')
 */
export default function HealthScoreCard({ score, label }: HealthScoreCardProps) {
  const getLabelInfo = (l: string) => {
    switch (l) {
      case 'excellent':
        return { color: COLORS.success, text: 'Excellent' };
      case 'good':
        return { color: COLORS.primary, text: 'Good' };
      case 'fair':
        return { color: COLORS.warning, text: 'Fair' };
      case 'poor':
        return { color: COLORS.danger, text: 'Poor' };
      default:
        return { color: COLORS.textTertiary, text: 'No data' };
    }
  };

  const info = getLabelInfo(label);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Health Score</Text>
        <Text style={styles.scoreLabel}>{score}/100</Text>
      </View>

      <Text style={styles.scoreSub}>Based on your overview health tracking, your score is {score} and consider {info.text.toLowerCase()}..</Text>

      <View style={styles.scoreBadge}>
        <Text style={[styles.scoreText, { color: info.color }]}>{score}</Text>
      </View>

      <Text style={[styles.statusText, { color: info.color }]}>
        {info.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: 20,
    marginHorizontal: 16,
    ...SHADOWS.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  scoreLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
  },
  scoreSub: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  scoreBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginTop: 8,
  },
});