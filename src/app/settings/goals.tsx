/**
 * Màn hình thiết lập mục tiêu hàng ngày
 * Hiển thị khi người dùng chưa có profile hoặc muốn thay đổi goals
 */
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS, FONT_FAMILY } from '@/theme';
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

  // Time picker state
  const [showBedtimePicker, setShowBedtimePicker] = useState(false);
  const [showWakePicker, setShowWakePicker] = useState(false);
  const [tempTime, setTempTime] = useState<Date>(new Date());

  const handleChange = (key: keyof Goals, value: string) => {
    setGoals(prev => ({ ...prev, [key]: value }));
  };

  const formatTime = (date: Date): string => {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const handleBedtimePickerChange = useCallback((event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowBedtimePicker(false);
    if (event.type === 'set' && selectedDate) {
      setGoals(prev => ({ ...prev, bedtime: formatTime(selectedDate) }));
    }
  }, []);

  const handleWakePickerChange = useCallback((event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowWakePicker(false);
    if (event.type === 'set' && selectedDate) {
      setGoals(prev => ({ ...prev, wake_time: formatTime(selectedDate) }));
    }
  }, []);

  const openBedtimePicker = () => {
    const [h, m] = goals.bedtime.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    setTempTime(d);
    setShowBedtimePicker(true);
  };

  const openWakePicker = () => {
    const [h, m] = goals.wake_time.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    setTempTime(d);
    setShowWakePicker(true);
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

        {/* Bedtime Picker */}
        <TouchableOpacity
          style={[styles.inputRow, { marginTop: 10, height: 'auto', paddingVertical: 14 }]}
          onPress={openBedtimePicker}
        >
          <Text style={styles.timeLabel}>Giờ đi ngủ:</Text>
          <Text style={styles.timeDisplay}>{goals.bedtime}</Text>
          <Ionicons name="chevron-down" size={18} color={COLORS.textTertiary} />
        </TouchableOpacity>

        {/* Wake Time Picker */}
        <TouchableOpacity
          style={styles.inputRow}
          onPress={openWakePicker}
        >
          <Text style={styles.timeLabel}>Giờ thức dậy:</Text>
          <Text style={styles.timeDisplay}>{goals.wake_time}</Text>
          <Ionicons name="chevron-down" size={18} color={COLORS.textTertiary} />
        </TouchableOpacity>
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

      {/* Time Pickers */}
      {showBedtimePicker && (
        <DateTimePicker
          value={tempTime}
          mode="time"
          is24Hour={true}
          display="spinner"
          onChange={handleBedtimePickerChange}
        />
      )}
      {showWakePicker && (
        <DateTimePicker
          value={tempTime}
          mode="time"
          is24Hour={true}
          display="spinner"
          onChange={handleWakePickerChange}
        />
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
  headerTitle: { fontSize: FONT_SIZES.xl, fontWeight: 'bold', fontFamily: FONT_FAMILY.bold as string },
  banner: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  bannerText: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 20, fontFamily: FONT_FAMILY.base as string },
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
  sectionTitle: { fontSize: FONT_SIZES.base, fontWeight: '600', color: COLORS.textPrimary, fontFamily: FONT_FAMILY.semiBold as string },
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
    fontFamily: FONT_FAMILY.base as string,
  },
  inputSuffix: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    fontFamily: FONT_FAMILY.base as string,
    marginLeft: 8,
  },
  timeLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    width: 90,
    fontFamily: FONT_FAMILY.base as string,
  },
  timeDisplay: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
    marginLeft: 10,
    fontWeight: '500',
    fontFamily: FONT_FAMILY.medium as string,
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
