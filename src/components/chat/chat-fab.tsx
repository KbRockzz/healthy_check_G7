/**
 * Floating Action Button vào Health Coach (§6.3).
 * Hiển thị ở các màn chính: Dashboard, Health Data, Explore, Sharing.
 * Ẩn ở: /launch, /auth/*, /onboarding, /chat (§6.3).
 * Vị trí: bottom-right, cao hơn BottomTabBar (64) + safe area.
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useSegments } from 'expo-router';
import { COLORS, BORDER_RADIUS, SHADOWS } from '@/theme';

/** Các route chính hiện FAB; ẩn ở các route này (§6.3) */
const HIDDEN_FIRST_SEGMENTS = new Set(['launch', 'auth', 'onboarding', 'chat']);

export function ChatFAB() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  const first = segments[0] ?? '';
  if (HIDDEN_FIRST_SEGMENTS.has(first)) return null;

  return (
    <View
      style={[styles.fabWrap, { bottom: insets.bottom + 64 + 16 }]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={[styles.fab, SHADOWS.lg]}
        onPress={() => router.push('/chat')}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Mở Health Coach"
      >
        <Ionicons name="chatbubble-ellipses" size={24} color={COLORS.textInverse} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  fabWrap: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    elevation: 8,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});