/**
 * Màn hình Cycle Tracker - Theo dõi chu kỳ, Nhật ký hàng ngày, Cảm xúc & Triệu chứng
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, FONT_FAMILY } from '@/theme';
import { useAuth } from '@/lib/hooks/use-auth';
import { supabase } from '@/lib/supabase';

const SYMPTOMS = [
  { id: 'cramps', label: 'Đau bụng', icon: 'flash' },
  { id: 'headache', label: 'Đau đầu', icon: 'fitness' },
  { id: 'acne', label: 'Mụn trứng cá', icon: 'sparkles' },
  { id: 'fatigue', label: 'Mệt mỏi', icon: 'battery-dead' },
  { id: 'bloating', label: 'Chướng bụng', icon: 'ellipse' },
  { id: 'tender_breasts', label: 'Căng ngực', icon: 'heart' },
];

const MOODS = [
  { id: 'happy', label: 'Vui vẻ', emoji: '😊' },
  { id: 'calm', label: 'Điềm tĩnh', emoji: '😌' },
  { id: 'sensitive', label: 'Nhạy cảm', emoji: '🥺' },
  { id: 'anxious', label: 'Lo âu', emoji: '😰' },
  { id: 'tired', label: 'Uể oải', emoji: '🥱' },
];

const FLOWS = [
  { id: 'none', label: 'Không' },
  { id: 'spotting', label: 'Đốm nhẹ' },
  { id: 'light', label: 'Ít' },
  { id: 'medium', label: 'Vừa' },
  { id: 'heavy', label: 'Nhiều' },
];

export default function CycleScreen() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();

  const [currentDay, setCurrentDay] = useState<number>(1);
  const [cycleLength, setCycleLength] = useState<number>(28);
  const [periodStart, setPeriodStart] = useState<string>('');

  // Daily log state
  const [selectedFlow, setSelectedFlow] = useState<string>('none');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchCycleData = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const today = new Date().toISOString().split('T')[0];

      // 1. Fetch latest period
      const { data: periodData } = await supabase
        .from('cycle_periods')
        .select('*')
        .eq('user_id', session.user.id)
        .order('period_start', { ascending: false })
        .limit(1);

      if (periodData && periodData.length > 0) {
        const p = periodData[0];
        setPeriodStart(p.period_start);
        if (p.cycle_length) setCycleLength(p.cycle_length);

        const start = new Date(p.period_start);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const len = p.cycle_length || 28;
        const day = ((diffDays % len) + len) % len + 1;
        setCurrentDay(day);
      }

      // 2. Fetch today's daily log
      const { data: logData } = await supabase
        .from('cycle_daily_logs')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('log_date', today)
        .single();

      if (logData) {
        if (logData.flow) setSelectedFlow(logData.flow);
        if (logData.symptoms) setSelectedSymptoms(logData.symptoms);
        if (logData.mood) setSelectedMood(logData.mood);
        if (logData.notes) setNotes(logData.notes);
      }
    } catch {
      // ignore
    } finally {
      setLoaded(true);
    }
  }, [session]);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.replace('/auth/sign-in');
      return;
    }
    fetchCycleData();
  }, [session, authLoading, fetchCycleData]);

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const daysToNext = currentDay > 0 ? cycleLength - currentDay : 0;
  const isOvulation = currentDay >= (cycleLength - 14) && currentDay <= (cycleLength - 10);
  const isPeriod = currentDay <= 5;

  const handleSaveDailyLog = async () => {
    if (!session?.user?.id) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // Save daily log
      const { error } = await supabase.from('cycle_daily_logs').upsert({
        user_id: session.user.id,
        log_date: today,
        flow: selectedFlow,
        symptoms: selectedSymptoms,
        mood: selectedMood || null,
        notes: notes || null,
      }, { onConflict: 'user_id,log_date' });

      if (error) throw error;

      // If user logs period flow, ensure cycle_periods exists for today or recent
      if (selectedFlow !== 'none' && !periodStart) {
        await supabase.from('cycle_periods').upsert({
          user_id: session.user.id,
          period_start: today,
          cycle_length: cycleLength,
          is_predicted: false,
        }, { onConflict: 'user_id,is_predicted' });
        setPeriodStart(today);
      }

      Alert.alert('Đã lưu! 🌸', 'Nhật ký hàng ngày đã được cập nhật thành công.');
      await fetchCycleData();
    } catch (err: any) {
      Alert.alert('Lỗi lưu dữ liệu', err.message || 'Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#DB2777" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cycle Tracker</Text>
        <TouchableOpacity onPress={() => Alert.alert('Thông tin chu kỳ', `Chu kỳ trung bình: ${cycleLength} ngày.\nKỳ kinh: 5 ngày.\nCửa sổ rụng trứng: Ngày ${cycleLength - 14} - ${cycleLength - 10}.`)}>
          <Ionicons name="information-circle-outline" size={24} color="#DB2777" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Cycle Wheel Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.cycleCircleWrap}>
            <View style={styles.cycleCircle}>
              <Text style={styles.cycleDayNum}>Day {currentDay}</Text>
              <Text style={styles.cycleTotal}>/ {cycleLength} ngày</Text>
            </View>
          </View>

          <View style={styles.statusPill}>
            <Ionicons
              name={isPeriod ? 'water' : isOvulation ? 'sparkles' : 'shield-checkmark'}
              size={14}
              color={isPeriod ? '#EF4444' : isOvulation ? '#BE185D' : '#10B981'}
            />
            <Text style={styles.statusPillText}>
              {isPeriod ? 'Đang trong kỳ kinh' : isOvulation ? 'Cửa sổ rụng trứng' : 'Giai đoạn an toàn'}
            </Text>
          </View>

          <Text style={styles.heroSummary}>
            {isPeriod
              ? `Kỳ kinh nguyệt dự kiến kéo dài 5 ngày. Hôm nay là ngày thứ ${currentDay}.`
              : isOvulation
              ? 'Khả năng thụ thai cao trong giai đoạn này.'
              : `Kỳ kinh tiếp theo dự kiến trong ${daysToNext} ngày tới.`}
          </Text>
        </View>

        {/* Mini Cycle Calendar Strip */}
        <View style={styles.calendarCard}>
          <Text style={styles.cardSectionTitle}>Lịch chu kỳ</Text>
          <View style={styles.calendarStrip}>
            {Array.from({ length: 7 }, (_, i) => {
              const day = ((currentDay - 3 + i + cycleLength) % cycleLength) + 1;
              const isToday = day === currentDay;
              const isFertile = day >= (cycleLength - 14) && day <= (cycleLength - 10);
              const isPer = day <= 5;
              return (
                <View
                  key={day}
                  style={[
                    styles.calDayBox,
                    isToday && styles.calDayToday,
                    isFertile && !isToday && styles.calDayFertile,
                  ]}
                >
                  <Text style={[styles.calDayNum, isToday && styles.calDayNumActive]}>
                    {day}
                  </Text>
                  <Text style={[styles.calDaySub, isToday && styles.calDaySubActive]}>
                    {isToday ? 'Hôm nay' : isPer ? 'Kinh' : isFertile ? 'Thụ thai' : 'An toàn'}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Flow Log */}
        <View style={styles.sectionWrap}>
          <Text style={styles.cardSectionTitle}>Lượng kinh nguyệt (Period Flow)</Text>
          <View style={styles.moodRow}>
            {FLOWS.map((f) => {
              const isSelected = selectedFlow === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.moodBtn, isSelected && styles.moodBtnActive]}
                  onPress={() => setSelectedFlow(f.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.moodLabel, isSelected && styles.moodLabelActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Symptoms Log */}
        <View style={styles.sectionWrap}>
          <Text style={styles.cardSectionTitle}>Triệu chứng cơ thể</Text>
          <View style={styles.pillGrid}>
            {SYMPTOMS.map((sym) => {
              const isSelected = selectedSymptoms.includes(sym.id);
              return (
                <TouchableOpacity
                  key={sym.id}
                  style={[styles.symptomPill, isSelected && styles.symptomPillActive]}
                  onPress={() => toggleSymptom(sym.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={sym.icon as any}
                    size={16}
                    color={isSelected ? '#FFFFFF' : '#BE185D'}
                  />
                  <Text style={[styles.symptomText, isSelected && styles.symptomTextActive]}>
                    {sym.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Mood Log */}
        <View style={styles.sectionWrap}>
          <Text style={styles.cardSectionTitle}>Cảm xúc hôm nay</Text>
          <View style={styles.moodRow}>
            {MOODS.map((m) => {
              const isSelected = selectedMood === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.moodBtn, isSelected && styles.moodBtnActive]}
                  onPress={() => setSelectedMood(m.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.moodEmoji}>{m.emoji}</Text>
                  <Text style={[styles.moodLabel, isSelected && styles.moodLabelActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Notes Input */}
        <View style={styles.sectionWrap}>
          <Text style={styles.cardSectionTitle}>Ghi chú cá nhân</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Nhập ghi chú hôm nay..."
            placeholderTextColor={COLORS.textTertiary}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSaveDailyLog}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Đang lưu...' : 'Lưu nhật ký hôm nay'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: COLORS.textPrimary,
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  heroCard: {
    backgroundColor: '#FCE7F3',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FBCFE8',
    ...SHADOWS.md,
  },
  cycleCircleWrap: { marginBottom: 16 },
  cycleCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: '#EC4899',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleDayNum: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: FONT_FAMILY.bold as string,
    color: '#BE185D',
  },
  cycleTotal: {
    fontSize: 11,
    color: '#9D174D',
    fontFamily: FONT_FAMILY.base as string,
    marginTop: -2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginBottom: 10,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.bold as string,
    color: '#BE185D',
  },
  heroSummary: {
    fontSize: 13,
    color: '#831843',
    fontFamily: FONT_FAMILY.base as string,
    textAlign: 'center',
    lineHeight: 18,
  },
  calendarCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  calendarStrip: { flexDirection: 'row', justifyContent: 'space-between' },
  calDayBox: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: 42,
  },
  calDayToday: { backgroundColor: '#DB2777', borderColor: '#BE185D' },
  calDayFertile: { backgroundColor: '#FDF2F8', borderColor: '#FBCFE8' },
  calDayNum: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: COLORS.textPrimary,
  },
  calDayNumActive: { color: '#FFFFFF' },
  calDaySub: {
    fontSize: 7,
    color: COLORS.textTertiary,
    fontFamily: FONT_FAMILY.base as string,
    marginTop: 4,
    textAlign: 'center',
  },
  calDaySubActive: { color: '#FCE7F3', fontWeight: 'bold' },
  sectionWrap: { marginTop: 18 },
  pillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  symptomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FDF2F8',
    borderWidth: 1,
    borderColor: '#FBCFE8',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  symptomPillActive: { backgroundColor: '#DB2777', borderColor: '#BE185D' },
  symptomText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FONT_FAMILY.semiBold as string,
    color: '#9D174D',
  },
  symptomTextActive: { color: '#FFFFFF' },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  moodBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    flex: 1,
  },
  moodBtnActive: { borderColor: '#DB2777', backgroundColor: '#FDF2F8' },
  moodEmoji: { fontSize: 20, marginBottom: 2 },
  moodLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '500',
    fontFamily: FONT_FAMILY.base as string,
    textAlign: 'center',
  },
  moodLabelActive: { color: '#BE185D', fontWeight: 'bold' },
  notesInput: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 14,
    fontSize: 14,
    fontFamily: FONT_FAMILY.base as string,
    color: COLORS.textPrimary,
    height: 90,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: '#DB2777',
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    ...SHADOWS.md,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: '#FFFFFF',
  },
});
