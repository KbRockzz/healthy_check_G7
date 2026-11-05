/**
 * Màn hình Sleep Tracker - Tích hợp Chế độ Dark Mode & Phân tích Giai đoạn Giấc ngủ
 * Khớp thiết kế Mockup #6: Dashboard - Sleep Tracker.png & Tích hợp Roboto Fonts
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS, FONT_FAMILY } from '@/theme';
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
}

export default function SleepScreen() {
  const router = useRouter();
  const { session, profile, loading: authLoading } = useAuth();

  // Dark Mode state (Đặc biệt phù hợp cho giao diện xem trước khi ngủ)
  const [isDarkMode, setIsDarkMode] = useState(true);

  const [todaySleepMins, setTodaySleepMins] = useState<number>(0);
  const [goalMins, setGoalMins] = useState<number>(480); // 8h
  const [bedtime, setBedtime] = useState('23:15');
  const [wakeTime, setWakeTime] = useState('06:45');
  const [loaded, setLoaded] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Log form state
  const [inputBedtime, setInputBedtime] = useState('23:00');
  const [inputWakeTime, setInputWakeTime] = useState('07:00');

  const fetchData = useCallback(async () => {
    if (!session) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const storageKey = `@healthy_check_sleep_${today}`;
      const savedSleep = await AsyncStorage.getItem(storageKey);
      if (savedSleep) setTodaySleepMins(parseInt(savedSleep, 10));

      const { data } = await supabase
        .from('sleep_records')
        .select('*')
        .eq('user_id', session.user.id)
        .order('sleep_date', { ascending: false })
        .limit(7);

      if (data && data.length > 0) {
        setEntries(data as SleepEntry[]);
        const latest = data[0];
        if (latest.sleep_date === today) {
          setTodaySleepMins(latest.total_minutes);
          await AsyncStorage.setItem(storageKey, latest.total_minutes.toString());
        }
      }

      // Luôn lấy từ profile để đảm bảo goal hiện tại
      if (profile?.sleep_goal_minutes) setGoalMins(profile.sleep_goal_minutes);
      if (profile?.bedtime) setBedtime(profile.bedtime);
      if (profile?.wake_time) setWakeTime(profile.wake_time);
      setLoaded(true);
    } catch {
      setLoaded(true);
      // keep state
    }
  }, [session, profile]);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.replace('/auth/sign-in');
      return;
    }
    fetchData();
  }, [session, authLoading, fetchData]);

  const handleLogSleep = async () => {
    if (!inputBedtime || !inputWakeTime) {
      Alert.alert('Lỗi', 'Vui lòng nhập giờ đi ngủ và thức dậy');
      return;
    }

    const [bH, bM] = inputBedtime.split(':').map(Number);
    const [wH, wM] = inputWakeTime.split(':').map(Number);
    let totalM = (wH * 60 + wM) - (bH * 60 + bM);
    if (totalM < 0) totalM += 24 * 60; // Overnight

    const deepM = Math.round(totalM * 0.30);
    const lightM = Math.round(totalM * 0.50);
    const remM = Math.round(totalM * 0.20);

    const today = new Date().toISOString().split('T')[0];
    const storageKey = `@healthy_check_sleep_${today}`;

    setTodaySleepMins(totalM);
    setBedtime(inputBedtime);
    setWakeTime(inputWakeTime);

    try {
      await AsyncStorage.setItem(storageKey, totalM.toString());
      await supabase.from('sleep_records').insert({
        user_id: session?.user.id,
        sleep_date: today,
        total_minutes: totalM,
        deep_minutes: deepM,
        light_minutes: lightM,
        rem_minutes: remM,
        quality_score: Math.min(100, Math.round((totalM / goalMins) * 100)),
      });
      // Refresh data to reflect change
      await fetchData();
    } catch {
      // local update persisted
    }

    setShowLogModal(false);
    Alert.alert('Thành công! 🌙', `Đã lưu giấc ngủ: ${Math.floor(totalM / 60)}h ${totalM % 60}m`);
  };

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Hôm nay';
    if (d.toDateString() === yesterday.toDateString()) return 'Hôm qua';
    return d.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const selectedEntry = entries.find(e => e.sleep_date === selectedDate) || entries[0];
  const displaySleepMins = selectedEntry ? selectedEntry.total_minutes : todaySleepMins;

  // Dynamic colors based on theme
  const theme = {
    bg: isDarkMode ? '#0B0F19' : COLORS.bg,
    cardBg: isDarkMode ? '#111827' : COLORS.card,
    cardBorder: isDarkMode ? '#1F2937' : COLORS.border,
    textPrimary: isDarkMode ? '#F9FAFB' : COLORS.textPrimary,
    textSecondary: isDarkMode ? '#9CA3AF' : COLORS.textSecondary,
    textTertiary: isDarkMode ? '#6B7280' : COLORS.textTertiary,
    pillBg: isDarkMode ? '#1E293B' : '#F1F5F9',
    accent: '#818CF8',
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Theo dõi giấc ngủ</Text>
        <TouchableOpacity
          style={[styles.themeToggle, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
          onPress={() => setIsDarkMode(!isDarkMode)}
        >
          <Ionicons
            name={isDarkMode ? 'sunny' : 'moon'}
            size={20}
            color={isDarkMode ? '#FBBF24' : '#6366F1'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Date Selector */}
        <View style={styles.dateSelector}>
          <Text style={styles.dateSelectorLabel}>Chọn ngày</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
            {entries.map((entry) => (
              <TouchableOpacity
                key={entry.sleep_date}
                style={[styles.dateChip, selectedDate === entry.sleep_date && styles.dateChipActive]}
                onPress={() => setSelectedDate(entry.sleep_date)}
              >
                <Text style={[styles.dateChipText, selectedDate === entry.sleep_date && styles.dateChipTextActive]}>
                  {formatDateLabel(entry.sleep_date)}
                </Text>
                <Text style={[styles.dateChipSteps, selectedDate === entry.sleep_date && styles.dateChipStepsActive]}>
                  {Math.floor(entry.total_minutes / 60)}h {entry.total_minutes % 60}m
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          <View style={styles.heroTop}>
            <View>
              <Text style={[styles.heroDate, { color: theme.textSecondary }]}>{formatDateLabel(selectedDate)}</Text>
              <Text style={[styles.heroHours, { color: theme.textPrimary }]}>
                {Math.floor(displaySleepMins / 60)}<Text style={styles.heroUnit}>h </Text>{displaySleepMins % 60}<Text style={styles.heroUnit}>m</Text>
              </Text>
            </View>
            <View style={styles.qualityCircle}>
              <Text style={styles.qualityNum}>{goalMins > 0 ? Math.min(100, Math.round((displaySleepMins / goalMins) * 100)) : 0}%</Text>
              <Text style={styles.qualityLabel}>Mục tiêu</Text>
            </View>
          </View>

          <View style={styles.heroBadgeRow}>
            <View style={styles.qualityPill}>
              <Ionicons name="sparkles" size={12} color="#10B981" />
              <Text style={styles.qualityPillText}>Giấc ngủ sâu tối ưu</Text>
            </View>
            <Text style={[styles.goalNote, { color: theme.textTertiary }]}>Mục tiêu: {Math.floor(goalMins / 60)}h/đêm</Text>
          </View>
        </View>

        {/* Schedule Card (Bedtime & Wake time) */}
        <View style={[styles.scheduleCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          <View style={styles.scheduleItem}>
            <View style={[styles.schedIcon, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
              <Ionicons name="bed" size={20} color="#818CF8" />
            </View>
            <View>
              <Text style={[styles.schedLabel, { color: theme.textSecondary }]}>Giờ đi ngủ</Text>
              <Text style={[styles.schedVal, { color: theme.textPrimary }]}>{bedtime}</Text>
            </View>
          </View>

          <View style={[styles.schedDivider, { backgroundColor: theme.cardBorder }]} />

          <View style={styles.scheduleItem}>
            <View style={[styles.schedIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Ionicons name="sunny" size={20} color="#FBBF24" />
            </View>
            <View>
              <Text style={[styles.schedLabel, { color: theme.textSecondary }]}>Thức dậy</Text>
              <Text style={[styles.schedVal, { color: theme.textPrimary }]}>{wakeTime}</Text>
            </View>
          </View>
        </View>

        {/* Sleep Stages Breakdown */}
        <View style={[styles.stagesCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Phân tích giai đoạn giấc ngủ</Text>
          <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
            Cấu trúc giấc ngủ giúp phục hồi thể chất và tinh thần
          </Text>

          {/* Segmented Timeline Bar */}
          <View style={styles.stageBarContainer}>
            <View style={[styles.stageSegment, { flex: 30, backgroundColor: '#4338CA' }]} />
            <View style={[styles.stageSegment, { flex: 50, backgroundColor: '#38BDF8' }]} />
            <View style={[styles.stageSegment, { flex: 20, backgroundColor: '#A855F7' }]} />
          </View>

          {/* Stages Legend */}
          <View style={styles.stagesLegend}>
            <View style={styles.legendCol}>
              <View style={[styles.legendDot, { backgroundColor: '#4338CA' }]} />
              <View>
                <Text style={[styles.legendName, { color: theme.textPrimary }]}>Ngủ sâu</Text>
                <Text style={styles.legendTime}>2h 15m (30%)</Text>
              </View>
            </View>

            <View style={styles.legendCol}>
              <View style={[styles.legendDot, { backgroundColor: '#38BDF8' }]} />
              <View>
                <Text style={[styles.legendName, { color: theme.textPrimary }]}>Ngủ nông</Text>
                <Text style={styles.legendTime}>3h 45m (50%)</Text>
              </View>
            </View>

            <View style={styles.legendCol}>
              <View style={[styles.legendDot, { backgroundColor: '#A855F7' }]} />
              <View>
                <Text style={[styles.legendName, { color: theme.textPrimary }]}>Giai đoạn REM (Mơ)</Text>
                <Text style={styles.legendTime}>1h 30m (20%)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sleep Hygiene Tips */}
        <View style={[styles.tipsCard, { backgroundColor: isDarkMode ? '#1E1B4B' : '#EEF2FF' }]}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb" size={18} color="#818CF8" />
            <Text style={[styles.tipsTitle, { color: isDarkMode ? '#C7D2FE' : '#3730A3' }]}>
              Mẹo cải thiện giấc ngủ hôm nay
            </Text>
          </View>
          <Text style={[styles.tipText, { color: isDarkMode ? '#A5B4FC' : '#4338CA' }]}>
            • Giữ nhiệt độ phòng ngủ từ 19°C – 21°C để dễ chìm vào pha ngủ sâu.{'\n'}
            • Ngừng sử dụng thiết bị màn hình xanh 30 phút trước khi ngủ.{'\n'}
            • Tránh đồ uống chứa caffein sau 14:00 chiều.
          </Text>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.logButton}
          onPress={() => setShowLogModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.logButtonText}>Ghi nhận giấc ngủ đêm qua</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Log Sleep Modal */}
      <Modal
        visible={showLogModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLogModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.cardBg }]}>
            <View style={styles.modalTopRow}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Ghi nhận giấc ngủ</Text>
              <TouchableOpacity onPress={() => setShowLogModal(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Giờ đi ngủ (HH:MM)</Text>
                <TextInput
                  style={[styles.modalInput, { color: theme.textPrimary, borderColor: theme.cardBorder }]}
                  value={inputBedtime}
                  onChangeText={setInputBedtime}
                  placeholder="23:00"
                  placeholderTextColor={theme.textTertiary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Giờ thức dậy (HH:MM)</Text>
                <TextInput
                  style={[styles.modalInput, { color: theme.textPrimary, borderColor: theme.cardBorder }]}
                  value={inputWakeTime}
                  onChangeText={setInputWakeTime}
                  placeholder="07:00"
                  placeholderTextColor={theme.textTertiary}
                />
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleLogSleep}>
                <Text style={styles.saveBtnText}>Lưu & Cập nhật</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0F19' },
  container: { flex: 1 },
  dateSelector: { paddingHorizontal: 20, marginTop: 8, marginBottom: 12 },
  dateSelectorLabel: { fontSize: 13, fontWeight: '600', color: '#A5B4FC', marginBottom: 8, fontFamily: FONT_FAMILY.semiBold as string },
  dateRow: { gap: 8 },
  dateChip: { backgroundColor: '#1E293B', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  dateChipActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  dateChipText: { fontSize: 11, fontWeight: '600', color: '#F1F5F9', fontFamily: FONT_FAMILY.semiBold as string },
  dateChipTextActive: { color: '#FFFFFF' },
  dateChipSteps: { fontSize: 10, color: '#94A3B8', marginTop: 2, fontFamily: FONT_FAMILY.base as string },
  dateChipStepsActive: { color: 'rgba(255,255,255,0.8)' },  header: {
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
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  heroCard: {
    borderRadius: 24,
    padding: 22,
    marginTop: 8,
    borderWidth: 1,
    ...SHADOWS.md,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroDate: { fontSize: 12, marginBottom: 4, fontFamily: FONT_FAMILY.base as string },
  heroHours: { fontSize: 44, fontWeight: '900', fontFamily: FONT_FAMILY.bold as string },
  heroUnit: { fontSize: 24, fontWeight: '500' },
  qualityCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    borderWidth: 3,
    borderColor: '#818CF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qualityNum: { fontSize: 18, fontWeight: 'bold', fontFamily: FONT_FAMILY.bold as string, color: '#818CF8' },
  qualityLabel: { fontSize: 10, color: '#A5B4FC', fontFamily: FONT_FAMILY.base as string },
  heroBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  qualityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  qualityPillText: { fontSize: 11, fontWeight: '700', fontFamily: FONT_FAMILY.bold as string, color: '#34D399' },
  goalNote: { fontSize: 12, fontFamily: FONT_FAMILY.base as string },
  scheduleCard: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  scheduleItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  schedIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  schedLabel: { fontSize: 11, marginBottom: 2, fontFamily: FONT_FAMILY.base as string },
  schedVal: { fontSize: 17, fontWeight: 'bold', fontFamily: FONT_FAMILY.bold as string },
  schedDivider: { width: 1, height: 36, marginHorizontal: 12 },
  stagesCard: {
    borderRadius: 20,
    padding: 18,
    marginTop: 14,
    borderWidth: 1,
  },
  cardTitle: { fontSize: 15, fontWeight: 'bold', fontFamily: FONT_FAMILY.bold as string },
  cardSub: { fontSize: 12, marginTop: 2, marginBottom: 16, fontFamily: FONT_FAMILY.base as string },
  stageBarContainer: {
    height: 14,
    borderRadius: 7,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 16,
  },
  stageSegment: { height: '100%' },
  stagesLegend: { flexDirection: 'row', justifyContent: 'space-between' },
  legendCol: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  legendName: { fontSize: 11, fontWeight: '600', fontFamily: FONT_FAMILY.semiBold as string },
  legendTime: { fontSize: 10, color: '#9CA3AF', marginTop: 2, fontFamily: FONT_FAMILY.base as string },
  tipsCard: {
    borderRadius: 18,
    padding: 16,
    marginTop: 14,
  },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tipsTitle: { fontSize: 13, fontWeight: '700', fontFamily: FONT_FAMILY.bold as string },
  tipText: { fontSize: 12, lineHeight: 18, fontFamily: FONT_FAMILY.base as string },
  logButton: {
    backgroundColor: '#6366F1',
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    ...SHADOWS.md,
  },
  logButtonText: { fontSize: 15, fontWeight: '700', fontFamily: FONT_FAMILY.bold as string, color: '#FFFFFF' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
  },
  modalTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', fontFamily: FONT_FAMILY.bold as string },
  modalForm: { gap: 16 },
  inputGroup: {},
  inputLabel: { fontSize: 12, fontWeight: '600', fontFamily: FONT_FAMILY.semiBold as string, marginBottom: 6 },
  modalInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: FONT_FAMILY.base as string,
  },
  saveBtn: {
    backgroundColor: '#6366F1',
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveBtnText: { fontSize: 15, fontWeight: 'bold', fontFamily: FONT_FAMILY.bold as string, color: '#FFFFFF' },
});
