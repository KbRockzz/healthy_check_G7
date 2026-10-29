/**
 * Màn hình Cycle Tracker - Ghi nhận chu kỳ và triệu chứng
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS, FONT_FAMILY } from '@/theme';
import { useAuth } from '@/lib/hooks/use-auth';
import { supabase } from '@/lib/supabase';

type SymptomType = 'cramps' | 'headache' | 'acne' | 'fatigue' | 'bloating' | 'back_pain' | 'nausea' | 'none';
type MoodType = 'happy' | 'neutral' | 'sad' | 'anxious' | 'irritated' | 'tired';

interface CycleEntry {
  id: number;
  period_start: string;
  period_end: string | null;
  cycle_length: number | null;
  symptom: SymptomType | null;
  mood: MoodType | null;
}

const SYMPTOMS: { value: SymptomType; label: string; icon: string }[] = [
  { value: 'cramps', label: 'Đau bụng', icon: 'alert-circle' },
  { value: 'headache', label: 'Đau đầu', icon: 'brain' },
  { value: 'acne', label: 'Mụn', icon: 'sparkles' },
  { value: 'fatigue', label: 'Mệt mỏi', icon: 'sleep' },
  { value: 'bloating', label: 'Chướng bụng', icon: 'ellipse' },
  { value: 'back_pain', label: 'Đau lưng', icon: 'person' },
  { value: 'nausea', label: 'Buồn nôn', icon: 'restaurant' },
  { value: 'none', label: 'Không có', icon: 'checkmark-circle' },
];

const MOODS: { value: MoodType; label: string; icon: string; color: string }[] = [
  { value: 'happy', label: 'Vui', icon: 'happy', color: '#10B981' },
  { value: 'neutral', label: 'Bình thường', icon: 'meh', color: COLORS.primary },
  { value: 'sad', label: 'Buồn', icon: 'sad', color: '#3B82F6' },
  { value: 'anxious', label: 'Lo lắng', icon: 'alert', color: COLORS.warning },
  { value: 'irritated', label: 'Cáu gắt', icon: 'flame', color: COLORS.danger },
  { value: 'tired', label: 'Mệt mỏi', icon: 'moon', color: '#8B5CF6' },
];

export default function CycleScreen() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cycleLength, setCycleLength] = useState(28);
  const [periodStart, setPeriodStart] = useState('');
  const [selectedSymptom, setSelectedSymptom] = useState<SymptomType | null>(null);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [entries, setEntries] = useState<CycleEntry[]>([]);

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());

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
      // Fetch profile cycle data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('cycle_length_days')
        .eq('id', session.user.id)
        .single();
      if (profileData?.cycle_length_days) setCycleLength(profileData.cycle_length_days);

      // Fetch history
      const { data } = await supabase
        .from('cycle_records')
        .select('*')
        .eq('user_id', session.user.id)
        .order('period_start', { ascending: false })
        .limit(10);
      if (data) setEntries(data as CycleEntry[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const handleDateChange = useCallback((event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      setPeriodStart(formatDate(selectedDate));
      setTempDate(selectedDate);
    }
  }, []);

  const openDatePicker = () => {
    const d = periodStart ? new Date(periodStart) : new Date();
    setTempDate(d);
    setShowDatePicker(true);
  };

  const handleLogPeriod = async () => {
    if (!periodStart) {
      Alert.alert('Lỗi', 'Vui lòng chọn ngày bắt đầu kỳ kinh');
      return;
    }

    const { error } = await supabase.from('cycle_records').insert({
      user_id: session?.user.id,
      period_start: periodStart,
      period_end: null,
      cycle_length: cycleLength,
      symptom: selectedSymptom,
      mood: selectedMood,
      is_predicted: false,
    });

    if (error) {
      Alert.alert('Lỗi', error.message || 'Không thể ghi nhận');
      return;
    }

    Alert.alert(
      'Đã ghi nhận! 📅',
      `Ngày bắt đầu kỳ kinh: ${new Date(periodStart).toLocaleDateString('vi-VN')}`,
      [{ text: 'OK' }]
    );

    // Reset
    setPeriodStart('');
    setSelectedSymptom(null);
    setSelectedMood(null);
    fetchData();
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysToNext = periodStart
    ? Math.ceil((new Date(periodStart).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;

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
        <Text style={styles.headerTitle}>Cycle</Text>
        <TouchableOpacity onPress={() => router.push('/settings/goals')}>
          <Ionicons name="settings-outline" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Cycle Overview */}
      <View style={styles.overviewCard}>
        <View style={styles.cycleCircle}>
          <Ionicons name="calendar" size={48} color={COLORS.accent} />
          <Text style={styles.cycleDay}>
            {daysToNext !== null ? `Ngày ${28 - daysToNext}` : 'Chu kỳ 28 ngày'}
          </Text>
          <Text style={styles.cycleSub}>{cycleLength} ngày</Text>
        </View>
        {daysToNext !== null && daysToNext > 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              {daysToNext} ngày tới kỳ kinh tiếp theo
            </Text>
          </View>
        )}
      </View>

      {/* Log Period */}
      <View style={styles.logSection}>
        <Text style={styles.sectionTitle}>Ghi nhận chu kỳ</Text>

        <TouchableOpacity style={styles.inputRow} onPress={openDatePicker}>
          <Ionicons name="calendar" size={20} color={COLORS.textTertiary} />
          <Text style={styles.dateDisplay}>
            {periodStart
              ? new Date(periodStart).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
              : 'Chọn ngày bắt đầu'}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
        </TouchableOpacity>

        {/* Symptom Selection */}
        <View style={styles.symptomSection}>
          <Text style={styles.subTitle}>Triệu chứng</Text>
          <View style={styles.grid}>
            {SYMPTOMS.map(s => (
              <TouchableOpacity
                key={s.value}
                style={[styles.symptomBtn, selectedSymptom === s.value && styles.symptomBtnActive]}
                onPress={() => setSelectedSymptom(s.value === selectedSymptom ? null : s.value)}
              >
                <Ionicons name={s.icon as any} size={20} color={selectedSymptom === s.value ? COLORS.textInverse : COLORS.textSecondary} />
                <Text style={[styles.symptomText, selectedSymptom === s.value && styles.symptomTextActive]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Mood Selection */}
        <View style={styles.moodSection}>
          <Text style={styles.subTitle}>Tâm trạng</Text>
          <View style={styles.grid}>
            {MOODS.map(m => (
              <TouchableOpacity
                key={m.value}
                style={[styles.moodBtn, selectedMood === m.value && styles.moodBtnActive]}
                onPress={() => setSelectedMood(m.value === selectedMood ? null : m.value)}
              >
                <Ionicons name={m.icon as any} size={20} color={selectedMood === m.value ? m.color : COLORS.textSecondary} />
                <Text style={[styles.moodText, selectedMood === m.value && styles.moodTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleLogPeriod}>
          <Text style={styles.submitBtnText}>Ghi nhận</Text>
        </TouchableOpacity>
      </View>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="spinner"
          onChange={handleDateChange}
          style={styles.picker}
        />
      )}

      {/* History */}
      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>Lịch sử chu kỳ</Text>
        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={COLORS.textTertiary} />
            <Text style={styles.emptyText}>Chưa có dữ liệu</Text>
            <Text style={styles.emptySub}>Hãy ghi nhận chu kỳ đầu tiên</Text>
          </View>
        ) : (
          entries.map(entry => (
            <View key={entry.id} style={styles.historyItem}>
              <View style={styles.historyLeft}>
                <Text style={styles.historyDate}>
                  {new Date(entry.period_start).toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'short' })}
                </Text>
                {entry.symptom && (
                  <Text style={styles.historySymptom}>
                    Triệu chứng: {SYMPTOMS.find(s => s.value === entry.symptom)?.label}
                  </Text>
                )}
                {entry.mood && (
                  <Text style={styles.historySymptom}>
                    Tâm trạng: {MOODS.find(m => m.value === entry.mood)?.label}
                  </Text>
                )}
              </View>
              {entry.cycle_length && (
                <View style={styles.cycleLengthBadge}>
                  <Text style={styles.cycleLengthText}>{entry.cycle_length} ngày</Text>
                </View>
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
  headerTitle: { fontSize: FONT_SIZES.xl, fontWeight: 'bold', fontFamily: FONT_FAMILY.bold as string },
  overviewCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: 20,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  cycleCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleDay: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: 8 },
  cycleSub: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontFamily: FONT_FAMILY.base as string },
  infoCard: {
    backgroundColor: COLORS.accent + '15',
    borderRadius: BORDER_RADIUS.md,
    padding: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  infoText: { fontSize: FONT_SIZES.sm, color: COLORS.accent, fontWeight: '600' },
  logSection: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    marginTop: 20,
    ...SHADOWS.sm,
  },
  sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: 'bold', fontFamily: FONT_FAMILY.bold as string, marginBottom: 16 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
  },
  dateDisplay: { flex: 1, fontSize: FONT_SIZES.base, color: COLORS.textPrimary, fontFamily: FONT_FAMILY.base as string, marginLeft: 10 },
  symptomSection: { marginBottom: 20 },
  moodSection: { marginBottom: 20 },
  subTitle: { fontSize: FONT_SIZES.sm, fontWeight: '600', fontFamily: FONT_FAMILY.semiBold as string, color: COLORS.textSecondary, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  symptomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  symptomBtnActive: { backgroundColor: COLORS.accent + '20' },
  symptomText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontFamily: FONT_FAMILY.base as string },
  symptomTextActive: { color: COLORS.accent, fontWeight: '600' },
  moodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  moodBtnActive: { backgroundColor: COLORS.primary + '20' },
  moodText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontFamily: FONT_FAMILY.base as string },
  moodTextActive: { color: COLORS.primary, fontWeight: '600' },
  submitBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: { color: COLORS.textInverse, fontWeight: '600', fontSize: FONT_SIZES.base, fontFamily: FONT_FAMILY.semiBold as string },
  picker: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    marginVertical: 12,
  },
  historySection: { marginTop: 20 },
  historyTitle: { fontSize: FONT_SIZES.lg, fontWeight: 'bold', fontFamily: FONT_FAMILY.bold as string, marginBottom: 12 },
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
  historyLeft: { flex: 1 },
  historyDate: { fontSize: FONT_SIZES.base, fontWeight: '600', fontFamily: FONT_FAMILY.semiBold as string, color: COLORS.textPrimary },
  historySymptom: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontFamily: FONT_FAMILY.base as string, marginTop: 4 },
  cycleLengthBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  cycleLengthText: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.textPrimary, marginTop: 12 },
  emptySub: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontFamily: FONT_FAMILY.base as string, marginTop: 4 },
});
