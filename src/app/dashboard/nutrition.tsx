import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '@/theme';

/**
 * Màn hình Theo dõi dinh dưỡng (Nutrition Tracker) — Mockup #9
 */
export default function NutritionScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Nutrition</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>You have consumed 960 kcal today</Text>

        <View style={styles.circleContainer}>
          <View style={styles.circle}><Text style={styles.percent}>60%</Text><Text style={styles.target}>of 1300 kcal</Text></View>
        </View>

        <View style={styles.list}>
          {[{l:'Fat', v:'80g', p:'40%', c: '#F59E0B'}, {l:'Protein', v:'160g', p:'56%', c:'#EF4444'}, {l:'Carbs', v:'230g', p:'62%', c:'#0EA5E9'}].map(i => (
            <View key={i.l} style={styles.item}>
               <View style={[styles.dot, {backgroundColor: i.c}]} />
               <Text style={styles.label}>{i.l}</Text>
               <Text style={styles.val}>{i.v}</Text>
               <Text style={styles.p}>{i.p}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.btn}><Text style={styles.btnText}>Add meals</Text></TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 60 },
  headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: 'bold' },
  content: { padding: 20, alignItems: 'center' },
  title: { fontSize: FONT_SIZES.xl, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  circleContainer: { height: 200, width: 200, borderRadius: 100, borderWidth: 10, borderColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  circle: { alignItems: 'center' },
  percent: { fontSize: FONT_SIZES['4xl'], fontWeight: 'bold' },
  target: { color: COLORS.textTertiary },
  list: { width: '100%', gap: 15, marginBottom: 40 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.lg, ...SHADOWS.sm },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 15 },
  label: { flex: 1, fontWeight: '500' },
  val: { marginRight: 20, fontWeight: 'bold' },
  p: { color: COLORS.textTertiary },
  btn: { width: '100%', backgroundColor: COLORS.primary, padding: 18, borderRadius: BORDER_RADIUS.full, alignItems: 'center' },
  btnText: { color: COLORS.textInverse, fontWeight: 'bold', fontSize: FONT_SIZES.base }
});
