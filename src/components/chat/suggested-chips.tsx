/**
 * Chip gợi ý câu hỏi nhanh (§6.4): tập tĩnh + tập động từ DashboardSummary.
 * Tối đa 4 chip, ẩn khi cuộc trò chuyện đã có tin nhắn.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { COLORS, FONT_SIZES, BORDER_RADIUS, FONT_FAMILY } from '../../theme';

interface Props {
  /** true khi cuộc trò chuyện đã có tin nhắn → ẩn chip */
  hidden: boolean;
  onSelect: (text: string) => void;
  /** Các hint động tính từ dữ liệu dashboard (client-side, không gọi LLM) */
  dynamicPrompts?: string[];
}

const STATIC_PROMPTS = [
  'Hôm nay tôi đã đạt mục tiêu chưa?',
  'Giấc ngủ tuần này của tôi thế nào?',
  'Tôi nên ăn gì để đủ calo hôm nay?',
  'Tôi uống đủ nước chưa?',
];

/**
 * Tạo prompt động từ trạng thái dashboard (§6.4):
 *  - bước < 50% mục tiêu → "Làm sao để đạt đủ bước hôm nay?"
 *  - ngủ < mục tiêu → "Vì sao tôi nên ngủ đủ giấc?"
 * Caller truyền vào max 4 kết quả.
 */
export function buildDynamicPrompts(opts: {
  stepsPct: number; // 0..1+
  sleepBelowGoal: boolean;
  cycleEnabled: boolean;
}): string[] {
  const out: string[] = [];
  if (opts.stepsPct < 0.5) out.push('Làm sao để tôi đi đủ 10.000 bước hôm nay?');
  if (opts.sleepBelowGoal) out.push('Vì sao tôi nên ngủ đủ giấc?');
  if (opts.cycleEnabled) out.push('Chu kỳ của tôi đang ở giai đoạn nào?');
  return out;
}

export function SuggestedChips({ hidden, onSelect, dynamicPrompts }: Props) {
  if (hidden) return null;

  // Ưu tiên chip động, bổ sung bằng chip tĩnh — tối đa 4 (§6.4)
  const chips = [...(dynamicPrompts ?? []), ...STATIC_PROMPTS].slice(0, 4);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {chips.map((c) => (
        <TouchableOpacity
          key={c}
          style={styles.chip}
          onPress={() => onSelect(c)}
          activeOpacity={0.75}
        >
          <Text style={styles.chipText} numberOfLines={2}>
            {c}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxWidth: 240,
  },
  chipText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONT_FAMILY.medium,
    color: COLORS.primary,
  },
});