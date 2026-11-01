/**
 * Màn hình Cycle Tracker - Theo dõi chu kỳ, Nhật ký hàng ngày
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, Modal, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  const [historyPeriods, setHistoryPeriods] = useState<CyclePeriod[]>([]);
  const [avgCycleLength, setAvgCycleLength] = useState<number>(28);
  const [predictedDates, setPredictedDates] = useState<{ start: string; end: string }[]>([]);

  // Calendar state
  const [flowMap, setFlowMap] = useState<Record<string, string>>({});
  const [existingPeriods, setExistingPeriods] = useState<CyclePeriod[]>([]);
  const [showExpandedCalendar, setShowExpandedCalendar] = useState<boolean>(false);

  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDatePickerEnd, setShowDatePickerEnd] = useState(false);

  // Modal for adding past period
  const [showAddPastModal, setShowAddPastModal] = useState(false);
  const [pastStartDate, setPastStartDate] = useState<string>('');
  const [pastEndDate, setPastEndDate] = useState<string>('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

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
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const len = p.cycle_length || 28;
        const day = ((diffDays % len) + len) % len + 1;
        setCurrentDay(day);

        // Predict next 3 cycles
        const predictions: { start: string; end: string }[] = [];
        let nextStart = new Date(start);
        for (let i = 1; i <= 3; i++) {
          nextStart.setDate(nextStart.getDate() + len);
          const ps = nextStart.toISOString().split('T')[0];
          const ne = new Date(nextStart);
          ne.setDate(ne.getDate() + 5);
          predictions.push({ start: ps, end: ne.toISOString().split('T')[0] });
        }
        setPredictedDates(predictions);
      } else {
        setHasPeriodStarted(false);
        setPeriodStart('');
        setPeriodEnd('');
      }

      // 2. Fetch today's daily log
      const { data: logData } = await supabase
        .from('cycle_daily_logs')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('log_date', today)
        .maybeSingle();

      if (logData) {
        if (logData.flow) setSelectedFlow(logData.flow);
        if (logData.symptoms) setSelectedSymptoms(logData.symptoms);
        if (logData.mood) setSelectedMood(logData.mood);
        if (logData.notes) setNotes(logData.notes);
      }

      // 3. Fetch logs for past 3 months
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const { data: logsData } = await supabase
        .from('cycle_daily_logs')
        .select('log_date, flow')
        .eq('user_id', session.user.id)
        .gte('log_date', threeMonthsAgo.toISOString().split('T')[0]);

      if (logsData) {
        const map: Record<string, string> = {};
        logsData.forEach((item: any) => {
          if (item.flow && item.flow !== 'none') map[item.log_date] = item.flow;
        });
        setFlowMap(map);
      }

      // 4. Fetch ALL periods for average calculation
      const { data: allPeriods } = await supabase
        .from('cycle_periods')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('is_predicted', false)
        .order('period_start', { ascending: true });

      if (allPeriods) {
        setExistingPeriods(allPeriods);
        if (allPeriods.length > 1) {
          let totalLength = 0, count = 0;
          for (let i = 1; i < allPeriods.length; i++) {
            const len = Math.floor(
              (new Date(allPeriods[i].period_start).getTime() - new Date(allPeriods[i - 1].period_start).getTime()) / (1000 * 60 * 60 * 24)
            );
            if (len >= 15 && len <= 60) { totalLength += len; count++; }
          }
          if (count > 0) { const avg = Math.round(totalLength / count); setAvgCycleLength(avg); setCycleLength(avg); }
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoaded(true);
    }
  }, [session]);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase.from('cycle_periods').select('*').eq('user_id', session.user.id).order('period_start', { ascending: false }).limit(12);
    if (data) setHistoryPeriods(data);
  }, [session]);

  useEffect(() => {
    if (authLoading) return;
    if (!session) { router.replace('/auth/sign-in'); return; }
    fetchCycleData();
  }, [session, authLoading, fetchCycleData]);

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const daysToNext = currentDay > 0 ? cycleLength - currentDay : 0;
  const isOvulation = currentDay >= (cycleLength - 14) && currentDay <= (cycleLength - 10);
  const isPeriod = hasPeriodStarted && currentDay <= 5;
  const isFertile = currentDay >= 10 && currentDay <= 17;

  // Helpers
  const isDateInExistingPeriod = (dateStr: string): boolean => {
    const d = new Date(dateStr);
    return existingPeriods.some(p => {
      const s = new Date(p.period_start);
      const e = p.period_end ? new Date(p.period_end) : s;
      return d >= s && d <= e;
    });
  };

  const isExistingPeriodStart = (dateStr: string): boolean => {
    return existingPeriods.some(p => p.period_start === dateStr);
  };

  // Mark period start
  const handleMarkPeriodStart = async (date?: string) => {
    if (!session?.user?.id) return;
    const ps = date || new Date().toISOString().split('T')[0];
    if (isExistingPeriodStart(ps)) { Alert.alert('Đã lưu!', 'Kỳ kinh đã có ngày bắt đầu này.'); return; }
    if (isDateInExistingPeriod(ps)) { Alert.alert('Phạm vi', 'Ngày này nằm trong kỳ kinh đang diễn ra.'); return; }
    try {
      await supabase.from('cycle_periods').insert({ user_id: session.user.id, period_start: ps, cycle_length: cycleLength, is_predicted: false });
      Alert.alert('Đã bắt đầu! 🌸', `Đã ghi nhận ngày bắt đầu: ${new Date(ps).toLocaleDateString('vi-VN')}.`);
      setShowDatePicker(false);
      setShowStartPicker(false);
      setShowAddPastModal(false);
      await fetchCycleData();
    } catch (err: any) { Alert.alert('Lỗi', err.message || 'Không thể ghi nhận.'); }
  };

  // Mark period end
  const handleMarkPeriodEnd = async (date?: string) => {
    if (!session?.user?.id || !periodStart) return;
    const pe = date || new Date().toISOString().split('T')[0];
    if (new Date(pe) < new Date(periodStart)) { Alert.alert('Lỗi', 'Ngày kết thúc phải sau ngày bắt đầu.'); return; }
    try {
      const { data: period } = await supabase.from('cycle_periods').select('id').eq('user_id', session.user.id).eq('is_predicted', false).single();
      if (period) {
        await supabase.from('cycle_periods').update({ period_end: pe }).eq('id', period.id);
        setPeriodEnd(pe);
        Alert.alert('Đã kết thúc! 🌸', `Đã ghi nhận ngày kết thúc: ${new Date(pe).toLocaleDateString('vi-VN')}.`);
        setShowDatePickerEnd(false);
        setShowEndPicker(false);
        setShowAddPastModal(false);
        await fetchCycleData();
      }
    } catch (err: any) { Alert.alert('Lỗi', err.message || 'Không thể ghi nhận.'); }
  };

  // Delete period
  const handleDeletePeriod = async (periodId: number) => {
    Alert.alert('Xóa kỳ kinh', 'Bạn có chắc muốn xóa kỳ kinh này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => { await supabase.from('cycle_periods').delete().eq('id', periodId); Alert.alert('Đã xóa!'); await fetchCycleData(); await fetchHistory(); } }
    ]);
  };

  // Save daily log
  const handleSaveDailyLog = async () => {
    if (!session?.user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('cycle_daily_logs').upsert({
        user_id: session.user.id, log_date: selectedDate, flow: selectedFlow,
        symptoms: selectedSymptoms, mood: selectedMood || null, notes: notes || null,
      }, { onConflict: 'user_id,log_date' });
      if (error) throw error;
      Alert.alert('Đã lưu! 🌸', 'Nhật ký đã được cập nhật thành công.');
      await fetchCycleData();
    } catch (err: any) { Alert.alert('Lỗi lưu dữ liệu', err.message || 'Vui lòng thử lại.'); }
    finally { setSaving(false); }
  };

  // Load log for selected date
  const loadDateLog = useCallback(async (date: string) => {
    if (!session?.user?.id) return;
    const { data, error } = await supabase.from('cycle_daily_logs').select('*').eq('user_id', session.user.id).eq('log_date', date).maybeSingle();
    if (error) { console.error('Load log error:', error); return; }
    if (data) { setSelectedFlow(data.flow || 'none'); setSelectedSymptoms(data.symptoms || []); setSelectedMood(data.mood || ''); setNotes(data.notes || ''); }
    else { setSelectedFlow('none'); setSelectedSymptoms([]); setSelectedMood(''); setNotes(''); }
  }, [session]);

  const handleDateSelect = (date: string) => { setSelectedDate(date); loadDateLog(date); };

  // Generate today + last 14 days (15 days total)
  const daySelectorDays = Array.from({ length: 15 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (14 - i));
    return {
      dateStr: d.toISOString().split('T')[0],
      day: d.getDate(),
      month: d.getMonth() + 1,
      isToday: i === 14,
      isInPeriod: isDateInExistingPeriod(d.toISOString().split('T')[0]),
      isPeriodStart: isExistingPeriodStart(d.toISOString().split('T')[0]),
    };
  });

  // Calendar months
  const calendarMonths = showExpandedCalendar
    ? Array.from({ length: 3 }, (_, i) => { const d = new Date(); d.setMonth(d.getMonth() - (2 - i)); return d; })
    : [new Date()];

  if (!loaded) {
    return <View style={styles.loader}><ActivityIndicator size="large" color="#DB2777" /></View>;
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
        {/* Circular Date Selector - REPLACES Hero Card */}
        <View style={styles.daySelectorWrap}>
          {!hasPeriodStarted || periodEnd ? (
            <>
              <Text style={styles.daySelectorLabel}>Chọn ngày bắt đầu kỳ kinh</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daySelectorRow}>
                {daySelectorDays.map((d, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.dayCircle,
                      d.isPeriodStart && styles.dayCirclePeriodStart,
                      d.isInPeriod && styles.dayCircleInPeriod,
                      d.isToday && styles.dayCircleToday,
                    ]}
                    onPress={() => { if (!d.isInPeriod && !d.isPeriodStart) handleMarkPeriodStart(d.dateStr); }}
                    disabled={d.isInPeriod || d.isPeriodStart}
                  >
                    <Text style={[styles.dayCircleText, d.isPeriodStart && styles.dayCircleTextActive]}>
                      {d.isToday ? 'Hôm nay' : `${d.day}`}
                    </Text>
                    {!d.isToday && <Text style={[styles.dayCircleSub, d.isPeriodStart && styles.dayCircleSubActive]}>{d.month}</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.selectorHint}>Nhấn ngày để bắt đầu kỳ kinh</Text>
            </>
          ) : (
            /* Show hero card when period is active and not ended */
            <>
              <View style={styles.heroCard}>
                <View style={styles.cycleCircleWrap}>
                  <View style={styles.cycleCircle}>
                    <Text style={styles.cycleDayNum}>Day {currentDay}</Text>
                    <Text style={styles.cycleTotal}>/ {cycleLength} ngày</Text>
                  </View>
                </View>
                <View style={styles.statusPill}>
                  <Ionicons name={isPeriod ? 'water' : isOvulation ? 'sparkles' : isFertile ? 'flame' : 'shield-checkmark'} size={14} color={isPeriod ? '#EF4444' : isOvulation ? '#BE185D' : isFertile ? '#F59E0B' : '#10B981'} />
                  <Text style={styles.statusPillText}>{isPeriod ? 'Đang kỳ kinh' : isOvulation ? 'Rụng trứng' : isFertile ? 'Hiệp sinh' : 'An toàn'}</Text>
                </View>
                <Text style={styles.heroSummary}>
                  {isPeriod ? `Kỳ kinh đang diễn ra. Ngày thứ ${currentDay}.` : isOvulation ? 'Khả năng thụ thai cao nhất!' : isFertile ? 'Giai đoạn dễ thụ thai.' : `Kỳ kinh tiếp theo dự kiến trong ${daysToNext} ngày.`}
                </Text>
                {/* End period button */}
                {!periodEnd && (
                  <TouchableOpacity style={styles.endPeriodBtn} onPress={() => setShowDatePickerEnd(true)}>
                    <Ionicons name="stop-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.endPeriodText}>Kết thúc kỳ kinh</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>

        {/* Add past period button */}
        <TouchableOpacity style={styles.addPastBtn} onPress={() => { setPastStartDate(''); setPastEndDate(''); setShowAddPastModal(true); }}>
          <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.addPastText}>Thêm kỳ kinh trong quá khứ</Text>
        </TouchableOpacity>

        {/* Prediction Widget */}
        <View style={styles.sectionWrap}>
          <Text style={styles.cardSectionTitle}>Dự đoán chu kỳ tiếp theo 🔮</Text>
          <View style={styles.predictionCard}>
            {predictedDates.length > 0 ? (
              predictedDates.map((pred, idx) => {
                const sDate = new Date(pred.start);
                const eDate = new Date(pred.end);
                return (
                  <View key={idx} style={styles.predictionRow}>
                    <View style={styles.predBadge}><Text style={styles.predBadgeText}>Lần {idx + 1}</Text></View>
                    <View style={styles.predInfo}>
                      <Text style={styles.predDates}>{sDate.getDate()}/{sDate.getMonth() + 1} - {eDate.getDate()}/{eDate.getMonth() + 1}/{eDate.getFullYear()}</Text>
                      <Text style={styles.predSub}>Dự kiến 5 ngày · Chu kỳ ~{cycleLength} ngày</Text>
                    </View>
                    <Ionicons name="sparkles-outline" size={20} color="#EC4899" />
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyPredText}>Chọn ngày bắt đầu kỳ kinh để xem dự đoán.</Text>
            )}
          </View>
        </View>

        {/* Calendar 1-3 months with expand button */}
        <View style={styles.sectionWrap}>
          <View style={styles.calendarHeaderRow}>
            <Text style={styles.cardSectionTitle}>Nhật ký 3 tháng gần nhất</Text>
            {existingPeriods.length > 0 && (
              <TouchableOpacity onPress={() => setShowExpandedCalendar(!showExpandedCalendar)}>
                <Ionicons name={showExpandedCalendar ? 'chevron-up' : 'chevron-down'} size={24} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.calendarCard}>
            {calendarMonths.map((monthDate, mIdx) => {
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
                            isSelected && { borderColor: '#1E293B', borderWidth: 2 },
                          ]}
                          onPress={() => handleDateSelect(dateStr)}
                          onLongPress={() => {
                            if (!isDateInExistingPeriod(dateStr)) {
                              Alert.alert('Thêm kỳ kinh', `Bắt đầu kỳ kinh ngày ${day}/${monthDate.getMonth() + 1}?`, [
                                { text: 'Hủy', style: 'cancel' },
                                { text: 'Xác nhận', onPress: () => handleMarkPeriodStart(dateStr) },
                              ]);
                            }
                          }}
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

        {/* Quick Date Selector for Daily Log */}
        <View style={styles.dateSelector}>
          <Text style={styles.dateSelectorLabel}>Chọn ngày để xem nhật ký</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
            {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
              const d = new Date();
              d.setDate(d.getDate() - offset);
              const dateStr = d.toISOString().split('T')[0];
              const dayNames = ['Hôm nay', 'T2', 'T3', 'T4', 'T5', 'T6', 'CN'];
              return (
                <TouchableOpacity key={dateStr} style={[styles.dateChip, selectedDate === dateStr && styles.dateChipActive]} onPress={() => handleDateSelect(dateStr)}>
                  <Text style={[styles.dateChipText, selectedDate === dateStr && styles.dateChipTextActive]}>{offset === 0 ? 'Hôm nay' : dayNames[offset]}</Text>
                  <Text style={[styles.dateChipDate, selectedDate === dateStr && styles.dateChipDateActive]}>{d.getDate()}/{d.getMonth() + 1}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Flow Log */}
        <View style={styles.sectionWrap}>
          <Text style={styles.cardSectionTitle}>Lượng kinh nguyệt</Text>
          <View style={styles.moodRow}>
            {FLOWS.map((f) => (
              <TouchableOpacity key={f.id} style={[styles.moodBtn, selectedFlow === f.id && styles.moodBtnActive]} onPress={() => setSelectedFlow(f.id)}>
                <Text style={[styles.moodLabel, selectedFlow === f.id && styles.moodLabelActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Symptoms Log */}
        <View style={styles.sectionWrap}>
          <Text style={styles.cardSectionTitle}>Triệu chứng</Text>
          <View style={styles.pillGrid}>
            {SYMPTOMS.map((sym) => (
              <TouchableOpacity key={sym.id} style={[styles.symptomPill, selectedSymptoms.includes(sym.id) && styles.symptomPillActive]} onPress={() => toggleSymptom(sym.id)}>
                <Ionicons name={sym.icon as any} size={16} color={selectedSymptoms.includes(sym.id) ? '#FFFFFF' : '#BE185D'} />
                <Text style={[styles.symptomText, selectedSymptoms.includes(sym.id) && styles.symptomTextActive]}>{sym.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Mood Log */}
        <View style={styles.sectionWrap}>
          <Text style={styles.cardSectionTitle}>Cảm xúc</Text>
          <View style={styles.moodRow}>
            {MOODS.map((m) => (
              <TouchableOpacity key={m.id} style={[styles.moodBtn, selectedMood === m.id && styles.moodBtnActive]} onPress={() => setSelectedMood(m.id)}>
                <Text style={styles.moodEmoji}>{m.emoji}</Text>
                <Text style={[styles.moodLabel, selectedMood === m.id && styles.moodLabelActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notes Input */}
        <View style={styles.sectionWrap}>
          <Text style={styles.cardSectionTitle}>Ghi chú</Text>
          <TextInput style={styles.notesInput} placeholder="Nhập ghi chú hôm nay..." placeholderTextColor={COLORS.textTertiary} value={notes} onChangeText={setNotes} multiline />
        </View>

        {/* Save button */}
        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSaveDailyLog} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Đang lưu...' : 'Lưu nhật ký'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* DateTimePickers for quick add */}
      {showDatePicker && (
        <DateTimePicker value={new Date()} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} maximumDate={new Date()} onChange={(ev, date) => { setShowDatePicker(false); if (date) handleMarkPeriodStart(date.toISOString().split('T')[0]); }} />
      )}
      {showDatePickerEnd && (
        <DateTimePicker value={periodStart ? new Date(periodStart) : new Date()} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} minimumDate={periodStart ? new Date(periodStart) : undefined} onChange={(ev, date) => { setShowDatePickerEnd(false); if (date) handleMarkPeriodEnd(date.toISOString().split('T')[0]); }} />
      )}

      {/* Add Past Period Modal */}
      <Modal visible={showAddPastModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm kỳ kinh quá khứ</Text>
              <TouchableOpacity onPress={() => setShowAddPastModal(false)}><Ionicons name="close" size={24} color={COLORS.textSecondary} /></TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Ngày bắt đầu</Text>
            <TouchableOpacity style={styles.dateInputBtn} onPress={() => setShowStartPicker(true)}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
              <Text style={styles.dateInputText}>{pastStartDate ? new Date(pastStartDate).toLocaleDateString('vi-VN') : 'Chọn ngày bắt đầu...'}</Text>
            </TouchableOpacity>

            <Text style={styles.modalLabel}>Ngày kết thúc (tùy chọn)</Text>
            <TouchableOpacity style={styles.dateInputBtn} onPress={() => pastStartDate && setShowEndPicker(true)}>
              <Ionicons name="calendar-outline" size={20} color={pastStartDate ? COLORS.primary : COLORS.textTertiary} />
              <Text style={[styles.dateInputText, !pastStartDate && { color: COLORS.textTertiary }]}>{pastEndDate ? new Date(pastEndDate).toLocaleDateString('vi-VN') : 'Chọn ngày kết thúc...'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={async () => {
                if (!pastStartDate) { Alert.alert('Lỗi', 'Vui lòng chọn ngày bắt đầu'); return; }
                if (pastEndDate && new Date(pastEndDate) < new Date(pastStartDate)) { Alert.alert('Lỗi', 'Ngày kết thúc phải sau ngày bắt đầu'); return; }
                await handleMarkPeriodStart(pastStartDate);
                if (pastEndDate) await handleMarkPeriodEnd(pastEndDate);
              }}
            >
              <Text style={styles.confirmBtnText}>Lưu kỳ kinh</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Start date picker inside modal */}
      {showStartPicker && (
        <DateTimePicker value={new Date()} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} maximumDate={new Date()} onChange={(ev, date) => { setShowStartPicker(false); if (date) setPastStartDate(date.toISOString().split('T')[0]); }} />
      )}
      {/* End date picker inside modal */}
      {showEndPicker && (
        <DateTimePicker value={pastStartDate ? new Date(pastStartDate) : new Date()} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} minimumDate={pastStartDate ? new Date(pastStartDate) : undefined} onChange={(ev, date) => { setShowEndPicker(false); if (date) setPastEndDate(date.toISOString().split('T')[0]); }} />
      )}

      {/* History Modal */}
      <Modal visible={showHistoryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lịch sử chu kỳ</Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}><Ionicons name="close" size={24} color={COLORS.textSecondary} /></TouchableOpacity>
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
                  const duration = endDate ? Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 : null;
                  return (
                    <View key={p.id} style={styles.historyItem}>
                      <View style={styles.historyInfo}>
                        <Text style={styles.historyDate}>{startDate.getDate()}/{startDate.getMonth() + 1} - {endDate ? `${endDate.getDate()}/${endDate.getMonth() + 1}` : 'Đang diễn ra'}</Text>
                        <Text style={styles.historyDuration}>{duration ? `${duration} ngày` : 'Đang diễn ra'} · Chu kỳ {p.cycle_length || '?'} ngày</Text>
                      </View>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeletePeriod(p.id)}><Ionicons name="trash-outline" size={20} color="#EF4444" /></TouchableOpacity>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', fontFamily: FONT_FAMILY.bold as string, color: COLORS.textPrimary },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  // Hero Card
  heroCard: { backgroundColor: '#FCE7F3', borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#FBCFE8', ...SHADOWS.md },
  cycleCircleWrap: { marginBottom: 16 },
  cycleCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 8, borderColor: '#EC4899', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  cycleDayNum: { fontSize: 22, fontWeight: '900', fontFamily: FONT_FAMILY.bold as string, color: '#BE185D' },
  cycleTotal: { fontSize: 11, color: '#9D174D', fontFamily: FONT_FAMILY.base as string, marginTop: -2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, marginBottom: 10 },
  statusPillText: { fontSize: 12, fontWeight: '700', fontFamily: FONT_FAMILY.bold as string, color: '#BE185D' },
  heroSummary: { fontSize: 13, color: '#831843', fontFamily: FONT_FAMILY.base as string, textAlign: 'center', lineHeight: 18, marginBottom: 16 },

  // Circular Day Selector
  daySelectorWrap: { marginTop: 20, marginBottom: 8 },
  daySelectorLabel: { fontSize: 15, fontWeight: 'bold', fontFamily: FONT_FAMILY.bold as string, color: COLORS.textPrimary, marginBottom: 12, textAlign: 'center' },
  daySelectorRow: { gap: 8, paddingHorizontal: 4 },
  dayCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  dayCircleText: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, fontFamily: FONT_FAMILY.bold as string },
  dayCircleSub: { fontSize: 9, color: COLORS.textTertiary, fontFamily: FONT_FAMILY.base as string },
  dayCircleTextActive: { color: '#FFFFFF' },
  dayCircleSubActive: { color: '#FCE7F3' },
  dayCircleToday: { borderWidth: 2, borderColor: '#DB2777' },
  dayCirclePeriodStart: { backgroundColor: '#DB2777', borderColor: '#DB2777' },
  dayCircleInPeriod: { backgroundColor: '#FBCFE8', borderColor: '#FBCFE8' },
  selectorHint: { fontSize: 11, color: COLORS.textTertiary, textAlign: 'center', marginTop: 10, fontFamily: FONT_FAMILY.base as string },

  // Add Past Period Button
  addPastBtn: { backgroundColor: '#BE185D', borderRadius: 24, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, marginBottom: 4 },
  addPastText: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF', fontFamily: FONT_FAMILY.bold as string },

  // Prediction Card
  sectionWrap: { marginTop: 18 },
  cardSectionTitle: { fontSize: 15, fontWeight: 'bold', fontFamily: FONT_FAMILY.bold as string, color: COLORS.textPrimary, marginBottom: 12 },
  endPeriodBtn: { backgroundColor: '#10B981', height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, width: '100%' },
  endPeriodText: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF', fontFamily: FONT_FAMILY.bold as string },
  predictionCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  predictionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: COLORS.border },
  predBadge: { backgroundColor: '#FCE7F3', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginRight: 12 },
  predBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#BE185D', fontFamily: FONT_FAMILY.bold as string },
  predInfo: { flex: 1 },
  predDates: { fontSize: 13, fontWeight: 'bold', color: COLORS.textPrimary, fontFamily: FONT_FAMILY.bold as string },
  predSub: { fontSize: 11, color: COLORS.textSecondary, fontFamily: FONT_FAMILY.base as string, marginTop: 2 },
  emptyPredText: { fontSize: 13, color: COLORS.textTertiary, textAlign: 'center', paddingVertical: 16, fontFamily: FONT_FAMILY.base as string },

  // Calendar
  calendarCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  calendarHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  monthView: { marginBottom: 16 },
  monthName: { fontSize: 13, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 8, fontFamily: FONT_FAMILY.bold as string },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  dayCell: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 11, color: COLORS.textPrimary, fontFamily: FONT_FAMILY.base as string },

  // Date Selector (horizontal chips)
  dateSelector: { marginTop: 16, marginBottom: 12 },
  dateSelectorLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8, fontFamily: FONT_FAMILY.semiBold as string },
  dateRow: { gap: 8 },
  dateChip: { backgroundColor: COLORS.card, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  dateChipActive: { backgroundColor: '#DB2777', borderColor: '#DB2777' },
  dateChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, fontFamily: FONT_FAMILY.semiBold as string },
  dateChipTextActive: { color: '#FFFFFF' },
  dateChipDate: { fontSize: 11, color: COLORS.textTertiary, marginTop: 2, fontFamily: FONT_FAMILY.base as string },
  dateChipDateActive: { color: '#FCE7F3' },

  // Cards
  pillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  symptomPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FDF2F8', borderWidth: 1, borderColor: '#FBCFE8', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  symptomPillActive: { backgroundColor: '#DB2777', borderColor: '#BE185D' },
  symptomText: { fontSize: 12, fontWeight: '600', fontFamily: FONT_FAMILY.semiBold as string, color: '#9D174D' },
  symptomTextActive: { color: '#FFFFFF' },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  moodBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 16, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, flex: 1 },
  moodBtnActive: { borderColor: '#DB2777', backgroundColor: '#FDF2F8' },
  moodEmoji: { fontSize: 20, marginBottom: 2 },
  moodLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '500', fontFamily: FONT_FAMILY.base as string, textAlign: 'center' },
  moodLabelActive: { color: '#BE185D', fontWeight: 'bold' },
  notesInput: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 14, fontSize: 14, fontFamily: FONT_FAMILY.base as string, color: COLORS.textPrimary, height: 90, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: '#DB2777', height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginTop: 24, ...SHADOWS.md },
  saveBtnText: { fontSize: 15, fontWeight: 'bold', fontFamily: FONT_FAMILY.bold as string, color: '#FFFFFF' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', fontFamily: FONT_FAMILY.bold as string, color: COLORS.textPrimary },
  modalLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8, marginTop: 12, fontFamily: FONT_FAMILY.semiBold as string },
  dateInputBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 14 },
  dateInputText: { fontSize: 14, color: COLORS.textPrimary, fontFamily: FONT_FAMILY.base as string, flex: 1 },
  confirmBtn: { backgroundColor: '#DB2777', height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  confirmBtnText: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF', fontFamily: FONT_FAMILY.bold as string },

  // History
  emptyHistory: { alignItems: 'center', paddingVertical: 40 },
  emptyHistoryText: { fontSize: 14, color: COLORS.textTertiary, marginTop: 12, fontFamily: FONT_FAMILY.base as string },
  historyList: { maxHeight: 300 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: COLORS.border },
  historyInfo: { flex: 1 },
  historyDate: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, fontFamily: FONT_FAMILY.semiBold as string },
  historyDuration: { fontSize: 12, color: COLORS.textSecondary, fontFamily: FONT_FAMILY.base as string, marginTop: 2 },
  deleteBtn: { padding: 8 },
});
