/**
 * Màn hình All Health Data - Hiển thị tất cả chỉ số sức khỏe
 * Fetch từ Supabase và hiển thị thực tế
 */
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '@/theme';
import { useAuth } from '@/lib/hooks/use-auth';
import { supabase, HealthMetric, Profile } from '@/lib/supabase';

interface MetricRow {
  label: string;
  value: string;
  unit: string;
  icon: string;
  color: string;
}

export default function HealthDataScreen() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MetricRow[]>([]);
  const [profileData, setProfileData] = useState<Profile | null>(null);

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
      // Fetch latest metrics
      const { data: metricsData } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('user_id', session.user.id)
        .order('recorded_at', { ascending: false });

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      setProfileData(profileData);

      // Transform to display format
      const rows: MetricRow[] = [];

      // Heart rate
      const hr = metricsData?.find(m => m.metric_kind === 'heart_rate');
      if (hr) {
        rows.push({ label: 'Nhịp tim', value: hr.value.toString(), unit: 'BPM', icon: 'heart', color: '#EF4444' });
      }

      // BMI
      const bmi = metricsData?.find(m => m.metric_kind === 'body_mass_index');
      if (bmi) {
        rows.push({ label: 'BMI', value: bmi.value.toFixed(2), unit: '', icon: 'scale', color: COLORS.primary });
      }

      // Weight
      const weight = metricsData?.find(m => m.metric_kind === 'body_weight');
      if (weight) {
        rows.push({ label: 'Cân nặng', value: weight.value.toString(), unit: 'kg', icon: 'analytics', color: '#8B5CF6' });
      }

      // Height
      const height = metricsData?.find(m => m.metric_kind === 'body_height');
      if (height) {
        rows.push({ label: 'Chiều cao', value: height.value.toString(), unit: 'cm', icon: 'resize', color: '#10B981' });
      }

      // Body fat
      const fat = metricsData?.find(m => m.metric_kind === 'body_fat');
      if (fat) {
        rows.push({ label: 'Mỡ cơ thể', value: fat.value.toFixed(1), unit: '%', icon: 'fitness', color: '#6366F1' });
      }

      // Water intake
      const water = metricsData?.find(m => m.metric_kind === 'water_intake');
      if (water) {
        rows.push({ label: 'Nước uống', value: water.value.toString(), unit: 'ml', icon: 'water', color: '#3B82F6' });
      }

      // Resting energy
      const re = metricsData?.find(m => m.metric_kind === 'resting_energy');
      if (re) {
        rows.push({ label: 'Năng lượng nghỉ', value: re.value.toString(), unit: 'kcal', icon: 'flame', color: COLORS.warning });
      }

      // Blood oxygen
      const spo2 = metricsData?.find(m => m.metric_kind === 'blood_oxygen');
      if (spo2) {
        rows.push({ label: 'Oxy máu', value: spo2.value.toString(), unit: '%', icon: 'pulse', color: COLORS.success });
      }

      // Blood pressure
      const bpSys = metricsData?.find(m => m.metric_kind === 'blood_pressure_sys');
      const bpDia = metricsData?.find(m => m.metric_kind === 'blood_pressure_dia');
      if (bpSys && bpDia) {
        rows.push({ label: 'Huyết áp', value: `${bpSys.value}/${bpDia.value}`, unit: 'mmHg', icon: 'heartbeat', color: COLORS.danger });
      }

      setMetrics(rows);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (!session) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dữ liệu sức khỏe</Text>
        <TouchableOpacity onPress={fetchData}>
          <Ionicons name="refresh" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Profile Summary */}
      {profileData && (
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Ionicons name="person-circle" size={48} color={COLORS.primary} />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profileData.full_name || 'Người dùng'}</Text>
              <Text style={styles.profileBio}>
                {Math.round((profileData.height_cm || 0) > 0
                  ? (profileData.weight_kg || 0) / Math.pow((profileData.height_cm || 100) / 100, 2)
                  : 0
                ).toFixed(1)} BMI
              </Text>
            </View>
          </View>
          <View style={styles.profileStats}>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatValue}>{profileData.step_goal.toLocaleString()}</Text>
              <Text style={styles.profileStatLabel}>Bước/ngày</Text>
            </View>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatValue}>{profileData.calorie_goal.toLocaleString()}</Text>
              <Text style={styles.profileStatLabel}>Calo/ngày</Text>
            </View>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatValue}>{profileData.water_goal_ml}ml</Text>
              <Text style={styles.profileStatLabel}>Nước/ngày</Text>
            </View>
          </View>
        </View>
      )}

      {/* Activity Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hoạt động</Text>
        <View style={styles.card}>
          {metrics.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="fitness-outline" size={48} color={COLORS.textTertiary} />
              <Text style={styles.emptyText}>Chưa có dữ liệu</Text>
              <Text style={styles.emptySub}>Hãy ghi nhận các chỉ số sức khỏe của bạn</Text>
            </View>
          ) : (
            metrics.map((m, idx) => (
              <View key={idx} style={styles.row}>
                <View style={styles.iconWrap}>
                  <Ionicons name={m.icon as any} size={20} color={m.color} />
                </View>
                <Text style={styles.rowLabel}>{m.label}</Text>
                <Text style={styles.rowValue}>{m.value} {m.unit}</Text>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Goals */}
      {profileData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mục tiêu hàng ngày</Text>
          <View style={styles.card}>
            {[
              { label: 'Bước chân', value: profileData.step_goal.toLocaleString(), target: 'bước', color: COLORS.primary },
              { label: 'Calories', value: profileData.calorie_goal.toLocaleString(), target: 'kcal', color: COLORS.warning },
              { label: 'Nước', value: profileData.water_goal_ml.toString(), target: 'ml', color: '#3B82F6' },
              { label: 'Giấc ngủ', value: `${Math.floor(profileData.sleep_goal_minutes / 60)}h ${profileData.sleep_goal_minutes % 60}min`, target: 'mục tiêu', color: '#8B5CF6' },
            ].map((item, idx) => (
              <View key={idx} style={styles.row}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={[styles.rowValue, { color: item.color }]}>
                  {item.value} {item.target}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    marginBottom: 20,
  },
  headerTitle: { fontSize: FONT_SIZES.xl, fontWeight: 'bold' },
  profileCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: 20,
    marginBottom: 20,
    ...SHADOWS.sm,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileInfo: { marginLeft: 12 },
  profileName: { fontSize: FONT_SIZES.lg, fontWeight: 'bold', color: COLORS.textPrimary },
  profileBio: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 16,
  },
  profileStat: { alignItems: 'center' },
  profileStatValue: { fontSize: FONT_SIZES.base, fontWeight: 'bold', color: COLORS.textPrimary },
  profileStatLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowLabel: { flex: 1, fontSize: FONT_SIZES.base, color: COLORS.textPrimary },
  rowValue: { fontSize: FONT_SIZES.base, fontWeight: 'bold', color: COLORS.textPrimary },
  emptyState: { paddingVertical: 30, alignItems: 'center' },
  emptyText: { fontSize: FONT_SIZES.base, fontWeight: '600', color: COLORS.textPrimary, marginTop: 12 },
  emptySub: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
});
