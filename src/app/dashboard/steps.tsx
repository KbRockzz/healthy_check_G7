/**
 * Màn hình Step Tracker - Biểu đồ Phân bổ Giờ & Thống kê Vận động
 * Khớp thiết kế Mockup #5: Dashboard - Step Tracker.png & Tích hợp Roboto Fonts
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS, FONT_FAMILY } from '@/theme';
import { useAuth } from '@/lib/hooks/use-auth';
import { supabase } from '@/lib/supabase';

// Hourly sample data for chart
const HOURLY_STEPS = [
  { hour: '6h', steps: 420, height: 25 },
  { hour: '9h', steps: 1250, height: 65 },
  { hour: '12h', steps: 890, height: 48 },
  { hour: '15h', steps: 1650, height: 85 }, // Peak
  { hour: '18h', steps: 1420, height: 75 },
  { hour: '21h', steps: 802, height: 42 },
];

export default function StepsScreen() {
  const router = useRouter();
  const { session, profile, loading: authLoading } = useAuth();

  const [steps, setSteps] = useState(6432);
  const [goal, setGoal] = useState(10000);
  const [showLogModal, setShowLogModal] = useState(false);
  const [customInput, setCustomInput] = useState('');

  const fetchData = useCallback(async () => {
    if (!session) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const storageKey = `@healthy_check_steps_${today}`;
      const savedSteps = await AsyncStorage.getItem(storageKey);
      if (savedSteps) setSteps(parseInt(savedSteps, 10));

      const { data } = await supabase
        .from('step_records')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('recorded_on', today)
        .single();

      if (data && data.steps) {
        setSteps(data.steps);
        await AsyncStorage.setItem(storageKey, data.steps.toString());
      }
      if (profile?.step_goal) setGoal(profile.step_goal);
    } catch {
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

  const handleAddSteps = async (addedSteps: number) => {
    const nextSteps = steps + addedSteps;
    setSteps(nextSteps);

    const today = new Date().toISOString().split('T')[0];
    const storageKey = `@healthy_check_steps_${today}`;
    try {
      await AsyncStorage.setItem(storageKey, nextSteps.toString());
      await supabase.from('step_records').upsert({
        user_id: session?.user.id,
        recorded_on: today,
        steps: nextSteps,
        calories_burned: Math.round(nextSteps * 0.04),
        distance_km: parseFloat((nextSteps * 0.0008).toFixed(2)),
        active_minutes: Math.round(nextSteps / 100),
        source: 'manual',
      });
    } catch {
      // keep local
    }

    setShowLogModal(false);
    setCustomInput('');
    Alert.alert('Đã cập nhật bước chân! 👟', `Đã thêm +${addedSteps.toLocaleString()} bước.`);
  };

  const distanceKm = (steps * 0.00075).toFixed(1);
  const caloriesBurned = Math.round(steps * 0.045);
  const activeMins = Math.round(steps / 120);
  const progressPct = Math.min(100, Math.round((steps / goal) * 100));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Step Tracker</Text>
        <TouchableOpacity onPress={() => setShowLogModal(true)} style={styles.addBtn}>
          <Ionicons name="add-circle-outline" size={26} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroSub}>Tổng số bước hôm nay</Text>
            <Text style={styles.heroSteps}>{steps.toLocaleString()}</Text>
            <Text style={styles.heroGoal}>/ {goal.toLocaleString()} Steps</Text>
            <View style={styles.heroBadge}>
              <Ionicons name="flame" size={12} color="#FFFFFF" />
              <Text style={styles.heroBadgeText}>{progressPct}% Mục tiêu ngày</Text>
            </View>
          </View>

          <View style={styles.progressRing}>
            <Text style={styles.ringVal}>{progressPct}%</Text>
            <Text style={styles.ringLabel}>Completed</Text>
          </View>
        </View>

        {/* 3 Metric Pills (Distance, Calories, Active Time) */}
        <View style={styles.metricsRow}>
          <View style={styles.metricPill}>
            <Ionicons name="navigate-outline" size={20} color={COLORS.primary} />
            <Text style={styles.pillValue}>{distanceKm} km</Text>
            <Text style={styles.pillLabel}>Quãng đường</Text>
          </View>

          <View style={styles.metricPill}>
            <Ionicons name="flame-outline" size={20} color="#F59E0B" />
            <Text style={styles.pillValue}>{caloriesBurned} kcal</Text>
            <Text style={styles.pillLabel}>Calo tiêu hao</Text>
          </View>

          <View style={styles.metricPill}>
            <Ionicons name="time-outline" size={20} color="#10B981" />
            <Text style={styles.pillValue}>{activeMins} mins</Text>
            <Text style={styles.pillLabel}>Vận động</Text>
          </View>
        </View>

        {/* Hourly Activity Bar Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Phân bổ bước chân theo giờ</Text>
            <Text style={styles.chartPeak}>Đỉnh cao: 15h (1,650 bước)</Text>
          </View>

          <View style={styles.chartContainer}>
            {HOURLY_STEPS.map((item, idx) => (
              <View key={idx} style={styles.chartCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${item.height}%` },
                      item.steps > 1500 && { backgroundColor: COLORS.primary },
                    ]}
                  />
                </View>
                <Text style={styles.chartHour}>{item.hour}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Add Actions */}
        <Text style={styles.sectionTitle}>Ghi nhận nhanh hoạt động đi bộ</Text>
        <View style={styles.quickAddGrid}>
          <TouchableOpacity
            style={styles.quickAddBtn}
            onPress={() => handleAddSteps(1000)}
            activeOpacity={0.8}
          >
            <Ionicons name="walk" size={18} color={COLORS.primary} />
            <Text style={styles.quickAddText}>+1,000 bước (Đi dạo nhẹ)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAddBtn}
            onPress={() => handleAddSteps(3000)}
            activeOpacity={0.8}
          >
            <Ionicons name="bicycle" size={18} color="#10B981" />
            <Text style={styles.quickAddText}>+3,000 bước (Chạy bộ)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Manual Modal */}
      <Modal
        visible={showLogModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLogModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalTopRow}>
              <Text style={styles.modalTitle}>Nhập số bước chân</Text>
              <TouchableOpacity onPress={() => setShowLogModal(false)}>
                <Ionicons name="close-circle" size={26} color={COLORS.textTertiary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Nhập số bước (ví dụ: 1500)"
              placeholderTextColor={COLORS.textTertiary}
              value={customInput}
              onChangeText={setCustomInput}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={styles.modalSubmit}
              onPress={() => {
                const s = parseInt(customInput);
                if (isNaN(s) || s <= 0) {
                  Alert.alert('Lỗi', 'Vui lòng nhập số bước hợp lệ');
                  return;
                }
                handleAddSteps(s);
              }}
            >
              <Text style={styles.modalSubmitText}>Ghi nhận</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  addBtn: { padding: 4 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  heroCard: {
    backgroundColor: '#0284C7',
    borderRadius: 24,
    padding: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  heroLeft: { flex: 1 },
  heroSub: {
    fontSize: 13,
    color: '#BAE6FD',
    fontWeight: '500',
    fontFamily: FONT_FAMILY.medium as string,
  },
  heroSteps: {
    fontSize: 38,
    fontWeight: '900',
    fontFamily: FONT_FAMILY.bold as string,
    color: '#FFFFFF',
    marginTop: 4,
  },
  heroGoal: {
    fontSize: 13,
    color: '#E0F2FE',
    fontFamily: FONT_FAMILY.base as string,
    marginTop: -2,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.bold as string,
    color: '#FFFFFF',
  },
  progressRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 6,
    borderColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  ringVal: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: FONT_FAMILY.bold as string,
    color: '#FFFFFF',
  },
  ringLabel: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.base as string,
    color: '#BAE6FD',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  metricPill: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  pillValue: {
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: COLORS.textPrimary,
    marginTop: 6,
  },
  pillLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: FONT_FAMILY.base as string,
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    marginTop: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: COLORS.textPrimary,
  },
  chartPeak: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    fontFamily: FONT_FAMILY.semiBold as string,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingHorizontal: 8,
  },
  chartCol: { alignItems: 'center', height: '100%', justifyContent: 'flex-end', width: 36 },
  barTrack: {
    width: 14,
    height: 90,
    backgroundColor: '#E2E8F0',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#38BDF8',
    borderRadius: 7,
  },
  chartHour: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 6,
    fontWeight: '500',
    fontFamily: FONT_FAMILY.base as string,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: COLORS.textPrimary,
    marginTop: 22,
    marginBottom: 12,
  },
  quickAddGrid: { gap: 10 },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  quickAddText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: FONT_FAMILY.semiBold as string,
    color: COLORS.textPrimary,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
  modalTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: COLORS.textPrimary,
  },
  modalInput: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: FONT_FAMILY.base as string,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
    marginBottom: 16,
  },
  modalSubmit: {
    backgroundColor: COLORS.primary,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: {
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: '#FFFFFF',
  },
});
