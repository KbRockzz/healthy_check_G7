/**
 * Màn hình All Health Data - Danh mục toàn bộ dữ liệu & chỉ số sinh học
 * Khớp thiết kế Mockup #4: Dashboard - All Health Data.png
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS, FONT_FAMILY } from '@/theme';
import { useAuth } from '@/lib/hooks/use-auth';
import BottomTabBar from '@/components/bottom-tab-bar';

interface MetricRow {
  label: string;
  value: string;
  unit: string;
  icon: string;
  color: string;
  category: 'activity' | 'body' | 'vitals';
  targetRoute?: string;
}

export default function HealthDataScreen() {
  const router = useRouter();
  const { session, profile, loading: authLoading } = useAuth();
  const [stepsToday, setStepsToday] = useState(6432);

  const loadData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const savedSteps = await AsyncStorage.getItem(`@healthy_check_steps_${today}`);
      if (savedSteps) setStepsToday(parseInt(savedSteps, 10));
    } catch {
      // keep
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.replace('/auth/sign-in');
      return;
    }
    loadData();
  }, [session, authLoading, loadData]);

  // Tính toán BMI từ profile thực tế
  const height = profile?.height_cm || 168;
  const weight = profile?.weight_kg || 58;
  const hM = height / 100;
  const realBmi = (weight / (hM * hM)).toFixed(1);
  const distanceKm = (stepsToday * 0.00075).toFixed(1);

  const metrics: MetricRow[] = [
    { label: 'Nhịp tim lúc nghỉ ngơi', value: '72', unit: 'BPM', icon: 'heart', color: '#EF4444', category: 'vitals', targetRoute: '/dashboard/heart-rate' },
    { label: 'Huyết áp (Blood Pressure)', value: '118/78', unit: 'mmHg', icon: 'pulse', color: '#DC2626', category: 'vitals', targetRoute: '/dashboard/heart-rate' },
    { label: 'Nồng độ oxy trong máu (SpO2)', value: '98', unit: '%', icon: 'water', color: '#0284C7', category: 'vitals' },
    { label: 'Chỉ số khối cơ thể (BMI)', value: realBmi, unit: 'Chuẩn', icon: 'fitness', color: '#10B981', category: 'body', targetRoute: '/profile' },
    { label: 'Cân nặng', value: weight.toString(), unit: 'kg', icon: 'scale', color: '#8B5CF6', category: 'body', targetRoute: '/profile' },
    { label: 'Chiều cao', value: height.toString(), unit: 'cm', icon: 'resize', color: '#059669', category: 'body', targetRoute: '/profile' },
    { label: 'Tỷ lệ mỡ cơ thể', value: '18.2', unit: '%', icon: 'body', color: '#F59E0B', category: 'body', targetRoute: '/profile' },
    { label: 'Năng lượng chuyển hóa nghỉ (BMR)', value: '1,420', unit: 'kcal', icon: 'flame', color: '#D97706', category: 'activity', targetRoute: '/dashboard/nutrition' },
    { label: 'Khoảng cách đi bộ hôm nay', value: distanceKm, unit: 'km', icon: 'walk', color: COLORS.primary, category: 'activity', targetRoute: '/dashboard/steps' },
  ];

  const handleMetricPress = (m: MetricRow) => {
    if (m.targetRoute) {
      router.push(m.targetRoute as any);
    } else if (m.label.includes('SpO2')) {
      Alert.alert(
        'Nồng độ Oxy trong máu (SpO2)',
        'Chỉ số hiện tại: 98% (Mức lý tưởng: 95% - 100%).\n\nNồng độ bão hòa oxy trong máu phản ánh khả năng vận chuyển oxy của hồng cầu tới các cơ quan mô.'
      );
    }
  };

  const vitals = metrics.filter((m) => m.category === 'vitals');
  const body = metrics.filter((m) => m.category === 'body');
  const activity = metrics.filter((m) => m.category === 'activity');

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>All Health Data</Text>
            <Text style={styles.headerSub}>Toàn bộ số đo sinh học & thể trạng</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/profile')} style={styles.avatarBtn}>
            <Ionicons name="person-circle-outline" size={34} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Quick Jump Shortcuts */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
          <TouchableOpacity style={[styles.shortcutChip, { borderColor: COLORS.primary }]} onPress={() => router.push('/dashboard/steps')}>
            <Ionicons name="walk" size={16} color={COLORS.primary} />
            <Text style={[styles.shortcutText, { color: COLORS.primary }]}>Bước chân</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shortcutChip, { borderColor: '#2563EB' }]} onPress={() => router.push('/dashboard/water' as any)}>
            <Ionicons name="water" size={16} color="#2563EB" />
            <Text style={[styles.shortcutText, { color: '#2563EB' }]}>Nước uống</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shortcutChip, { borderColor: '#8B5CF6' }]} onPress={() => router.push('/dashboard/sleep')}>
            <Ionicons name="moon" size={16} color="#8B5CF6" />
            <Text style={[styles.shortcutText, { color: '#8B5CF6' }]}>Giấc ngủ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shortcutChip, { borderColor: '#D97706' }]} onPress={() => router.push('/dashboard/nutrition')}>
            <Ionicons name="restaurant" size={16} color="#D97706" />
            <Text style={[styles.shortcutText, { color: '#D97706' }]}>Dinh dưỡng</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shortcutChip, { borderColor: '#DC2626' }]} onPress={() => router.push('/dashboard/heart-rate')}>
            <Ionicons name="heart" size={16} color="#DC2626" />
            <Text style={[styles.shortcutText, { color: '#DC2626' }]}>Nhịp tim</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shortcutChip, { borderColor: '#16A34A' }]} onPress={() => router.push('/settings/goals')}>
            <Ionicons name="flag" size={16} color="#16A34A" />
            <Text style={[styles.shortcutText, { color: '#16A34A' }]}>Mục tiêu</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Section: Vitals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chỉ số sinh tồn (Vitals)</Text>
          <View style={styles.card}>
            {vitals.map((m, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.row, idx === vitals.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => handleMetricPress(m)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconWrap, { backgroundColor: m.color + '15' }]}>
                  <Ionicons name={m.icon as any} size={20} color={m.color} />
                </View>
                <Text style={styles.rowLabel}>{m.label}</Text>
                <Text style={[styles.rowValue, { color: m.color }]}>
                  {m.value} <Text style={styles.unitText}>{m.unit}</Text>
                </Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Section: Body Measurements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Số đo cơ thể (Body Measurements)</Text>
          <View style={styles.card}>
            {body.map((m, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.row, idx === body.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => handleMetricPress(m)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconWrap, { backgroundColor: m.color + '15' }]}>
                  <Ionicons name={m.icon as any} size={20} color={m.color} />
                </View>
                <Text style={styles.rowLabel}>{m.label}</Text>
                <Text style={styles.rowValue}>
                  {m.value} <Text style={styles.unitText}>{m.unit}</Text>
                </Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Section: Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chuyển hóa & Hoạt động (Activity)</Text>
          <View style={styles.card}>
            {activity.map((m, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.row, idx === activity.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => handleMetricPress(m)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconWrap, { backgroundColor: m.color + '15' }]}>
                  <Ionicons name={m.icon as any} size={20} color={m.color} />
                </View>
                <Text style={styles.rowLabel}>{m.label}</Text>
                <Text style={styles.rowValue}>
                  {m.value} <Text style={styles.unitText}>{m.unit}</Text>
                </Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom 4-Tab Bar */}
      <BottomTabBar currentRoute="/health-data" onTabPress={(route) => router.push(route as any)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 110 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: { fontSize: FONT_SIZES['2xl'], fontWeight: 'bold', color: COLORS.textPrimary, fontFamily: FONT_FAMILY.bold as string },
  headerSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, fontFamily: FONT_FAMILY.base as string },
  avatarBtn: { padding: 4 },
  chipScroll: { marginBottom: 20, marginHorizontal: -20 },
  chipRow: { paddingHorizontal: 20, gap: 8 },
  shortcutChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  shortcutText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FONT_FAMILY.medium as string,
  },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    fontFamily: FONT_FAMILY.semiBold as string,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowLabel: { flex: 1, fontSize: 13, fontWeight: '500', color: COLORS.textPrimary, fontFamily: FONT_FAMILY.base as string },
  rowValue: { fontSize: 14, fontWeight: 'bold', color: COLORS.textPrimary, fontFamily: FONT_FAMILY.bold as string },
  unitText: { fontSize: 11, fontWeight: 'normal', color: COLORS.textSecondary, fontFamily: FONT_FAMILY.base as string },
});
