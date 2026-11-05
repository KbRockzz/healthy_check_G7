/**
 * Màn hình All Health Data - Danh mục toàn bộ dữ liệu & chỉ số sinh học
 * Khớp thiết kế Mockup #4: Dashboard - All Health Data.png
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS, FONT_FAMILY } from '@/theme';
import { useAuth } from '@/lib/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import BottomTabBar from '@/components/bottom-tab-bar';

interface MetricRow {
  label: string;
  value: string;
  unit: string;
  icon: string;
  color: string;
  category: 'activity' | 'body' | 'nutrition' | 'cycle';
  targetRoute?: string;
}

export default function HealthDataScreen() {
  const router = useRouter();
  const { session, profile, loading: authLoading } = useAuth();
  const [stepsToday, setStepsToday] = useState<number>(0);
  const [waterToday, setWaterToday] = useState<number>(0);
  const [sleepMins, setSleepMins] = useState<number>(0);
  const [caloriesToday, setCaloriesToday] = useState<number>(0);
  const [healthScore, setHealthScore] = useState<number>(0);
  const [cycleInfo, setCycleInfo] = useState<{ day: number; length: number; status: string }>({ day: 1, length: 28, status: 'An toàn' });
  const [loaded, setLoaded] = useState(false);

  const loadData = useCallback(async () => {
    if (!session) return;
    try {
      const today = new Date().toISOString().split('T')[0];

      // Dùng cùng RPC get_dashboard_summary như Dashboard để điểm sức khỏe luôn đồng bộ
      const { data: summaryData, error: summaryError } = await supabase.rpc('get_dashboard_summary', {
        p_user: session.user.id,
        p_day: today,
      });

      if (summaryError) throw summaryError;

      const s = summaryData as any;
      if (s) {
        // Health score từ DB (cùng công thức với Dashboard)
        setHealthScore(s.health_score?.score || 0);

        // Steps
        setStepsToday(s.steps?.count || 0);

        // Sleep
        setSleepMins(s.sleep?.total_minutes || 0);

        // Nutrition calories
        setCaloriesToday(s.nutrition?.calories || 0);

        // Water
        setWaterToday(s.water || 0);

        // Cycle
        if (s.cycle?.last_period_start) {
          const start = new Date(s.cycle.last_period_start);
          const now = new Date();
          const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          const len = s.cycle.cycle_length || 28;
          const day = ((diffDays % len) + len) % len + 1;
          const isPeriod = day <= 5;
          const isOvulation = day >= (len - 14) && day <= (len - 10);
          const status = isPeriod ? 'Hành kinh' : isOvulation ? 'Rụng trứng' : 'An toàn';
          setCycleInfo({ day, length: len, status });
        }
      }

      setLoaded(true);
    } catch (err) {
      console.error('HealthData load error:', err);
      setLoaded(true);
    }
  }, [session]);

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
  }, [session, authLoading, loadData, setLoaded]);

  // Tính toán chỉ số sinh học bổ sung
  const height = profile?.height_cm || 168;
  const weight = profile?.weight_kg || 58;
  const hM = height / 100;
  const realBmi = (weight / (hM * hM)).toFixed(1);
  const distanceKm = (stepsToday * 0.00075).toFixed(1);

  // BMR Mifflin-St Jeor (male default or profile gender)
  const isMale = profile?.gender !== 'female';
  // Tính tuổi từ date_of_birth, mặc định 25 nếu chưa có
  let age = 25;
  if (profile?.date_of_birth) {
    const dob = new Date(profile.date_of_birth);
    const now = new Date();
    age = now.getFullYear() - dob.getFullYear() -
      (now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate()) ? 1 : 0);
    if (age < 13) age = 18;
  }
  const bmr = isMale
    ? Math.round(10 * weight + 6.25 * height - 5 * age + 5)
    : Math.round(10 * weight + 6.25 * height - 5 * age - 161);

  // TDEE estimate based on steps
  const activityMultiplier = stepsToday > 10000 ? 1.55 : stepsToday > 5000 ? 1.375 : 1.2;
  const tdee = Math.round(bmr * activityMultiplier);

  // Water target: ưu tiên water_goal_ml từ profile, fallback weight * 40ml
  const waterGoal = profile?.water_goal_ml || Math.round(weight * 40);

  // Activity level classification
  const activityLevel = stepsToday > 10000 ? 'Năng động' : stepsToday > 5000 ? 'Trung bình' : 'Ít vận động';

  // Sleep score: theo sleep_goal_minutes của profile (mặc định 480)
  const sleepGoalMins = profile?.sleep_goal_minutes || 480;
  const sleepScore = Math.min(100, Math.round((sleepMins / sleepGoalMins) * 100));

  // Health Score (đã được fetch từ RPC get_dashboard_summary - đồng bộ với Dashboard)
  // Sử dụng healthScore state thay vì tính local

  const metrics: MetricRow[] = [
    // Body
    { label: 'Chỉ số khối cơ thể (BMI)', value: realBmi, unit: realBmi < '18.5' ? 'Thiếu cân' : realBmi <= '24.9' ? 'Chuẩn' : 'Thừa cân', icon: 'fitness', color: '#10B981', category: 'body', targetRoute: '/profile' },
    { label: 'Cân nặng', value: weight.toString(), unit: 'kg', icon: 'scale', color: '#8B5CF6', category: 'body', targetRoute: '/profile' },
    { label: 'Chiều cao', value: height.toString(), unit: 'cm', icon: 'resize', color: '#059669', category: 'body', targetRoute: '/profile' },

    // Nutrition & Metabolism
    { label: 'BMR (Năng lượng nghỉ)', value: bmr.toLocaleString(), unit: 'kcal', icon: 'flame', color: '#D97706', category: 'nutrition', targetRoute: '/dashboard/nutrition' },
    { label: 'TDEE (Tổng năng lượng tiêu hao)', value: tdee.toLocaleString(), unit: `kcal (mục tiêu ${profile?.calorie_goal || 2000})`, icon: 'flash', color: '#EA580C', category: 'nutrition', targetRoute: '/dashboard/nutrition' },
    { label: 'Cân bằng nước lý tưởng', value: `${waterToday} / ${waterGoal}`, unit: `ml (mục tiêu ${waterGoal})`, icon: 'water', color: '#0284C7', category: 'nutrition', targetRoute: '/dashboard/water' },

    // Activity & Sleep
    { label: 'Mức độ vận động', value: activityLevel, unit: `${stepsToday.toLocaleString()} bước`, icon: 'walk', color: COLORS.primary, category: 'activity', targetRoute: '/dashboard/steps' },
    { label: 'Khoảng cách đi bộ', value: distanceKm, unit: 'km', icon: 'navigate', color: '#2563EB', category: 'activity', targetRoute: '/dashboard/steps' },
    { label: 'Điểm chất lượng giấc ngủ', value: sleepScore.toString(), unit: '/100 đ', icon: 'moon', color: '#7C3AED', category: 'activity', targetRoute: '/dashboard/sleep' },

    // Cycle & Women Health
    { label: 'Chu kỳ kinh nguyệt', value: `Ngày ${cycleInfo.day}`, unit: cycleInfo.status, icon: 'heart', color: '#DB2777', category: 'cycle', targetRoute: '/dashboard/cycle' },
  ];

  const handleMetricPress = (m: MetricRow) => {
    if (m.targetRoute) {
      router.push(m.targetRoute as any);
    }
  };

  const nutrition = metrics.filter((m) => m.category === 'nutrition');
  const body = metrics.filter((m) => m.category === 'body');
  const activity = metrics.filter((m) => m.category === 'activity');
  const cycle = metrics.filter((m) => m.category === 'cycle');

  if (!loaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Dữ liệu sức khỏe</Text>
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
          <TouchableOpacity style={[styles.shortcutChip, { borderColor: '#16A34A' }]} onPress={() => router.push('/settings/goals')}>
            <Ionicons name="flag" size={16} color="#16A34A" />
            <Text style={[styles.shortcutText, { color: '#16A34A' }]}>Mục tiêu</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Health Score Card */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Điểm sức khỏe hôm nay</Text>
          <Text style={styles.scoreValue}>{healthScore}/100</Text>
          <View style={styles.scoreBar}><View style={[styles.scoreFill, { width: `${healthScore}%` }]} /></View>
        </View>

        {/* Section: Body Measurements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Số đo cơ thể</Text>
          <View style={styles.card}>
            {body.map((m, idx) => (
              <TouchableOpacity key={idx} style={[styles.row, idx === body.length - 1 && { borderBottomWidth: 0 }]} onPress={() => handleMetricPress(m)} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: m.color + '15' }]}><Ionicons name={m.icon as any} size={20} color={m.color} /></View>
                <Text style={styles.rowLabel}>{m.label}</Text>
                <Text style={styles.rowValue}>{m.value} <Text style={styles.unitText}>{m.unit}</Text></Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Section: Nutrition */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dinh dưỡng & Chuyển hóa</Text>
          <View style={styles.card}>
            {nutrition.map((m, idx) => (
              <TouchableOpacity key={idx} style={[styles.row, idx === nutrition.length - 1 && { borderBottomWidth: 0 }]} onPress={() => handleMetricPress(m)} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: m.color + '15' }]}><Ionicons name={m.icon as any} size={20} color={m.color} /></View>
                <Text style={styles.rowLabel}>{m.label}</Text>
                <Text style={styles.rowValue}>{m.value} <Text style={styles.unitText}>{m.unit}</Text></Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Section: Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hoạt động & Thể trạng</Text>
          <View style={styles.card}>
            {activity.map((m, idx) => (
              <TouchableOpacity key={idx} style={[styles.row, idx === activity.length - 1 && { borderBottomWidth: 0 }]} onPress={() => handleMetricPress(m)} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: m.color + '15' }]}><Ionicons name={m.icon as any} size={20} color={m.color} /></View>
                <Text style={styles.rowLabel}>{m.label}</Text>
                <Text style={styles.rowValue}>{m.value} <Text style={styles.unitText}>{m.unit}</Text></Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Section: Cycle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sức khỏe phụ nữ</Text>
          <View style={styles.card}>
            {cycle.map((m, idx) => (
              <TouchableOpacity key={idx} style={[styles.row, idx === cycle.length - 1 && { borderBottomWidth: 0 }]} onPress={() => handleMetricPress(m)} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: m.color + '15' }]}><Ionicons name={m.icon as any} size={20} color={m.color} /></View>
                <Text style={styles.rowLabel}>{m.label}</Text>
                <Text style={styles.rowValue}>{m.value} <Text style={styles.unitText}>{m.unit}</Text></Text>
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
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
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
  scoreCard: { backgroundColor: COLORS.primary, borderRadius: 20, padding: 20, marginBottom: 20, alignItems: 'center' },
  scoreLabel: { color: 'white', fontSize: 13, marginBottom: 4 },
  scoreValue: { color: 'white', fontSize: 32, fontWeight: 'bold' },
  scoreBar: { width: '100%', height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, marginTop: 12 },
  scoreFill: { height: '100%', backgroundColor: 'white', borderRadius: 4 },
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
