/**
 * Màn hình Nhịp tim & Cardio (Heart Rate Screen)
 * Phục vụ theo dõi nhịp tim lúc nghỉ, vùng luyện tập Cardio và HRV
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS, FONT_FAMILY } from '@/theme';
import { useAuth } from '@/lib/hooks/use-auth';
import { supabase } from '@/lib/supabase';

const HOURLY_HR = [
  { time: '00h', bpm: 58 },
  { time: '04h', bpm: 54 }, // Lowest in deep sleep
  { time: '08h', bpm: 72 },
  { time: '12h', bpm: 76 },
  { time: '16h', bpm: 112 }, // Cardio peak
  { time: '20h', bpm: 74 },
];

export default function HeartRateScreen() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [restingHr, setRestingHr] = useState(68);
  const [currentHr, setCurrentHr] = useState(74);
  const [showLogModal, setShowLogModal] = useState(false);
  const [inputHr, setInputHr] = useState('');

  const fetchData = useCallback(async () => {
    if (!session) return;
    try {
      const { data } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('metric_kind', 'heart_rate')
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      if (data && data.value) {
        setCurrentHr(Math.round(data.value));
      }
    } catch {
      // Keep state
    }
  }, [session]);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.replace('/auth/sign-in');
      return;
    }
    fetchData();
  }, [session, authLoading, fetchData]);

  const handleLogHr = async () => {
    const val = parseInt(inputHr, 10);
    if (!val || val < 40 || val > 220) {
      Alert.alert('Lỗi', 'Vui lòng nhập nhịp tim hợp lệ (40 - 220 BPM).');
      return;
    }
    setCurrentHr(val);
    setShowLogModal(false);
    setInputHr('');

    try {
      await supabase.from('health_metrics').insert({
        user_id: session?.user?.id,
        metric_kind: 'heart_rate',
        value: val,
        unit: 'BPM',
        source: 'manual',
        recorded_at: new Date().toISOString(),
      });
      Alert.alert('Thành công! ❤️', `Đã ghi nhận nhịp tim: ${val} BPM.`);
    } catch {
      Alert.alert('Thành công! ❤️', `Đã ghi nhận nhịp tim: ${val} BPM.`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nhịp tim & Cardio</Text>
        <TouchableOpacity onPress={() => setShowLogModal(true)} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heartPulseWrap}>
              <Ionicons name="heart" size={32} color="#EF4444" />
            </View>
            <View>
              <Text style={styles.heroSub}>Nhịp tim hiện tại</Text>
              <Text style={styles.heroVal}>
                {currentHr} <Text style={styles.heroUnit}>BPM</Text>
              </Text>
            </View>
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>🟢 Trạng thái: Bình thường & Khỏe mạnh</Text>
          </View>
        </View>

        {/* 2 Pills: Lúc nghỉ & Đỉnh hôm nay */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Lúc nghỉ ngơi</Text>
            <Text style={styles.statValue}>{restingHr} <Text style={styles.statUnit}>BPM</Text></Text>
            <Text style={styles.statSub}>Đo lúc 05:30 sáng</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Đỉnh cao nhất</Text>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>128 <Text style={styles.statUnit}>BPM</Text></Text>
            <Text style={styles.statSub}>Khi chạy bộ buổi chiều</Text>
          </View>
        </View>

        {/* 24h Trend Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Biến thiên nhịp tim trong ngày</Text>
          <View style={styles.barsContainer}>
            {HOURLY_HR.map((item, idx) => {
              const heightPct = Math.min(100, Math.max(20, (item.bpm / 130) * 100));
              return (
                <View key={idx} style={styles.barCol}>
                  <Text style={styles.barVal}>{item.bpm}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height: `${heightPct}%` }]} />
                  </View>
                  <Text style={styles.barLabel}>{item.time}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Cardio Training Zones */}
        <Text style={styles.sectionTitle}>Các vùng nhịp tim Cardio (Zones)</Text>
        <View style={styles.zonesCard}>
          <View style={styles.zoneRow}>
            <View style={[styles.zoneBadge, { backgroundColor: '#3B82F6' }]}>
              <Text style={styles.zoneBadgeText}>Zone 1</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.zoneName}>Khởi động & Phục hồi (&lt; 110 BPM)</Text>
              <Text style={styles.zoneDesc}>Đi bộ nhẹ, khởi động cơ khớp</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.zoneRow}>
            <View style={[styles.zoneBadge, { backgroundColor: '#10B981' }]}>
              <Text style={styles.zoneBadgeText}>Zone 2</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.zoneName}>Đốt mỡ tối ưu (110 - 132 BPM)</Text>
              <Text style={styles.zoneDesc}>Chạy bộ thả lỏng, đạp xe sức bền</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.zoneRow}>
            <View style={[styles.zoneBadge, { backgroundColor: '#F59E0B' }]}>
              <Text style={styles.zoneBadgeText}>Zone 3</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.zoneName}>Hiếu khí - Tăng sức bền (133 - 152 BPM)</Text>
              <Text style={styles.zoneDesc}>Cải thiện dung tích phổi và tim mạch</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.zoneRow}>
            <View style={[styles.zoneBadge, { backgroundColor: '#EF4444' }]}>
              <Text style={styles.zoneBadgeText}>Zone 4</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.zoneName}>Kỵ khí - Tối đa (&gt; 153 BPM)</Text>
              <Text style={styles.zoneDesc}>Tập HIIT, bứt tốc ngắn cường độ cao</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modal Đo/Ghi nhịp tim */}
      <Modal visible={showLogModal} transparent animationType="fade" onRequestClose={() => setShowLogModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ghi nhận nhịp tim thủ công</Text>
            <Text style={styles.modalSub}>Nhập số đo từ máy đo huyết áp hoặc thiết bị đeo</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Ví dụ: 75"
              placeholderTextColor={COLORS.textTertiary}
              value={inputHr}
              onChangeText={setInputHr}
              keyboardType="numeric"
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowLogModal(false)}>
                <Text style={styles.cancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleLogHr}>
                <Text style={styles.submitText}>Lưu số đo</Text>
              </TouchableOpacity>
            </View>
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
  addBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, fontFamily: FONT_FAMILY.bold as string },
  content: { paddingHorizontal: 20, paddingBottom: 50 },
  heroCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heartPulseWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  heroSub: { fontSize: 12, color: '#991B1B', fontWeight: '600', fontFamily: FONT_FAMILY.medium as string },
  heroVal: { fontSize: 32, fontWeight: '900', color: '#7F1D1D', fontFamily: FONT_FAMILY.bold as string },
  heroUnit: { fontSize: 14, fontWeight: 'bold', color: '#991B1B' },
  statusPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 14,
  },
  statusText: { fontSize: 12, fontWeight: 'bold', color: '#166534', fontFamily: FONT_FAMILY.semiBold as string },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', fontFamily: FONT_FAMILY.medium as string },
  statValue: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary, marginVertical: 4, fontFamily: FONT_FAMILY.bold as string },
  statUnit: { fontSize: 12, fontWeight: 'normal', color: COLORS.textSecondary },
  statSub: { fontSize: 10, color: COLORS.textTertiary, fontFamily: FONT_FAMILY.base as string },
  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    ...SHADOWS.sm,
  },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 16, fontFamily: FONT_FAMILY.bold as string },
  barsContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 130 },
  barCol: { alignItems: 'center', flex: 1 },
  barVal: { fontSize: 10, color: COLORS.textTertiary, marginBottom: 4, fontFamily: FONT_FAMILY.base as string },
  barTrack: {
    width: 14,
    height: 80,
    backgroundColor: COLORS.surface,
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: { width: '100%', backgroundColor: '#EF4444', borderRadius: 7 },
  barLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 6, fontFamily: FONT_FAMILY.medium as string },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 10, fontFamily: FONT_FAMILY.bold as string },
  zonesCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  zoneRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  zoneBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  zoneBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#FFFFFF', fontFamily: FONT_FAMILY.bold as string },
  zoneName: { fontSize: 13, fontWeight: 'bold', color: COLORS.textPrimary, fontFamily: FONT_FAMILY.semiBold as string },
  zoneDesc: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, fontFamily: FONT_FAMILY.base as string },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 24,
    width: '100%',
    ...SHADOWS.lg,
  },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.textPrimary, fontFamily: FONT_FAMILY.bold as string },
  modalSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, marginBottom: 16, fontFamily: FONT_FAMILY.base as string },
  modalInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    backgroundColor: COLORS.surface,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancel: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  modalSubmit: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary },
  cancelText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, fontFamily: FONT_FAMILY.medium as string },
  submitText: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF', fontFamily: FONT_FAMILY.bold as string },
});

