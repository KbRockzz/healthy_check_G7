/**
 * Màn hình Sleep Tracker - Ghi nhận giấc ngủ và xem lịch sử
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '@/theme';
import { useAuth } from '@/lib/hooks/use-auth';
import { supabase } from '@/lib/supabase';

interface SleepEntry {
  id: number;
  total_minutes: number;
  deep_minutes: number;
  light_minutes: number;
  rem_minutes: number;
  quality_score: number | null;
  sleep_date: string;
  bedtime_at?: string | null;
  wake_at?: string | null;
}

type PickerMode = 'bedtime' | 'wake' | null;

export default function SleepScreen() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [todaySleep, setTodaySleep] = useState<number>(0);
  const [goal, setGoal] = useState(480);
  const [showLog, setShowLog] = useState(false);
  const [bedtime, setBedtime] = useState('22:00');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [entries, setEntries] = useState<SleepEntry[]>([]);

  // Time picker state
  const [showBedtimePicker, setShowBedtimePicker] = useState(false);
  const [showWakePicker, setShowWakePicker] = useState(false);
  const [tempTime, setTempTime] = useState<Date>(new Date());

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
      // Fetch today's sleep
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('sleep_records')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('sleep_date', today)
        .single();

      if (data) {
        setTodaySleep(data.total_minutes);
        if (data.bedtime_at) {
          const d = new Date(data.bedtime_at);
          setBedtime(formatTime(d));
        }
        if (data.wake_at) {
          const d = new Date(data.wake_at);
          setWakeTime(formatTime(d));
        }
      }

      // Fetch goal
      const { data: profileData } = await supabase
        .from('profiles')
        .select('sleep_goal_minutes, bedtime, wake_time')
        .eq('id', session.user.id)
        .single();
      if (profileData) {
        setGoal(profileData.sleep_goal_minutes || 480);
        if (profileData.bedtime) setBedtime(parseTimeValue(profileData.bedtime));
        if (profileData.wake_time) setWakeTime(parseTimeValue(profileData.wake_time));
      }

      // Fetch history
      const { data: historyData } = await supabase
        .from('sleep_records')
        .select('*')
        .eq('user_id', session.user.id)
        .order('sleep_date', { ascending: false })
        .limit(7);
      if (historyData) setEntries(historyData as SleepEntry[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function formatTime(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  function parseTimeValue(value: string | null): string {
    if (!value) return '22:00';
    // Handle "HH:MM" format from profiles table
    if (value.includes(':') && !value.includes('T')) {
      return value.slice(0, 5);
    }
    // Handle ISO string
    const d = new Date(value);
    return formatTime(d);
  }

  const handleBedtimeChange = useCallback((event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowBedtimePicker(false);
    if (event.type === 'set' && selectedDate) {
      const timeStr = formatTime(selectedDate);
      setBedtime(timeStr);
      setTempTime(selectedDate);
    }
  }, []);

  const handleWakeChange = useCallback((event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowWakePicker(false);
    if (event.type === 'set' && selectedDate) {
      const timeStr = formatTime(selectedDate);
      setWakeTime(timeStr);
      setTempTime(selectedDate);
    }
  }, []);

  const openBedtimePicker = () => {
    const [h, m] = bedtime.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    setTempTime(d);
    setShowBedtimePicker(true);
  };

  const openWakePicker = () => {
    const [h, m] = wakeTime.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    setTempTime(d);
    setShowWakePicker(true);
  };

  const handleLogSleep = async () => {
    if (!bedtime || !wakeTime) {
      Alert.alert('Lỗi', 'Vui lòng nhập giờ đi ngủ và giờ thức dậy');
      return;
    }

    // Calculate sleep duration
    const [bedH, bedM] = bedtime.split(':').map(Number);
    const [wakeH, wakeM] = wakeTime.split(':').map(Number);
    let totalMinutes = (wakeH * 60 + wakeM) - (bedH * 60 + bedM);
    if (totalMinutes < 0) totalMinutes += 24 * 60; // Overnight

    // Build ISO timestamps for bedtime and wake time today/tomorrow
    const today = new Date();
    const bedtimeDate = new Date(today);
    bedtimeDate.setHours(bedH, bedM, 0, 0);
    const wakeDate = new Date(today);
    wakeDate.setHours(wakeH, wakeM, 0, 0);
    if (wakeDate <= bedtimeDate) {
      wakeDate.setDate(wakeDate.getDate() + 1);
    }

    const { error } = await supabase.from('sleep_records').insert({
      user_id: session?.user.id,
      sleep_date: new Date().toISOString().split('T')[0],
      bedtime_at: bedtimeDate.toISOString(),
      wake_at: wakeDate.toISOString(),
      total_minutes: totalMinutes,
      deep_minutes: Math.round(totalMinutes * 0.2),
      light_minutes: Math.round(totalMinutes * 0.5),
      rem_minutes: Math.round(totalMinutes * 0.25),
      source: 'manual',
    });

    if (error) {
      Alert.alert('Lỗi', error.message || 'Không thể ghi nhận');
      return;
    }

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    Alert.alert(
      'Đã ghi nhận! 😴',
      `Giấc ngủ: ${hours}h ${mins}min`,
      [{ text: 'OK' }]
    );

    setShowLog(false);
    fetchData();
  };

  const progress = Math.min((todaySleep / goal) * 100, 100);
  const status = progress >= 100 ? 'Đủ giấc!' : progress >= 75 ? 'Khá tốt' : progress >= 50 ? 'Chưa đủ' : 'Thiếu ngủ';
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
        <Text style={styles.headerTitle}>Sleep</Text>
        <TouchableOpacity onPress={() => router.push('/settings/goals')}>
          <Ionicons name="settings-outline" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Sleep Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.sleepCircle}>
          <Ionicons name="moon" size={48} color={statusColor} />
          <Text style={styles.sleepValue}>
            {Math.floor(todaySleep / 60)}h {todaySleep % 60}min
          </Text>
          <Text style={styles.sleepLabel}>tối qua</Text>
        </View>
        <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: statusColor }]} />
        </View>
        <Text style={styles.goalText}>Mục tiêu: {Math.floor(goal / 60)}h {goal % 60}min</Text>
      </View>

      {/* Sleep Schedule */}
      <View style={styles.scheduleCard}>
        <Text style={styles.scheduleTitle}>Lịch ngủ hiện tại</Text>
        <View style={styles.scheduleRow}>
          <TouchableOpacity style={styles.scheduleItem} onPress={openBedtimePicker}>
            <Ionicons name="bed" size={24} color={COLORS.danger} />
            <Text style={styles.scheduleLabel}>Giờ đi ngủ</Text>
            <Text style={styles.scheduleValue}>{bedtime}</Text>
            <Ionicons name="chevron-down" size={16} color={COLORS.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.scheduleItem} onPress={openWakePicker}>
            <Ionicons name="sunny" size={24} color={COLORS.warning} />
            <Text style={styles.scheduleLabel}>Giờ thức dậy</Text>
            <Text style={styles.scheduleValue}>{wakeTime}</Text>
            <Ionicons name="chevron-down" size={16} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Log Sleep Button */}
      <TouchableOpacity style={styles.logBtn} onPress={() => setShowLog(!showLog)}>
        <Ionicons name={showLog ? 'close' : 'add'} size={20} color={COLORS.textInverse} />
        <Text style={styles.logBtnText}>{showLog ? 'Hủy' : 'Ghi nhận giấc ngủ'}</Text>
      </TouchableOpacity>

      {/* Log Form */}
      {showLog && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Ghi nhận giấc ngủ</Text>
          <TouchableOpacity style={styles.inputRow} onPress={openBedtimePicker}>
            <Ionicons name="bed" size={20} color={COLORS.textTertiary} />
            <Text style={styles.inputValue}>{bedtime}</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.inputRow} onPress={openWakePicker}>
            <Ionicons name="sunny" size={20} color={COLORS.warning} />
            <Text style={styles.inputValue}>{wakeTime}</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitBtn} onPress={handleLogSleep}>
            <Text style={styles.submitBtnText}>Ghi nhận</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Time Pickers (rendered outside scroll) */}
      {showBedtimePicker && (
        <DateTimePicker
          value={tempTime}
          mode="time"
          is24Hour={true}
          display="spinner"
          onChange={handleBedtimeChange}
          style={styles.picker}
        />
      )}
      {showWakePicker && (
        <DateTimePicker
          value={tempTime}
          mode="time"
          is24Hour={true}
          display="spinner"
          onChange={handleWakeChange}
          style={styles.picker}
        />
      )}

      {/* History */}
      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>7 ngày qua</Text>
        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="moon-outline" size={48} color={COLORS.textTertiary} />
            <Text style={styles.emptyText}>Chưa có dữ liệu</Text>
            <Text style={styles.emptySub}>Hãy ghi nhận giấc ngủ để xem lịch sử</Text>
          </View>
        ) : (
          entries.map(entry => (
            <View key={entry.id} style={styles.historyItem}>
              <View>
                <Text style={styles.historyDate}>
                  {new Date(entry.sleep_date).toLocaleDateString('vi-VN')}
                </Text>
                {entry.bedtime_at && (
                  <Text style={styles.historyTime}>
                    {formatTime(new Date(entry.bedtime_at))} - {entry.wake_at ? formatTime(new Date(entry.wake_at)) : ''}
                  </Text>
                )}
              </View>
              <View style={styles.historyStats}>
                <Ionicons name="moon" size={16} color={COLORS.primary} />
                <Text style={styles.historyValue}>
                  {Math.floor(entry.total_minutes / 60)}h {entry.total_minutes % 60}min
                </Text>
              </View>
              {entry.quality_score && (
                <Text style={styles.historyQuality}>Chất lượng: {entry.quality_score}%</Text>
              )}
            </View>
          ))
        )}
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
  headerTitle: { fontSize: FONT_SIZES.xl, fontWeight: 'bold' },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: 20,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  sleepCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sleepValue: { fontSize: 28, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: 8 },
  sleepLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  statusText: { fontSize: FONT_SIZES.lg, fontWeight: '600', marginTop: 12 },
  progressBar: {
    width: '80%',
    height: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  goalText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 8 },
  scheduleCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    marginTop: 16,
    ...SHADOWS.sm,
  },
  scheduleTitle: { fontSize: FONT_SIZES.base, fontWeight: '600', marginBottom: 12 },
  scheduleRow: { flexDirection: 'row', justifyContent: 'space-around' },
  scheduleItem: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  scheduleLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  scheduleValue: { fontSize: FONT_SIZES.lg, fontWeight: 'bold', color: COLORS.textPrimary },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.full,
    marginTop: 20,
    ...SHADOWS.md,
  },
  logBtnText: { color: COLORS.textInverse, fontWeight: '600', marginLeft: 8, fontSize: FONT_SIZES.base },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    marginTop: 12,
    ...SHADOWS.sm,
  },
  formTitle: { fontSize: FONT_SIZES.lg, fontWeight: 'bold', marginBottom: 16 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 12,
  },
  inputValue: { flex: 1, fontSize: FONT_SIZES.base, color: COLORS.textPrimary, marginLeft: 10 },
  submitBtn: {
    backgroundColor: COLORS.success,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: { color: COLORS.textInverse, fontWeight: '600', fontSize: FONT_SIZES.base },
  picker: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    marginVertical: 12,
  },
  historySection: { marginTop: 20 },
  historyTitle: { fontSize: FONT_SIZES.lg, fontWeight: 'bold', marginBottom: 12 },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: 14,
    marginBottom: 8,
    ...SHADOWS.sm,
  },
  historyDate: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  historyTime: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary, marginTop: 2 },
  historyStats: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  historyValue: { fontSize: FONT_SIZES.base, fontWeight: '600', color: COLORS.textPrimary },
  historyQuality: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary },
  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.textPrimary, marginTop: 12 },
  emptySub: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 4 },
});
