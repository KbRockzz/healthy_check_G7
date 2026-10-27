import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '@/theme';
import { supabase } from '@/lib/supabase';

/**
 * Màn hình Theo dõi số bước chân (Step Tracker Screen) — Mockup #7
 */
export default function StepTrackerScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Steps</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.goalText}>You have achieved 80% of your goal today</Text>

        {/* Vòng tròn tiến độ giả định */}
        <View style={styles.progressCircle}>
          <Ionicons name="footsteps" size={64} color={COLORS.primary} />
          <Text style={styles.stepsText}>11,857</Text>
          <Text style={styles.stepsSub}>Steps out of 18k</Text>
        </View>

        {/* 3 Widget con */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Ionicons name="flame" size={24} color={COLORS.warning} />
            <Text style={styles.metricValue}>850 kcal</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="location" size={24} color={COLORS.accent} />
            <Text style={styles.metricValue}>5 km</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="timer" size={24} color={COLORS.primary} />
            <Text style={styles.metricValue}>120 min</Text>
          </View>
        </View>

        {/* Chart (giả định) */}
        <View style={styles.chartContainer}>
          <View style={styles.chartToggle}>
            <TouchableOpacity style={styles.toggleActive}><Text style={styles.toggleActiveText}>Today</Text></TouchableOpacity>
            <TouchableOpacity><Text style={styles.toggleText}>Weekly</Text></TouchableOpacity>
            <TouchableOpacity><Text style={styles.toggleText}>Monthly</Text></TouchableOpacity>
          </View>
          {/* Biểu đồ giả định */}
          <View style={styles.chartPlaceholder}>
             <Text style={styles.chartPlaceholderText}>[Bar Chart Visualization]</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: 'bold' },
  content: { padding: 20 },
  goalText: { fontSize: FONT_SIZES.xl, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  progressCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 250,
    borderWidth: 10,
    borderColor: COLORS.surface,
    borderRadius: 125,
    marginBottom: 30,
  },
  stepsText: { fontSize: FONT_SIZES['4xl'], fontWeight: 'bold', color: COLORS.primary },
  stepsSub: { color: COLORS.textSecondary },
  metricsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  metricCard: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    width: '30%',
  },
  metricValue: { fontWeight: 'bold', marginTop: 8 },
  chartContainer: { backgroundColor: COLORS.card, padding: 20, borderRadius: BORDER_RADIUS.xl, ...SHADOWS.sm },
  chartToggle: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.full, padding: 4, marginBottom: 20 },
  toggleActive: { backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 20, borderRadius: BORDER_RADIUS.full },
  toggleActiveText: { color: COLORS.textInverse, fontWeight: 'bold' },
  toggleText: { paddingVertical: 8, paddingHorizontal: 20 },
  chartPlaceholder: { height: 200, alignItems: 'center', justifyContent: 'center' },
  chartPlaceholderText: { color: COLORS.textTertiary },
});
