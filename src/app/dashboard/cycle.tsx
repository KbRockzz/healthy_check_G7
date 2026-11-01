/**
 * Màn hình Cycle Tracker - Theo dõi chu kỳ, Nhật ký hàng ngày
 * Features: Period start/end marking, History view, Daily logging
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, Modal,
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

interface CyclePeriod {
  id: number;
  user_id: string;
  period_start: string;
  period_end: string | null;
  cycle_length: number | null;
  is_predicted: boolean;
}

interface DailyLog {
  id: number;
  user_id: string;
  log_date: string;
  flow: string | null;
  symptoms: string[];
  mood: string | null;
  notes: string | null;
}

export default function CycleScreen() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();

  const [currentDay, setCurrentDay] = useState<number>(1);
  const [cycleLength, setCycleLength] = useState<number>(28);
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');
  const [hasPeriodStarted, setHasPeriodStarted] = useState<boolean>(false);

  // Daily log state
  const [selectedFlow, setSelectedFlow] = useState<string>('none');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Modal states
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [historyPeriods, setHistoryPeriods] = useState<CyclePeriod[]>([]);
  const [avgCycleLength, setAvgCycleLength] = useState<number>(28);
  const [predictedDates, setPredictedDates] = useState<{start: string; end: string}[]>([]);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [flowMap, setFlowMap] = useState<Record<string, string>>({});

  // Fetch cycle data
  const fetchCycleData = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const today = new Date().toISOString().split('T')[0];

      // 1. Fetch latest non-predicted period
      const { data: periodData } = await supabase
        .from('cycle_periods')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('is_predicted', false)
        .order('period_start', { ascending: false })
        .limit(1);

      if (periodData && periodData.length > 0) {
        const p = periodData[0];
        setPeriodStart(p.period_start);
        if (p.period_end) setPeriodEnd(p.period_end);
        if (p.cycle_length) setCycleLength(p.cycle_length);
        setHasPeriodStarted(true);

        const start = new Date(p.period_start);
        const end = p.period_end ? new Date(p.period_end) : null;
        const now = new Date();

        // Calculate current day based on start date
        const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const len = p.cycle_length || 28;
        const day = ((diffDays % len) + len) % len + 1;
        setCurrentDay(day);

        // Tính toán các ngày dự đoán cho 3 chu kỳ tiếp theo
        const predictions = [];
        let nextStart = new Date(start);
        for (let i = 1; i <= 3; i++) {
          nextStart.setDate(nextStart.getDate() + len);
          const pStart = nextStart.toISOString().split('T')[0];
          const nextEnd = new Date(nextStart);
          nextEnd.setDate(nextEnd.getDate() + 5); // mặc định kỳ kinh 5 ngày
          const pEnd = nextEnd.toISOString().split('T')[0];
          predictions.push({ start: pStart, end: pEnd });
        }
        setPredictedDates(predictions);
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

      // 3. Fetch logs for past 3 months for calendar view
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const startDateStr = threeMonthsAgo.toISOString().split('T')[0];

      const { data: logsData } = await supabase
        .from('cycle_daily_logs')
        .select('log_date, flow')
        .eq('user_id', session.user.id)
        .gte('log_date', startDateStr);

      if (logsData) {
        const map: Record<string, string> = {};
        logsData.forEach((item: any) => {
          if (item.flow && item.flow !== 'none') {
            map[item.log_date] = item.flow;
          }
        });
        setFlowMap(map);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoaded(true);
    }
  }, [session]);

  // Fetch history periods
  const fetchHistory = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const { data } = await supabase
        .from('cycle_periods')
        .select('*')
        .eq('user_id', session.user.id)
        .order('period_start', { ascending: false })
        .limit(12);

      if (data) {
        setHistoryPeriods(data);
      }
    } catch (err) {
      console.error('History fetch error:', err);
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
  const isPeriod = hasPeriodStarted && currentDay <= 5;
  const isFertile = currentDay >= 10 && currentDay <= 17;

  // Mark period start
  const handleMarkPeriodStart = async () => {
    if (!session?.user?.id) return;
    try {
      const today = new Date().toISOString().split('T')[0];

      // Check if period already started
      const { data: existing } = await supabase
        .from('cycle_periods')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('is_predicted', false)
        .single();

      if (existing) {
        Alert.alert('Đã lưu!', 'Bạn đã bắt đầu kỳ kinh trước đó.');
        return;
      }

      await supabase.from('cycle_periods').insert({
        user_id: session.user.id,
        period_start: today,
        cycle_length: cycleLength,
        is_predicted: false,
      });

      setPeriodStart(today);
      setHasPeriodStarted(true);
      setCurrentDay(1);
      setShowPeriodModal(false);
      Alert.alert('Đã bắt đầu! 🌸', 'Đã ghi nhận ngày bắt đầu kỳ kinh.');
      await fetchCycleData();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể ghi nhận. Vui lòng thử lại.');
    }
  };

  // Mark period end
  const handleMarkPeriodEnd = async () => {
    if (!session?.user?.id || !periodStart) return;
    try {
      const today = new Date().toISOString().split('T')[0];

      // Update existing period
      const { data: period } = await supabase
        .from('cycle_periods')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('is_predicted', false)
        .single();

      if (period) {
        await supabase
          .from('cycle_periods')
          .update({ period_end: today })
          .eq('id', period.id);

        setPeriodEnd(today);
        setShowPeriodModal(false);
        Alert.alert('Đã kết thúc! 🌸', 'Đã ghi nhận ngày kết thúc kỳ kinh.');
        await fetchCycleData();
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể ghi nhận. Vui lòng thử lại.');
    }
  };

  // Delete period record
  const handleDeletePeriod = async (periodId: number) => {
    Alert.alert(
      'Xóa kỳ kinh',
      'Bạn có chắc muốn xóa kỳ kinh này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.from('cycle_periods').delete().eq('id', periodId);
              Alert.alert('Đã xóa!', 'Kỳ kinh đã được xóa.');
              await fetchCycleData();
              await fetchHistory();
            } catch (err: any) {
              Alert.alert('Lỗi', err.message || 'Không thể xóa.');
            }
          },
        },
      ]
    );
  };

  // Save daily log
  const handleSaveDailyLog = async () => {
    if (!session?.user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('cycle_daily_logs').upsert({
        user_id: session.user.id,
        log_date: selectedDate,
        flow: selectedFlow,
        symptoms: selectedSymptoms,
        mood: selectedMood || null,
        notes: notes || null,
      }, { onConflict: 'user_id,log_date' });

      if (error) throw error;
      Alert.alert('Đã lưu! 🌸', 'Nhật ký đã được cập nhật thành công.');
      await fetchCycleData();
    } catch (err: any) {
      Alert.alert('Lỗi lưu dữ liệu', err.message || 'Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  // Load log for selected date
  const loadDateLog = useCallback(async (date: string) => {
    if (!session?.user?.id) return;
    try {
      const { data, error } = await supabase
        .from('cycle_daily_logs')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('log_date', date)
        .maybeSingle();

      if (error) {
        console.error('Load log error:', error);
        return;
      }

      if (data) {
        setSelectedFlow(data.flow || 'none');
        setSelectedSymptoms(data.symptoms || []);
        setSelectedMood(data.mood || '');
        setNotes(data.notes || '');
      } else {
        // Reset to defaults when no data exists for selected date
        setSelectedFlow('none');
        setSelectedSymptoms([]);
        setSelectedMood('');
        setNotes('');
      }
    } catch (err) {
      console.error('Load log error:', err);
    }
  }, [session]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    loadDateLog(date);
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
        <TouchableOpacity onPress={() => { setShowHistoryModal(true); fetchHistory(); }}>
          <Ionicons name="calendar-outline" size={24} color={COLORS.textPrimary} />
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
              name={isPeriod ? 'water' : isOvulation ? 'sparkles' : isFertile ? 'flame' : 'shield-checkmark'}
              size={14}
              color={isPeriod ? '#EF4444' : isOvulation ? '#BE185D' : isFertile ? '#F59E0B' : '#10B981'}
            />
            <Text style={styles.statusPillText}>
              {isPeriod ? 'Đang kỳ kinh' : isOvulation ? 'Rụng trứng' : isFertile ? 'Hiệp sinh' : 'An toàn'}
            </Text>
          </View>

          <Text style={styles.heroSummary}>
            {isPeriod
              ? `Kỳ kinh đang diễn ra. Ngày thứ ${currentDay}.`
              : isOvulation
              ? 'Khả năng thụ thai cao nhất!'
              : isFertile
              ? 'Giai đoạn dễ thụ thai.'
              : `Kỳ kinh tiếp theo dự kiến trong ${daysToNext} ngày.`}
          </Text>

          {/* Action buttons */}
          <View style={styles.actionButtons}>
            {!hasPeriodStarted ? (
              <TouchableOpacity style={styles.startPeriodBtn} onPress={() => setShowPeriodModal(true)}>
                <Ionicons name="play-circle" size={18} color="#FFFFFF" />
                <Text style={styles.startPeriodText}>Bắt đầu kỳ kinh</Text>
              </TouchableOpacity>
            ) : (
              !periodEnd ? (
                <TouchableOpacity style={styles.endPeriodBtn} onPress={() => setShowPeriodModal(true)}>
                  <Ionicons name="stop-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.endPeriodText}>Kết thúc kỳ kinh</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.periodComplete}>
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                  <Text style={styles.periodCompleteText}>Kỳ kinh đã kết thúc</Text>
                </View>
              )
            )}
          </View>
        </View>

        {/* Prediction Calendar Widget */}
        <View style={styles.sectionWrap}>
          <Text style={styles.cardSectionTitle}>Dự đoán các chu kỳ tiếp theo 🔮</Text>
          <View style={styles.predictionCard}>
            {predictedDates.length > 0 ? (
              predictedDates.map((pred, idx) => {
                const sDate = new Date(pred.start);
                const eDate = new Date(pred.end);
                return (
                  <View key={idx} style={styles.predictionRow}>
                    <View style={styles.predBadge}>
                      <Text style={styles.predBadgeText}>Lần {idx + 1}</Text>
                    </View>
                    <View style={styles.predInfo}>
                      <Text style={styles.predDates}>
                        {sDate.getDate()}/{sDate.getMonth() + 1} - {eDate.getDate()}/{eDate.getMonth() + 1}/{eDate.getFullYear()}
                      </Text>
                      <Text style={styles.predSub}>
                        Dự kiến 5 ngày · Chu kỳ ~{cycleLength} ngày
                      </Text>
                    </View>
                    <Ionicons name="sparkles-outline" size={20} color="#EC4899" />
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyPredText}>
                Đánh dấu ngày bắt đầu kỳ kinh để nhận dự đoán tự động cho 3 tháng tới.
              </Text>
            )}
          </View>
        </View>

        {/* Mini Calendar 3 Months */}
        <View style={styles.sectionWrap}>
          <Text style={styles.cardSectionTitle}>Nhật ký 3 tháng gần nhất</Text>
          <View style={styles.calendarCard}>
            {Array.from({ length: 3 }).map((_, mIdx) => {
              const monthDate = new Date();
              monthDate.setMonth(monthDate.getMonth() - (2 - mIdx));
              const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
              return (
                <View key={mIdx} style={styles.monthView}>
                  <Text style={styles.monthName}>{monthDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</Text>
                  <View style={styles.daysGrid}>
                    {Array.from({ length: daysInMonth }).map((_, dIdx) => {
                      const day = dIdx + 1;
                      const dateStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const flow = flowMap[dateStr];
                      const isSelected = dateStr === selectedDate;
                      return (
                        <TouchableOpacity
                          key={dIdx}
                          style={[
                            styles.dayCell,
                            flow && { backgroundColor: flow === 'heavy' ? '#BE185D' : flow === 'medium' ? '#DB2777' : '#FBCFE8' },
                            isSelected && { borderColor: '#1E293B', borderWidth: 2 }
                          ]}
                          onPress={() => handleDateSelect(dateStr)}
                        >
                          <Text style={[styles.dayText, flow && { color: '#FFFFFF' }]}>{day}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Quick Date Selector */}
        <View style={styles.dateSelector}>
          <Text style={styles.dateSelectorLabel}>Chọn ngày để xem nhật ký</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
            {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
              const d = new Date();
              d.setDate(d.getDate() - offset);
              const dateStr = d.toISOString().split('T')[0];
              const dayNames = ['Hôm nay', 'T2', 'T3', 'T4', 'T5', 'T6', 'CN'];
              const dayName = offset === 0 ? 'Hôm nay' : dayNames[offset];
              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[styles.dateChip, selectedDate === dateStr && styles.dateChipActive]}
                  onPress={() => handleDateSelect(dateStr)}
                >
                  <Text style={[styles.dateChipText, selectedDate === dateStr && styles.dateChipTextActive]}>
                    {dayName}
                  </Text>
                  <Text style={[styles.dateChipDate, selectedDate === dateStr && styles.dateChipDateActive]}>
                    {d.getDate()}/{d.getMonth() + 1}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Flow Log */}
        <View style={styles.sectionWrap}>
          <Text style={styles.cardSectionTitle}>Lượng kinh nguyệt</Text>
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
                  <Text style={[styles.moodLabel, isSelected && styles.moodLabelActive]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Symptoms Log */}
        <View style={styles.sectionWrap}>
          <Text style={styles.cardSectionTitle}>Triệu chứng</Text>
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
                  <Ionicons name={sym.icon as any} size={16} color={isSelected ? '#FFFFFF' : '#BE185D'} />
                  <Text style={[styles.symptomText, isSelected && styles.symptomTextActive]}>{sym.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Mood Log */}
        <View style={styles.sectionWrap}>
          <Text style={styles.cardSectionTitle}>Cảm xúc</Text>
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
                  <Text style={[styles.moodLabel, isSelected && styles.moodLabelActive]}>{m.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Notes Input */}
        <View style={styles.sectionWrap}>
          <Text style={styles.cardSectionTitle}>Ghi chú</Text>
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
          <Text style={styles.saveBtnText}>{saving ? 'Đang lưu...' : 'Lưu nhật ký'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Period Start/End Modal */}
      <Modal visible={showPeriodModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {hasPeriodStarted ? 'Kết thúc kỳ kinh' : 'Bắt đầu kỳ kinh'}
              </Text>
              <TouchableOpacity onPress={() => setShowPeriodModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              {hasPeriodStarted
                ? 'Xác nhận kết thúc kỳ kinh hôm nay?'
                : 'Xác nhận bắt đầu kỳ kinh hôm nay?'}
            </Text>

            <TouchableOpacity style={styles.confirmBtn} onPress={hasPeriodStarted ? handleMarkPeriodEnd : handleMarkPeriodStart}>
              <Text style={styles.confirmBtnText}>{hasPeriodStarted ? 'Kết thúc' : 'Bắt đầu'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* History Modal */}
      <Modal visible={showHistoryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lịch sử chu kỳ</Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {historyPeriods.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Ionicons name="calendar-outline" size={48} color={COLORS.textTertiary} />
                <Text style={styles.emptyHistoryText}>Chưa có lịch sử</Text>
              </View>
            ) : (
              <ScrollView style={styles.historyList}>
                {historyPeriods.map((p) => {
                  const startDate = new Date(p.period_start);
                  const endDate = p.period_end ? new Date(p.period_end) : null;
                  const duration = endDate
                    ? Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
                    : null;

                  return (
                    <View key={p.id} style={styles.historyItem}>
                      <View style={styles.historyInfo}>
                        <Text style={styles.historyDate}>
                          {startDate.getDate()}/{startDate.getMonth() + 1} - {endDate ? `${endDate.getDate()}/${endDate.getMonth() + 1}` : 'Đang diễn ra'}
                        </Text>
                        <Text style={styles.historyDuration}>
                          {duration ? `${duration} ngày` : 'Đang diễn ra'} · Chu kỳ {p.cycle_length || '?'} ngày
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeletePeriod(p.id)}
                      >
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', fontFamily: FONT_FAMILY.bold as string, color: COLORS.textPrimary },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  // Hero Card
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
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 8, borderColor: '#EC4899',
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  cycleDayNum: { fontSize: 22, fontWeight: '900', fontFamily: FONT_FAMILY.bold as string, color: '#BE185D' },
  cycleTotal: { fontSize: 11, color: '#9D174D', fontFamily: FONT_FAMILY.base as string, marginTop: -2 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, marginBottom: 10,
  },
  statusPillText: { fontSize: 12, fontWeight: '700', fontFamily: FONT_FAMILY.bold as string, color: '#BE185D' },
  heroSummary: {
    fontSize: 13, color: '#831843', fontFamily: FONT_FAMILY.base as string,
    textAlign: 'center', lineHeight: 18, marginBottom: 16,
  },
  actionButtons: { width: '100%', gap: 10 },
  startPeriodBtn: {
    backgroundColor: '#EF4444', height: 48, borderRadius: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  startPeriodText: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF', fontFamily: FONT_FAMILY.bold as string },
  endPeriodBtn: {
    backgroundColor: '#10B981', height: 48, borderRadius: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  endPeriodText: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF', fontFamily: FONT_FAMILY.bold as string },
  periodComplete: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, justifyContent: 'center',
  },
  periodCompleteText: { fontSize: 14, fontWeight: '600', color: '#10B981', fontFamily: FONT_FAMILY.semiBold as string },

  // Date Selector
  dateSelector: { marginTop: 16, marginBottom: 12 },
  dateSelectorLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8, fontFamily: FONT_FAMILY.semiBold as string },
  dateRow: { gap: 8 },
  dateChip: {
    backgroundColor: COLORS.card, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  dateChipActive: { backgroundColor: '#DB2777', borderColor: '#DB2777' },
  dateChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, fontFamily: FONT_FAMILY.semiBold as string },
  dateChipTextActive: { color: '#FFFFFF' },
  dateChipDate: { fontSize: 11, color: COLORS.textTertiary, marginTop: 2, fontFamily: FONT_FAMILY.base as string },
  dateChipDateActive: { color: '#FCE7F3' },

  // Cards
  sectionWrap: { marginTop: 18 },
  cardSectionTitle: { fontSize: 15, fontWeight: 'bold', fontFamily: FONT_FAMILY.bold as string, color: COLORS.textPrimary, marginBottom: 12 },
  pillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  symptomPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FDF2F8', borderWidth: 1, borderColor: '#FBCFE8',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  symptomPillActive: { backgroundColor: '#DB2777', borderColor: '#BE185D' },
  symptomText: { fontSize: 12, fontWeight: '600', fontFamily: FONT_FAMILY.semiBold as string, color: '#9D174D' },
  symptomTextActive: { color: '#FFFFFF' },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  moodBtn: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 8,
    borderRadius: 16, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, flex: 1,
  },
  moodBtnActive: { borderColor: '#DB2777', backgroundColor: '#FDF2F8' },
  moodEmoji: { fontSize: 20, marginBottom: 2 },
  moodLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '500', fontFamily: FONT_FAMILY.base as string, textAlign: 'center' },
  moodLabelActive: { color: '#BE185D', fontWeight: 'bold' },
  notesInput: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 16, padding: 14, fontSize: 14, fontFamily: FONT_FAMILY.base as string,
    color: COLORS.textPrimary, height: 90, textAlignVertical: 'top',
  },
  saveBtn: { backgroundColor: '#DB2777', height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginTop: 24, ...SHADOWS.md },
  saveBtnText: { fontSize: 15, fontWeight: 'bold', fontFamily: FONT_FAMILY.bold as string, color: '#FFFFFF' },
  predictionCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  calendarCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  monthView: { marginBottom: 16 },
  monthName: { fontSize: 13, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 8, fontFamily: FONT_FAMILY.bold as string },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  dayCell: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 11, color: COLORS.textPrimary, fontFamily: FONT_FAMILY.base as string },
  predictionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: COLORS.border },
  predBadge: { backgroundColor: '#FCE7F3', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginRight: 12 },
  predBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#BE185D', fontFamily: FONT_FAMILY.bold as string },
  predInfo: { flex: 1 },
  predDates: { fontSize: 13, fontWeight: 'bold', color: COLORS.textPrimary, fontFamily: FONT_FAMILY.bold as string },
  predSub: { fontSize: 11, color: COLORS.textSecondary, fontFamily: FONT_FAMILY.base as string, marginTop: 2 },
  emptyPredText: { fontSize: 13, color: COLORS.textTertiary, textAlign: 'center', paddingVertical: 16, fontFamily: FONT_FAMILY.base as string },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', fontFamily: FONT_FAMILY.bold as string, color: COLORS.textPrimary },
  modalDescription: { fontSize: 14, color: COLORS.textSecondary, fontFamily: FONT_FAMILY.base as string, marginBottom: 20, lineHeight: 20 },
  confirmBtn: { backgroundColor: '#DB2777', height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF', fontFamily: FONT_FAMILY.bold as string },

  // History
  emptyHistory: { alignItems: 'center', paddingVertical: 40 },
  emptyHistoryText: { fontSize: 14, color: COLORS.textTertiary, marginTop: 12, fontFamily: FONT_FAMILY.base as string },
  historyList: { maxHeight: 300 },
  historyItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderColor: COLORS.border,
  },
  historyInfo: { flex: 1 },
  historyDate: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, fontFamily: FONT_FAMILY.semiBold as string },
  historyDuration: { fontSize: 12, color: COLORS.textSecondary, fontFamily: FONT_FAMILY.base as string, marginTop: 2 },
  deleteBtn: { padding: 8 },
});
