import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '@/theme';

interface MetricWidgetProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  iconColor: string;
  onPress?: () => void;
}

/**
 * Widget tóm tắt chỉ số (Steps, Sleep, Nutrition, Cycle)
 * - 4 widget trên Overview
 */
export default function MetricWidget({
  title,
  value,
  subtitle,
  icon,
  iconColor,
  onPress,
}: MetricWidgetProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={icon as any} size={24} color={iconColor} />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: 16,
    width: '47%',
    ...SHADOWS.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  value: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
});