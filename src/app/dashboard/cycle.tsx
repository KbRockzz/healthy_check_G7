/**
 * Màn hình Cycle Tracker - Bánh xe Chu kỳ, Cửa sổ Thụ thai & Nhật ký Triệu chứng
 * Khớp thiết kế Mockup #8: Dashboard- Cycle Tracker.png & Tích hợp Roboto Fonts
 */
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS, FONT_FAMILY } from '@/theme';
import { useAuth } from '@/lib/hooks/use-auth';
import { supabase } from '@/lib/supabase';

const SYMPTOMS = [
  { id: 'cramps', label: 'Đau bụng', icon: 'flash' },
  { id: 'headache', label: 'Đau đầu', icon: 'fitness' },
  { id: 'acne', label: 'Mụn trứng cá', icon: 'sparkles' },
  { id: 'fatigue', label: 'Mệt mỏi', icon: 'battery-dead' },
  { id: 'bloating', label: 'Chướng bụng', icon: 'ellipse' },
  { id: 'tender_breasts', label: 'Căng tức ngực', icon: 'heart' },
];

const MOODS = [
  { id: 'happy', label: 'Vui vẻ', emoji: '😊' },
  { id: 'calm', label: 'Điềm tĩnh', emoji: '😌' },
  { id: 'sensitive', label: 'Nhạy cảm', emoji: '🥺' },
  { id: 'anxious', label: 'Lo âu', emoji: '😰' },
  { id: 'tired', label: 'Uể oải', emoji: '🥱' },
];

export default function CycleScreen() {
  const router = useRouter();
  const { session, profile, loading: authLoading } = useAuth();

  const [currentDay, setCurrentDay] = useState(14);
  const [cycleLength, setCycleLength] = useState(28);
  const [periodStart, setPeriodStart] = useState<string>('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['cramps']);
  const [selectedMood, setSelectedMood] = useState<string>('calm');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.replace('/auth/sign-in');
      return;
    }
    loadCycleData();
    if (profile?.cycle_length_days) setCycleLength(profile.cycle_length_days);
  }, [session, profile, authLoading]);

  async function loadCycleData() {
    if (!session) return;
    try {
      const { data, error } = await supabase
        .from('cycle_records')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (error || !data || data.length === 0) return;
      const rec = data[0];
      if (rec?.period_start) {
        setPeriodStart(rec.period_start);
        const start = new Date(rec.period_start);
        const today = new Date();
        const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const day = ((diffDays % rec.cycle_length) + rec.cycle_length) % rec.cycle_length + 1;
        setCurrentDay(day);
        if (rec.cycle_length) setCycleLength(rec.cycle_length);
      }
      if (rec?.symptom) setSelectedSymptoms([rec.symptom]);
      if (rec?.mood) setSelectedMood(rec.mood);
    } catch { /* ignore */ }
  }



  const toggleSymptom = (id: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const daysToNext = cycleLength - currentDay;

  async function handleSave() {
    if (!session?.user?.id) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase.from('cycle_records').upsert({
        user_id: session.user.id,
        period_start: periodStart || today,
        cycle_length: cycleLength,
        symptom: selectedSymptoms[0] || null,
        mood: selectedMood || null,
        is_predicted: false,
        notes: null,
      }, { onConflict: 'user_id' });
      if (error) throw error;
      Alert.alert('Đã lưu! 🌸', 'Nhật ký chu kỳ đã được cập nhật lên hệ thống.');
      await loadCycleData();
    } catch (err: any) {
      Alert.alert('Lỗi lưu dữ liệu', err.message || 'Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cycle Tracker</Text>
        <TouchableOpacity onPress={() => Alert.alert('Thông tin chu kỳ', 'Chu kỳ trung bình: 28 ngày.\nKỳ kinh: 5 ngày.\nCửa sổ rụng trứng: Ngày 12 - 16.')}>
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
            <Ionicons name="sparkles" size={14} color="#BE185D" />
            <Text style={styles.statusPillText}>Cửa sổ rụng trứng (Ovulation Window)</Text>
          </View>

          <Text style={styles.heroSummary}>
            Khả năng thụ thai cao hôm nay. Kỳ kinh tiếp theo dự kiến trong <Text style={{ fontWeight: 'bold' }}>{daysToNext} ngày</Text>.
          </Text>
        </View>

        {/* Mini Cycle Calendar Strip */}
        <View style={styles.calendarCard}>
          <Text style={styles.cardSectionTitle}>Lịch chu kỳ tháng này</Text>
          <View style={styles.calendarStrip}>
            {[10, 11, 12, 13, 14, 15, 16].map((day) => {
              const isToday = day === 14;
              const isFertile = day >= 12 && day <= 16;
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
                    {isToday ? 'Hôm nay' : isFertile ? 'Thụ thai' : 'An toàn'}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Symptoms Log */}
        <View style={styles.sectionWrap}>
          <Text style={styles.cardSectionTitle}>Ghi nhận biểu hiện thể trạng</Text>
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

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Đang lưu...' : 'Lưu ghi nhận thể trạng'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 24,
    fontWeight: '900',
    fontFamily: FONT_FAMILY.bold as string,
    color: '#BE185D',
  },
  cycleTotal: {
    fontSize: 12,
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
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: 44,
  },
  calDayToday: { backgroundColor: '#DB2777', borderColor: '#BE185D' },
  calDayFertile: { backgroundColor: '#FDF2F8', borderColor: '#FBCFE8' },
  calDayNum: {
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: COLORS.textPrimary,
  },
  calDayNumActive: { color: '#FFFFFF' },
  calDaySub: {
    fontSize: 8,
    color: COLORS.textTertiary,
    fontFamily: FONT_FAMILY.base as string,
    marginTop: 4,
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
  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodBtn: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    flex: 1,
    marginHorizontal: 3,
  },
  moodBtnActive: { borderColor: '#DB2777', backgroundColor: '#FDF2F8' },
  moodEmoji: { fontSize: 24, marginBottom: 4 },
  moodLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
    fontFamily: FONT_FAMILY.base as string,
  },
  moodLabelActive: { color: '#BE185D', fontWeight: 'bold' },
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
