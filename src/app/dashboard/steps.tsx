/**
 * Màn hình Step Tracker - Thêm và hiển thị lịch sử bước chân
 */
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS, FONT_FAMILY } from '@/theme';
import { useAuth } from '@/lib/hooks/use-auth';
import { supabase } from '@/lib/supabase';

interface StepRecord {
  id: number;
  steps: number;
  calories_burned: number;
  distance_km: number;
  active_minutes: number;
  recorded_on: string;
}

export default function StepsScreen() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [todaySteps, setTodaySteps] = useState<number>(0);
  const [goal, setGoal] = useState(10000);
  const [history, setHistory] = useState<StepRecord[]>([]);
  const [logInput, setLogInput] = useState('');

  useEffect(() => {
    if (!session) {
      router.replace('/auth/sign-in');
      return;
    }
    fetchData();
  }, [session]);

  async function fetchData() {
    if (!session) return;
    setLoading(true);
    try {
      // Fetch today's steps
      const today = new Date().toISOString().split('T')[0];
      const { data: todayData } = await supabase
        .from('step_records')
        .select('steps')
        .eq('user_id', session.user.id)
        .eq('recorded_on', today)
        .single();

      if (todayData) {
        setTodaySteps(todayData.steps);
      }

      // Fetch goal from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('step_goal')
        .eq('id', session.user.id)
        .single();
      if (profileData?.step_goal) setGoal(profileData.step_goal);

      // Fetch history (last 7 days)
      const { data: historyData } = await supabase
        .from('step_records')
        .select('*')
        .eq('user_id', session.user.id)
        .order('recorded_on', { ascending: false })
        .limit(7);
      if (historyData) setHistory(historyData);
    } catch (err) {
      console.error('Lỗi load steps:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleLogSteps = async () => {
    const steps = parseInt(logInput);
    if (isNaN(steps) || steps <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số bước hợp lệ');
      return;
    }

    const { error } = await supabase.from('step_records').insert({
      user_id: session?.user.id,
      recorded_on: new Date().toISOString().split('T')[0],
      steps,
      calories_burned: Math.round(steps * 0.04),
      distance_km: parseFloat((steps * 0.0008).toFixed(2)),
      active_minutes: Math.round(steps / 100),
      source: 'manual',
    });

    if (error) {
      Alert.alert('Lỗi', error.message || 'Không thể ghi nhận');
      return;
    }

    Alert.alert(
      'Đã ghi nhận! 🎉',
      `Bạn đã đi ${steps.toLocaleString()} bước hôm nay.`,
      [{ text: 'OK' }]
    );

    setLogInput('');
    fetchData();
  };

  const progress = Math.min((todaySteps / goal) * 100, 100);
  const status = progress >= 100 ? 'Đạt mục tiêu!' : progress >= 75 ? 'Tiến gần!' : progress >= 50 ? 'Cố gắng thêm!' : 'Chưa đủ nửa';
  const statusColor = progress >= 100 ? COLORS.success : progress >= 75 ? COLORS.primary : COLORS.warning;

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Steps</Text>
        <TouchableOpacity onPress={() => router.push('/settings/goals')}>
          <Ionicons name="settings-outline" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Progress Circle */}
      <View style={styles.progressSection}>
        <View style={styles.progressCircle}>
          <Ionicons name="walk" size={48} color={statusColor} />
          <Text style={styles.stepsCount}>{todaySteps.toLocaleString()}</Text>
          <Text style={styles.stepsLabel}>bước chân</Text>
        </View>
        <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: statusColor }]} />
        </View>
        <Text style={styles.goalText}>Mục tiêu: {goal.toLocaleString()} bước</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="flame" size={24} color={COLORS.warning} />
          <Text style={styles.statValue}>{Math.round(todaySteps * 0.04).toLocaleString()}</Text>
          <Text style={styles.statLabel}>Calories</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="location" size={24} color={COLORS.accent} />
          <Text style={styles.statValue}>{(todaySteps * 0.0008).toFixed(1)} km</Text>
          <Text style={styles.statLabel}>Distance</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="timer" size={24} color={COLORS.primary} />
          <Text style={styles.statValue}>{Math.round(todaySteps / 100)} min</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
      </View>

      {/* Log Steps Input */}
      <View style={styles.logSection}>
        <Text style={styles.logTitle}>Ghi nhận bước chân</Text>
        <View style={styles.logInputRow}>
          <Ionicons name="footsteps" size={20} color={COLORS.textTertiary} />
          <TextInput
            style={styles.logInput}
            placeholder="Nhập số bước..."
            keyboardType="numeric"
            value={logInput}
            onChangeText={setLogInput}
          />
          <TouchableOpacity style={styles.logBtn} onPress={handleLogSteps}>
            <Text style={styles.logBtnText}>Ghi</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Weekly History */}
      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>7 ngày qua</Text>
        <View style={styles.historyList}>
          {history.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="walk-outline" size={48} color={COLORS.textTertiary} />
              <Text style={styles.emptyText}>Chưa có dữ liệu</Text>
              <Text style={styles.emptySub}>Hãy ghi nhận bước chân để xem lịch sử</Text>
            </View>
          ) : (
            history.map((record, idx) => (
              <View key={idx} style={styles.historyItem}>
                <Text style={styles.historyDate}>{new Date(record.recorded_on).toLocaleDateString('vi-VN')}</Text>
                <View style={styles.historyStats}>
                  <Ionicons name="walk" size={16} color={COLORS.primary} />
                  <Text style={styles.historyValue}>{record.steps.toLocaleString()} bước</Text>
                </View>
                <Text style={styles.historySub}>{Math.round(record.calories_burned)} calo</Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 40 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    marginBottom: 20,
  },
  headerTitle: { fontSize: FONT_SIZES.xl, fontWeight: 'bold', fontFamily: FONT_FAMILY.bold as string },
  progressSection: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: 20,
    ...SHADOWS.sm,
  },
  progressCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepsCount: { fontSize: FONT_SIZES['4xl'], fontWeight: 'bold', color: COLORS.textPrimary, marginTop: 8 },
  stepsLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontFamily: FONT_FAMILY.base as string },
  statusText: { fontSize: FONT_SIZES.lg, fontWeight: '600', marginTop: 12 },
  progressBar: {
    width: '80%',
    height: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4 },
  goalText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontFamily: FONT_FAMILY.base as string, marginTop: 8 },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    marginHorizontal: 4,
    ...SHADOWS.sm,
  },
  statValue: { fontSize: FONT_SIZES.base, fontWeight: 'bold', marginTop: 8, color: COLORS.textPrimary },
  statLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontFamily: FONT_FAMILY.base as string, marginTop: 4 },
  logSection: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    marginBottom: 20,
    ...SHADOWS.sm,
  },
  logTitle: { fontSize: FONT_SIZES.base, fontWeight: '600', fontFamily: FONT_FAMILY.semiBold as string, marginBottom: 12, color: COLORS.textPrimary },
  logInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 14,
    height: 48,
  },
  logInput: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
    marginLeft: 10,
  },
  logBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.full,
  },
  logBtnText: { color: COLORS.textInverse, fontWeight: '600' },
  historySection: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    ...SHADOWS.sm,
  },
  historyTitle: { fontSize: FONT_SIZES.lg, fontWeight: 'bold', fontFamily: FONT_FAMILY.bold as string, marginBottom: 12, color: COLORS.textPrimary },
  historyList: { gap: 12 },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  historyDate: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    width: 100,
  },
  historyStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  historyValue: { fontSize: FONT_SIZES.base, fontWeight: '600', fontFamily: FONT_FAMILY.semiBold as string, color: COLORS.textPrimary },
  historySub: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary, fontFamily: FONT_FAMILY.base as string },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.textPrimary, marginTop: 12 },
  emptySub: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontFamily: FONT_FAMILY.base as string, marginTop: 4 },
});
