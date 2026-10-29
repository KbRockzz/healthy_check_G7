/**
 * Onboarding Screen - Hướng dẫn người dùng mới thiết lập profile
 * Hiển thị sau khi đăng ký thành công, có thể skip để dùng mặc định
 */
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS, FONT_FAMILY } from '@/theme';
import { useAuth } from '@/lib/hooks/use-auth';
import { supabase } from '@/lib/supabase';

type Gender = 'male' | 'female' | 'other' | 'unspecified';

interface FormData {
  full_name: string;
  gender: Gender;
  date_of_birth: string;
  height_cm: string;
  weight_kg: string;
  step_goal: string;
  calorie_goal: string;
  water_goal_ml: string;
  sleep_goal_minutes: string;
  bedtime: string;
  wake_time: string;
}

const DEFAULT_DATA: FormData = {
  full_name: '',
  gender: 'unspecified',
  date_of_birth: '',
  height_cm: '',
  weight_kg: '',
  step_goal: '10000',
  calorie_goal: '2000',
  water_goal_ml: '2000',
  sleep_goal_minutes: '480',
  bedtime: '22:00',
  wake_time: '07:00',
};

export default function OnboardingScreen() {
  const router = useRouter();
  const { session, profile, refreshProfile, isProfileComplete } = useAuth();
  const [formData, setFormData] = useState<FormData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(false);

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  // Auto-redirect nếu profile đã đầy đủ
  useEffect(() => {
    if (profile && isProfileComplete()) {
      router.replace('/dashboard');
    }
  }, [profile, isProfileComplete]);

  // Load profile data nếu đã có
  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        full_name: profile.full_name || prev.full_name,
        gender: profile.gender || prev.gender,
        date_of_birth: profile.date_of_birth || prev.date_of_birth,
        height_cm: profile.height_cm?.toString() || prev.height_cm,
        weight_kg: profile.weight_kg?.toString() || prev.weight_kg,
      }));
    }
  }, [profile]);

  const handleChange = (key: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      setFormData(prev => ({ ...prev, date_of_birth: formatDate(selectedDate) }));
      setTempDate(selectedDate);
    }
  };

  const openDatePicker = () => {
    const d = formData.date_of_birth ? new Date(formData.date_of_birth) : new Date();
    setTempDate(d);
    setShowDatePicker(true);
  };

  const handleSave = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          gender: formData.gender,
          date_of_birth: formData.date_of_birth || null,
          height_cm: formData.height_cm ? parseFloat(formData.height_cm) : null,
          weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
          step_goal: parseInt(formData.step_goal) || 10000,
          calorie_goal: parseInt(formData.calorie_goal) || 2000,
          water_goal_ml: parseInt(formData.water_goal_ml) || 2000,
          sleep_goal_minutes: parseInt(formData.sleep_goal_minutes) || 480,
          bedtime: formData.bedtime,
          wake_time: formData.wake_time,
        })
        .eq('id', session.user.id);

      if (error) throw error;

      // Refresh profile from server
      await refreshProfile();

      router.replace('/dashboard');
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể lưu thông tin');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.replace('/dashboard');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="person-circle" size={64} color={COLORS.primary} />
        <Text style={styles.title}>Thiết lập hồ sơ</Text>
        <Text style={styles.subtitle}>
          Hoàn tất thông tin cá nhân để có trải nghiệm tốt nhất
        </Text>
      </View>

      {/* Full Name */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Họ và tên</Text>
          <TextInput
            style={styles.input}
            value={formData.full_name}
            onChangeText={(v) => handleChange('full_name', v)}
            placeholder="Nhập họ tên"
          />
        </View>

        {/* Gender Selection */}
        <Text style={styles.label}>Giới tính</Text>
        <View style={styles.genderGrid}>
          {[
            { value: 'male', label: 'Nam', icon: 'male' },
            { value: 'female', label: 'Nữ', icon: 'female' },
            { value: 'other', label: 'Khác', icon: 'accessibility' },
          ].map((g) => (
            <TouchableOpacity
              key={g.value}
              style={[
                styles.genderBtn,
                formData.gender === g.value && styles.genderBtnActive,
              ]}
              onPress={() => setFormData(prev => ({ ...prev, gender: g.value as Gender }))}
            >
              <Ionicons name={g.icon as any} size={24} color={formData.gender === g.value ? COLORS.textInverse : COLORS.primary} />
              <Text style={[styles.genderLabel, formData.gender === g.value && styles.genderLabelActive]}>
                {g.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date of Birth */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Ngày sinh</Text>
          <TouchableOpacity style={styles.inputRow} onPress={openDatePicker}>
            <Ionicons name="calendar-outline" size={20} color={COLORS.textTertiary} />
            <Text style={styles.dateInput}>
              {formData.date_of_birth
                ? new Date(formData.date_of_birth).toLocaleDateString('vi-VN')
                : 'Chọn ngày sinh'}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Physical Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin cơ thể</Text>
        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Chiều cao (cm)</Text>
            <TextInput
              style={styles.input}
              value={formData.height_cm}
              onChangeText={(v) => handleChange('height_cm', v)}
              keyboardType="numeric"
              placeholder="170"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cân nặng (kg)</Text>
            <TextInput
              style={styles.input}
              value={formData.weight_kg}
              onChangeText={(v) => handleChange('weight_kg', v)}
              keyboardType="numeric"
              placeholder="60"
            />
          </View>
        </View>
      </View>

      {/* Goals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mục tiêu hàng ngày</Text>
        {[
          { label: 'Bước chân', key: 'step_goal', suffix: 'bước', placeholder: '10000' },
          { label: 'Calo', key: 'calorie_goal', suffix: 'kcal', placeholder: '2000' },
          { label: 'Nước', key: 'water_goal_ml', suffix: 'ml', placeholder: '2000' },
          { label: 'Giấc ngủ', key: 'sleep_goal_minutes', suffix: 'phút', placeholder: '480' },
        ].map((item) => (
          <View key={item.key} style={styles.inputRow}>
            <Text style={styles.goalLabel}>{item.label}</Text>
            <View style={styles.goalInput}>
              <TextInput
                style={styles.goalInputText}
                value={formData[item.key as keyof FormData]}
                onChangeText={(v) => handleChange(item.key as keyof FormData, v)}
                keyboardType="numeric"
                placeholder={item.placeholder}
              />
              <Text style={styles.goalSuffix}>{item.suffix}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Schedule */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lịch trình ngủ</Text>
        <View style={styles.inputRow}>
          <Text style={styles.goalLabel}>Giờ đi ngủ</Text>
          <TextInput
            style={styles.goalInput}
            value={formData.bedtime}
            onChangeText={(v) => handleChange('bedtime', v)}
            placeholder="22:00"
          />
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.goalLabel}>Giờ thức dậy</Text>
          <TextInput
            style={styles.goalInput}
            value={formData.wake_time}
            onChangeText={(v) => handleChange('wake_time', v)}
            placeholder="07:00"
          />
        </View>
      </View>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="spinner"
          onChange={handleDateChange}
        />
      )}

      {/* Buttons */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.skipBtn, loading && styles.skipBtnDisabled]}
          onPress={handleSkip}
          disabled={loading}
        >
          <Text style={styles.skipBtnText}>Bỏ qua</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.skipBtnDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveBtnText}>
            {loading ? 'Đang lưu...' : 'Hoàn tất'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 40 },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    marginBottom: 20,
  },
  title: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: 16,
    fontFamily: FONT_FAMILY.bold as string,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
    fontFamily: FONT_FAMILY.base as string,
  },
  section: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
    fontFamily: FONT_FAMILY.semiBold as string,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 6,
    fontFamily: FONT_FAMILY.base as string,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 14,
    height: 48,
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
    fontFamily: FONT_FAMILY.base as string,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 12,
  },
  dateInput: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
    marginLeft: 10,
    fontFamily: FONT_FAMILY.base as string,
  },
  genderGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  genderBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  genderBtnActive: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  genderLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 8,
    fontFamily: FONT_FAMILY.base as string,
  },
  genderLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
    fontFamily: FONT_FAMILY.semiBold as string,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  goalLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    width: 100,
    fontFamily: FONT_FAMILY.base as string,
  },
  goalInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 14,
    height: 48,
  },
  goalInputText: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
    fontFamily: FONT_FAMILY.base as string,
  },
  goalSuffix: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    marginLeft: 8,
    fontFamily: FONT_FAMILY.base as string,
  },
  buttonGroup: {
    marginTop: 20,
    gap: 12,
  },
  skipBtn: {
    backgroundColor: COLORS.surface,
    paddingVertical: 16,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
  },
  skipBtnText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textSecondary,
    fontFamily: FONT_FAMILY.semiBold as string,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  skipBtnDisabled: { opacity: 0.7 },
  saveBtnText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textInverse,
    fontFamily: FONT_FAMILY.semiBold as string,
  },
});
