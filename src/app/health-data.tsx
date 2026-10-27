import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '@/theme';

const metrics = [
  { label: 'Heart Rate', value: '68 BPM', icon: 'heart', color: '#EF4444' },
  { label: 'BMI', value: '18.69', icon: 'scale', color: '#0EA5E9' },
  { label: 'Body Weight', value: '52 kg', icon: 'analytics', color: '#8B5CF6' },
  { label: 'Blood Oxygen', value: '98%', icon: 'pulse', color: '#10B981' },
  { label: 'Blood Pressure', value: '120/80', icon: 'navigate', color: '#F59E0B' },
  { label: 'Water Intake', value: '2.1 L', icon: 'water', color: '#3B82F6' },
  { label: 'Resting Energy', value: '1,800 kcal', icon: 'flame', color: '#F59E0B' },
  { label: 'Body Fat', value: '22%', icon: 'fitness', color: '#6366F1' },
];

/**
 * Màn hình All Health Data — tổng hợp tất cả chỉ số
 */
export default function HealthDataScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} /></TouchableOpacity>
        <Text style={styles.headerTitle}>All Health Data</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Activity</Text>
        <View style={styles.card}>
          {metrics.slice(0, 4).map(m => (
            <MetricRow key={m.label} {...m} />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Body Measurements</Text>
        <View style={styles.card}>
          {metrics.slice(4, 6).map(m => (
            <MetricRow key={m.label} {...m} />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Wellness</Text>
        <View style={styles.card}>
          {metrics.slice(6).map(m => (
            <MetricRow key={m.label} {...m} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function MetricRow({ label, value, icon, color }: typeof metrics[0]) {
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}><Ionicons name={icon as any} size={22} color={color} /></View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 60 },
  headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: 'bold' },
  content: { padding: 16 },
  sectionTitle: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 20 },
  card: { backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', ...SHADOWS.sm },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: COLORS.border },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowLabel: { flex: 1, fontSize: FONT_SIZES.base, color: COLORS.textPrimary },
  rowValue: { fontSize: FONT_SIZES.base, fontWeight: 'bold', color: COLORS.textPrimary, marginRight: 8 },
});
