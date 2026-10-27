/**
 * Màn hình thiết lập mục tiêu hàng ngày
 * Hiển thị khi người dùng chưa có profile hoặc muốn thay đổi goals
 */
import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '@/theme';
import { useAuth } from '@/lib/hooks/use-auth';
import { supabase } from '@/lib/supabase';

interface Goals {
  step_goal: number;
  calorie_goal: number;
  water_goal_ml: number;
  sleep_goal_minutes: number;
  bedtime: string;
  wake_time: string;
}

const DEFAULT_GOALS: Goals = {
  step_goal: 10000,
  calorie_goal: 2000,
  water_goal_ml: 2000,
  sleep_goal_minutes: 480,
  bedtime: '22:00',
  wake_time: '07:00',
};

export default function GoalSetupScreen() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState<Goals>(profile ? {
    step_goal: profile.step_goal,
    calorie_goal: profile.calorie_goal,
    water_goal_ml: profile.water_goal_ml,
    sleep_goal_minutes: profile.sleep_goal_minutes,
    bedtime: profile.bedtime,
    wake_time: profile.wake_time,
  } : DEFAULT_GOALS);

  const handleChange = (key: keyof Goals, value: string) => {
    setGoals(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          step_goal: goals.step_goal,
          calorie_goal: goals.calorie_goal,
          water_goal_ml: goals.water_goal_ml,
          sleep_goal_minutes: goals.sleep_goal_minutes,
          bedtime: goals.bedtime,
          wake_time: goals.wake_time,
        })
        .eq('id', session.user.id);

      if (error) throw error;

      Alert.alert(
        'Đã lưu thành công! ✅',
        'Mục tiêu hàng ngày của bạn đã được cập nhật.',
        [{ text: 'Bắt đầu', onPress: () => router.replace('/dashboard') }]
      );
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể lưu mục tiêu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thiết lập mục tiêu</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Banner */}
      <View style={styles.banner}>
        <Ionicons name="flag" size={32} color={COLORS.primary} />
        <Text style={styles.bannerText}>
          Thiết lập mục tiêu hàng ngày để theo dõi tiến trình sức khỏe
        </Text>
      </View>

      {/* Steps Goal */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="walk" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Mục tiêu bước chân</Text>
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={goals.step_goal.toString()}
            onChangeText={(v) => handleChange('step_goal', v)}
            keyboardType="numeric"
            placeholder="10000"
          />
          <Text style={styles.inputSuffix}>bước/ngày</Text>
        </View>
      </View>

      {/* Calories Goal */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="flame" size={24} color={COLORS.warning} />
          <Text style={styles.sectionTitle}>Mục tiêu calo</Text>
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={goals.calorie_goal.toString()}
            onChangeText={(v) => handleChange('calorie_goal', v)}
            keyboardType="numeric"
            placeholder="2000"
          />
          <Text style={styles.inputSuffix}>kcal/ngày</Text>
        </View>
      </View>

      {/* Water Goal */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="water" size={24} color="#3B82F6" />
          <Text style={styles.sectionTitle}>Mục tiêu nước</Text>
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={goals.water_goal_ml.toString()}
            onChangeText={(v) => handleChange('water_goal_ml', v)}
            keyboardType="numeric"
            placeholder="2000"
          />
          <Text style={styles.inputSuffix}>ml/ngày</Text>
        </View>
      </View>

      {/* Sleep Schedule */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="moon" size={24} color="#8B5CF6" />
          <Text style={styles.sectionTitle}>Giấc ngủ</Text>
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={goals.sleep_goal_minutes.toString()}
            onChangeText={(v) => handleChange('sleep_goal_minutes', v)}
            keyboardType="numeric"
            placeholder="480"
          />
          <Text style={styles.inputSuffix}>phút/ngày</Text>
        </View>
        <View style={[styles.inputRow, { marginTop: 10 }]}>
          <Text style={styles.timeLabel}>Giờ đi ngủ:</Text>
          <TextInput
            style={styles.timeInput}
            value={goals.bedtime}
            onChangeText={(v) => handleChange('bedtime', v)}
            placeholder="22:00"
          />
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.timeLabel}>Giờ thức dậy:</Text>
          <TextInput
            style={styles.timeInput}
            value={goals.wake_time}
            onChangeText={(v) => handleChange('wake_time', v)}
            placeholder="07:00"
          />
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.textInverse} />
        ) : (
          <Text style={styles.saveBtnText}>Lưu mục tiêu</Text>
        )}
      </TouchableOpacity>
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
  banner: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  bannerText: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 20 },
  section: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: FONT_SIZES.base, fontWeight: '600', color: COLORS.textPrimary },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 14,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
  },
  inputSuffix: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    marginLeft: 8,
  },
  timeLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    width: 90,
  },
  timeInput: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 14,
    height: 48,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    ...SHADOWS.md,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textInverse,
  },
});
