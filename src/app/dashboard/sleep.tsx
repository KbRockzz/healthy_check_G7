import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '@/theme';

/**
 * Màn hình Theo dõi giấc ngủ (Sleep Tracker) — Mockup #8
 */
export default function SleepTrackerScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Sleep</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.avgText}>Your average time of sleep a day is 7h 31 min</Text>

        <View style={styles.chartContainer}>
           <Text style={styles.chartPlaceholder}>[Weekly Sleep Chart]</Text>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}><Text>Sleep rate</Text><Text style={styles.value}>82%</Text></View>
          <View style={styles.metricCard}><Text>Deep sleep</Text><Text style={styles.value}>1h 3min</Text></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Set your schedule</Text>
          <View style={styles.row}>
            <View style={[styles.timeBox, {backgroundColor: '#EF4444'}]}><Text style={styles.timeLabel}>Bedtime</Text><Text style={styles.timeVal}>22:00 pm</Text></View>
            <View style={[styles.timeBox, {backgroundColor: '#F59E0B'}]}><Text style={styles.timeLabel}>Wake up</Text><Text style={styles.timeVal}>07:30 am</Text></View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 60 },
  headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: 'bold' },
  content: { padding: 20 },
  avgText: { fontSize: FONT_SIZES.xl, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  chartContainer: { height: 200, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xl, marginBottom: 20, alignItems: 'center', justifyContent: 'center' },
  metricsGrid: { flexDirection: 'row', gap: 20, marginBottom: 20 },
  metricCard: { flex: 1, padding: 20, backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.lg, alignItems: 'center', ...SHADOWS.sm },
  value: { fontSize: FONT_SIZES.lg, fontWeight: 'bold', marginTop: 10 },
  card: { padding: 20, backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.xl, ...SHADOWS.sm },
  cardTitle: { fontSize: FONT_SIZES.lg, fontWeight: 'bold', marginBottom: 15 },
  row: { flexDirection: 'row', gap: 15 },
  timeBox: { flex: 1, padding: 15, borderRadius: BORDER_RADIUS.md },
  timeLabel: { color: COLORS.textInverse, fontSize: FONT_SIZES.xs },
  timeVal: { color: COLORS.textInverse, fontWeight: 'bold', marginTop: 5 },
  chartPlaceholder: { color: COLORS.textTertiary }
});
