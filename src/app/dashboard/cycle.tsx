import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '@/theme';

/**
 * Màn hình Theo dõi chu kỳ kinh nguyệt (Cycle Tracker) — Mockup #10
 */
export default function CycleTrackerScreen() {
  const router = useRouter();

  const symptoms = ['cramps', 'headache', 'acne', 'fatigue', 'bloating', 'back_pain', 'nausea', 'none'];
  const moods = ['happy', 'neutral', 'sad', 'anxious', 'irritated', 'tired'];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Cycle</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Your average time of cycle is 28 days</Text>

        <View style={styles.circleContainer}>
          <Text style={styles.cycleDay}>Day 14</Text>
          <Text style={styles.cycleSub}>of 28 days</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.badge}>Ovulation Window</Text>
          <Text style={styles.sub}>Peak fertility days detected</Text>
        </View>

        <View style={styles.calendar}>
          {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28].map(d => (
            <View key={d} style={[styles.day, d === 14 && styles.dayActive]}><Text style={d === 14 ? styles.dayActiveText : styles.dayText}>{d}</Text></View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Log Symptoms</Text>
          <View style={styles.grid}>
            {symptoms.map(s => (
              <TouchableOpacity key={s} style={styles.iconBtn}><Text>{s}</Text></TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How do you feel?</Text>
          <View style={styles.grid}>
            {moods.map(m => (
              <TouchableOpacity key={m} style={[styles.iconBtn, {backgroundColor: COLORS.surface}]}><Text>{m}</Text></TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.btn}><Text style={styles.btnText}>Log Symptoms</Text></TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 60 },
  headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: 'bold' },
  content: { padding: 20 },
  title: { fontSize: FONT_SIZES.xl, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  circleContainer: { height: 200, width: 200, borderRadius: 100, borderWidth: 10, borderColor: COLORS.accent, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 30 },
  cycleDay: { fontSize: FONT_SIZES['4xl'], fontWeight: 'bold', color: COLORS.accent },
  cycleSub: { color: COLORS.textSecondary },
  card: { backgroundColor: COLORS.accent, padding: 20, borderRadius: BORDER_RADIUS.xl, alignItems: 'center', marginBottom: 30, ...SHADOWS.md },
  badge: { color: COLORS.textInverse, fontWeight: 'bold', fontSize: FONT_SIZES.lg },
  sub: { color: COLORS.textInverse, marginTop: 5 },
  calendar: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 30 },
  day: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', margin: 2 },
  dayActive: { backgroundColor: COLORS.accent },
  dayActiveText: { color: COLORS.textInverse, fontWeight: 'bold' },
  dayText: { color: COLORS.textSecondary },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: 'bold', marginBottom: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  iconBtn: { backgroundColor: COLORS.surface, padding: 15, borderRadius: BORDER_RADIUS.md, minWidth: 80, alignItems: 'center' },
  btn: { width: '100%', backgroundColor: COLORS.accent, padding: 18, borderRadius: BORDER_RADIUS.full, alignItems: 'center' },
  btnText: { color: COLORS.textInverse, fontWeight: 'bold', fontSize: FONT_SIZES.base }
});
