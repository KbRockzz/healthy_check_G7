/**
 * Màn hình Water Tracker - Ghi nhận và nhắc nhở uống nước
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
import { useNotifications, scheduleWaterReminders, cancelWaterReminders } from '@/lib/hooks/use-notifications';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WATER_REMINDER_KEY = 'water_reminders_enabled';

export default function WaterScreen() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [todayWater, setTodayWater] = useState(0);
  const [goal, setGoal] = useState(2000);
  const [input, setInput] = useState('');
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useNotifications();

  useEffect(() => {
    if (!session) {
      router.replace('/auth/sign-in');
      return;
    }
    loadReminders();
    fetchData();
  }, [session]);

  async function loadReminders() {
    try {
      const saved = await AsyncStorage.getItem(WATER_REMINDER_KEY);
      if (saved === 'true') setRemindersEnabled(true);
    } catch { /* ignore */ }
  }

  async function fetchData() {
    if (!session) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: waterData } = await supabase
        .from('health_metrics')
        .select('value')
        .eq('user_id', session.user.id)
        .eq('metric_kind', 'water_intake')
        .gte('recorded_at', new Date(today + 'T00:00:00Z').toISOString())
        .lt('recorded_at', new Date(today + 'T23:59:59Z').toISOString());

      const total = waterData?.reduce((s, i) => s + i.value, 0) || 0;
      setTodayWater(total);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('water_goal_ml')
        .eq('id', session.user.id)
        .single();
      if (profileData?.water_goal_ml) setGoal(profileData.water_goal_ml);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleAddWater = async (amount: number) => {
    if (!session) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('health_metrics').insert({
        user_id: session.user.id,
        metric_kind: 'water_intake',
        value: amount,
        unit: 'ml',
        recorded_at: new Date().toISOString(),
        source: 'manual',
      });
      if (error) {
        Alert.alert('Lỗi', error.message || 'Không thể ghi nhận');
        return;
      }
      setTodayWater(prev => prev + amount);
      setInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCustomAmount = () => {
    const amount = parseInt(input);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số ml hợp lệ');
      return;
    }
    handleAddWater(amount);
  };

  const toggleReminders = async () => {
    if (remindersEnabled) {
      await cancelWaterReminders();
      await AsyncStorage.removeItem(WATER_REMINDER_KEY);
      setRemindersEnabled(false);
      Alert.alert('Đã tắt', 'Đã tắt nhắc nhở uống nước');
    } else {
      await scheduleWaterReminders(8, 22, 2);
      await AsyncStorage.setItem(WATER_REMINDER_KEY, 'true');
      setRemindersEnabled(true);
      Alert.alert('Đã bật', 'Nhắc nhở uống nước sẽ gửi mỗi 2 giờ từ 8h đến 22h');
    }
  };

  const progress = Math.min((todayWater / goal) * 100, 100);
  const remaining = Math.max(goal - todayWater, 0);
  const status = progress >= 100 ? 'Đã đủ nước! 💧' : progress >= 75 ? 'Khá tốt' : progress >= 50 ? 'Cố thêm' : 'Còn thiếu';
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
        <Text style={styles.headerTitle}>Uống nước</Text>
        <TouchableOpacity onPress={fetchData}>
          <Ionicons name="refresh" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Water Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.waterCircle}>
          <Ionicons name="water" size={48} color={COLORS.primary} />
          <Text style={styles.waterValue}>{todayWater}</Text>
          <Text style={styles.waterUnit}>ml</Text>
        </View>
        <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: statusColor }]} />
        </View>
        <Text style={styles.goalText}>Mục tiêu: {goal.toLocaleString()} ml</Text>
        <Text style={styles.remainingText}>
          {remaining > 0 ? `Còn ${remaining.toLocaleString()} ml` : 'Đã đạt mục tiêu!'}
        </Text>
      </View>

      {/* Quick Add Buttons */}
      <View style={styles.quickAdd}>
        <Text style={styles.quickAddTitle}>+ Thêm nhanh</Text>
        <View style={styles.quickAddRow}>
          {[100, 200, 300, 500].map(amount => (
            <TouchableOpacity
              key={amount}
              style={styles.quickAddBtn}
              onPress={() => handleAddWater(amount)}
              disabled={saving}
            >
              <Ionicons name="water" size={20} color={COLORS.primary} />
              <Text style={styles.quickAddBtnText}>+{amount} ml</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.customRow}>
          <TextInput
            style={styles.customInput}
            placeholder="Nhập số ml..."
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="numeric"
            value={input}
            onChangeText={setInput}
          />
          <TouchableOpacity style={styles.customBtn} onPress={handleCustomAmount} disabled={saving}>
            <Text style={styles.customBtnText}>Thêm</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Reminder Toggle */}
      <View style={styles.reminderCard}>
        <View style={styles.reminderInfo}>
          <Ionicons name="notifications" size={24} color={COLORS.primary} />
          <View style={styles.reminderText}>
            <Text style={styles.reminderTitle}>Nhắc nhở uống nước</Text>
            <Text style={styles.reminderSub}>Mỗi 2 giờ từ 8h - 22h</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.toggleBtn, remindersEnabled && styles.toggleBtnActive]}
          onPress={toggleReminders}
        >
          <Text style={[styles.toggleBtnText, remindersEnabled && styles.toggleBtnTextActive]}>
            {remindersEnabled ? 'Bật' : 'Tắt'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tips */}
      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>💡 Gợi ý</Text>
        <Text style={styles.tipsText}>• Uống nước ngay khi thức dậy để kick-start cơ thể</Text>
        <Text style={styles.tipsText}>• Uống một cốc trước mỗi bữa ăn</Text>
        <Text style={styles.tipsText}>• Tăng lượng nước khi tập thể thao hoặc thời tiết nóng</Text>
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
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: 20,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  waterCircle: { alignItems: 'center', justifyContent: 'center' },
  waterValue: { fontSize: 48, fontWeight: 'bold', color: COLORS.primary, marginTop: 8 },
  waterUnit: { fontSize: FONT_SIZES.base, color: COLORS.textSecondary, fontFamily: FONT_FAMILY.base as string },
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
  remainingText: { fontSize: FONT_SIZES.base, fontWeight: '600', color: COLORS.primary, marginTop: 4, fontFamily: FONT_FAMILY.semiBold as string },
  quickAdd: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    marginTop: 20,
    ...SHADOWS.sm,
  },
  quickAddTitle: { fontSize: FONT_SIZES.base, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 12, fontFamily: FONT_FAMILY.semiBold as string },
  quickAddRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  quickAddBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
  },
  quickAddBtnText: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: '600', fontFamily: FONT_FAMILY.semiBold as string },
  customRow: { flexDirection: 'row', gap: 10 },
  customInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 14,
    height: 48,
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
    fontFamily: FONT_FAMILY.base as string,
  },
  customBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customBtnText: { color: COLORS.textInverse, fontWeight: '600', fontFamily: FONT_FAMILY.semiBold as string },
  reminderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    marginTop: 20,
    ...SHADOWS.sm,
  },
  reminderInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  reminderText: { flex: 1 },
  reminderTitle: { fontSize: FONT_SIZES.base, fontWeight: '600', color: COLORS.textPrimary, fontFamily: FONT_FAMILY.semiBold as string },
  reminderSub: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontFamily: FONT_FAMILY.base as string, marginTop: 2 },
  toggleBtn: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  toggleBtnText: { color: COLORS.textSecondary, fontWeight: '600', fontFamily: FONT_FAMILY.semiBold as string },
  toggleBtnTextActive: { color: COLORS.textInverse },
  tipsCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    marginTop: 20,
    ...SHADOWS.sm,
  },
  tipsTitle: { fontSize: FONT_SIZES.base, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 12, fontFamily: FONT_FAMILY.bold as string },
  tipsText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 22, fontFamily: FONT_FAMILY.base as string },
});
