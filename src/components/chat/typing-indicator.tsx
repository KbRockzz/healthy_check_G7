/**
 * Chỉ báo "đang trả lời" — 3 chấm nảy nhẹ + nhãn trạng thái (tool event).
 * Không dùng thư viện native: animate bằng InteractionManager-free trick đơn giản.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';
import { COLORS, FONT_SIZES, BORDER_RADIUS, FONT_FAMILY } from '../../theme';

interface Props {
  label?: string | null; // ví dụ "Đang xem dữ liệu của bạn…"
}

function Dot({ delay }: { delay: number }) {
  // Không truy cập `.current` trong render — dùng ref object, resolve trong effect.
  const animRef = useRef<Animated.Value | null>(null);
  if (!animRef.current) animRef.current = new Animated.Value(0);
  const v = animRef.current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
          delay,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v, delay]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }],
        },
      ]}
    />
  );
}

export function TypingIndicator({ label }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.bubble}>
        <Dot delay={0} />
        <Dot delay={150} />
        <Dot delay={300} />
      </View>
      <Text style={styles.label}>{label ?? 'Health Coach đang soạn câu trả lời…'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary,
  },
  label: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONT_FAMILY.base,
    color: COLORS.textTertiary,
  },
});