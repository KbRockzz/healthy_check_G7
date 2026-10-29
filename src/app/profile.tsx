/**
 * Màn hình Hồ sơ cá nhân (Profile Screen) - View + Edit toggle
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS, FONT_FAMILY } from '@/theme';
import { useAuth } from '@/lib/hooks/use-auth';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const { session, profile, signOut, loading: authLoading, isProfileComplete, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    height_cm: '',
    weight_kg: '',
    step_goal: '10000',
    calorie_goal: '2000',
    water_goal_ml: '2000',
    sleep_goal_minutes: '480',
    bedtime: '22:00',
    wake_time: '07:00',
  });
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'unspecified'>('unspecified');
  const [dateOfBirth, setDateOfBirth] = useState<string>('');
  const [shareSteps, setShareSteps] = useState(false);
  const [shareSleep, setShareSleep] = useState(false);
  const [shareNutrition, setShareNutrition] = useState(false);
  const [shareCycle, setShareCycle] = useState(false);
  const [shareHeartRate, setShareHeartRate] = useState(false);

  // Time picker state
  const [showBedtimePicker, setShowBedtimePicker] = useState(false);
  const [showWakePicker, setShowWakePicker] = useState(false);
  const [tempTime, setTempTime] = useState<Date>(new Date());

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  useEffect(() => {
    if (!session) {
      router.replace('/auth/sign-in');
      return;
    }
    if (profile) {
      setFormData({
        full_name: profile.full_name || session.user.user_metadata?.full_name || '',
        height_cm: profile.height_cm?.toString() || '',
        weight_kg: profile.weight_kg?.toString() || '',
        step_goal: profile.step_goal.toString(),
        calorie_goal: profile.calorie_goal.toString(),
        water_goal_ml: profile.water_goal_ml.toString(),
        sleep_goal_minutes: profile.sleep_goal_minutes.toString(),
        bedtime: profile.bedtime,
        wake_time: profile.wake_time,
      });
      setGender(profile.gender);
      setDateOfBirth(profile.date_of_birth || '');
      setShareSteps(profile.share_steps);
      setShareSleep(profile.share_sleep);
      setShareNutrition(profile.share_nutrition);
      setShareCycle(profile.share_cycle);
      setShareHeartRate(profile.share_heart_rate);
    }
  }, [session, profile]);

  // Removed: auto-redirect to onboarding - user navigates manually now

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatTime = (date: Date): string => {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const handleBedtimeChange = useCallback((event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowBedtimePicker(false);
    if (event.type === 'set' && selectedDate) {
      setFormData(prev => ({ ...prev, bedtime: formatTime(selectedDate) }));
    }
  }, []);

  const handleWakeChange = useCallback((event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowWakePicker(false);
    if (event.type === 'set' && selectedDate) {
      setFormData(prev => ({ ...prev, wake_time: formatTime(selectedDate) }));
    }
  }, []);

  const handleDateChange = useCallback((event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      setDateOfBirth(formatDate(selectedDate));
      setTempDate(selectedDate);
    }
  }, []);

  const openBedtimePicker = () => {
    const [h, m] = formData.bedtime.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    setTempTime(d);
    setShowBedtimePicker(true);
  };

  const openWakePicker = () => {
    const [h, m] = formData.wake_time.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    setTempTime(d);
    setShowWakePicker(true);
  };

  const openDatePicker = () => {
    const d = dateOfBirth ? new Date(dateOfBirth) : new Date();
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
          gender: gender,
          date_of_birth: dateOfBirth || null,
          height_cm: formData.height_cm ? parseFloat(formData.height_cm) : null,
          weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
          step_goal: parseInt(formData.step_goal) || 10000,
          calorie_goal: parseInt(formData.calorie_goal) || 2000,
          water_goal_ml: parseInt(formData.water_goal_ml) || 2000,
          sleep_goal_minutes: parseInt(formData.sleep_goal_minutes) || 480,
          bedtime: formData.bedtime,
          wake_time: formData.wake_time,
          share_steps: shareSteps,
          share_sleep: shareSleep,
          share_nutrition: shareNutrition,
          share_cycle: shareCycle,
          share_heart_rate: shareHeartRate,
        })
        .eq('id', session.user.id);

      if (error) throw error;
      Alert.alert('Thành công', 'Đã lưu thông tin hồ sơ');
      setIsEditing(false);
      // Refresh profile from server
      refreshProfile();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể lưu hồ sơ');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/launch');
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const renderInfoRow = (label: string, value: string, icon: string, onPress?: () => void) => (
    <TouchableOpacity style={styles.infoRow} onPress={onPress}>
      <Ionicons name={icon as any} size={20} color={COLORS.textTertiary} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'Chưa cập nhật'}</Text>
      </View>
      {onPress && (
        <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
      )}
    </TouchableOpacity>
  );

  const renderEditableInput = (label: string, field: string, value: string, keyboardType?: any) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(v) => handleChange(field, v)}
          keyboardType={keyboardType}
          placeholder={`Nhập ${label.toLowerCase()}`}
        />
      </View>
    </View>
  );

  if (authLoading) {
    return (
      <View style={styles.loader}>
        <Ionicons name="time" size={40} color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hồ sơ cá nhân</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {isEditing && (
            <TouchableOpacity onPress={() => setIsEditing(false)} style={{ marginRight: 12 }}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={isEditing ? handleSave : handleEditToggle}>
            <Text style={[styles.saveBtn, loading && styles.saveBtnDisabled]}>
              {loading ? 'Đang lưu...' : isEditing ? 'Lưu' : 'Chỉnh sửa'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={48} color={COLORS.primary} />
        </View>
        <Text style={styles.email}>{session?.user?.email}</Text>
      </View>

      {/* Personal Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>

        {isEditing ? (
          <>
            {renderEditableInput('Họ và tên', 'full_name', formData.full_name)}

            {/* Gender Selection */}
            <View style={styles.inputGroup}>
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
                      gender === g.value && styles.genderBtnActive,
                    ]}
                    onPress={() => setGender(g.value as any)}
                  >
                    <Ionicons name={g.icon as any} size={24} color={gender === g.value ? COLORS.textInverse : COLORS.primary} />
                    <Text style={[styles.genderLabel, gender === g.value && styles.genderLabelActive]}>
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Date of Birth */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ngày sinh</Text>
              <TouchableOpacity style={styles.inputRow} onPress={() => openDatePicker()}>
                <Ionicons name="calendar-outline" size={20} color={COLORS.textTertiary} />
                <Text style={styles.input}>
                  {dateOfBirth ? new Date(dateOfBirth).toLocaleDateString('vi-VN') : 'Chọn ngày sinh'}
                </Text>
                <Ionicons name="chevron-down" size={18} color={COLORS.textTertiary} />
              </TouchableOpacity>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Chiều cao (cm)</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="resize-outline" size={20} color={COLORS.textTertiary} />
                  <TextInput
                    style={styles.input}
                    value={formData.height_cm}
                    onChangeText={(v) => handleChange('height_cm', v)}
                    keyboardType="numeric"
                    placeholder="170"
                  />
                </View>
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Cân nặng (kg)</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="person-outline" size={20} color={COLORS.textTertiary} />
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
          </>
        ) : (
          <>
            {renderInfoRow('Họ và tên', formData.full_name || 'Chưa cập nhật', 'person-outline')}
            {renderInfoRow('Giới tính', gender === 'unspecified' ? 'Chưa cập nhật' : gender === 'male' ? 'Nam' : gender === 'female' ? 'Nữ' : 'Khác', 'person')}
            {renderInfoRow('Ngày sinh', dateOfBirth ? new Date(dateOfBirth).toLocaleDateString('vi-VN') : 'Chưa cập nhật', 'calendar')}
            {renderInfoRow('Chiều cao', formData.height_cm ? `${formData.height_cm} cm` : 'Chưa cập nhật', 'resize-outline')}
            {renderInfoRow('Cân nặng', formData.weight_kg ? `${formData.weight_kg} kg` : 'Chưa cập nhật', 'fitness-outline')}
          </>
        )}
      </View>

      {/* Goals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mục tiêu hàng ngày</Text>
        {isEditing ? (
          <>
            {renderEditableInput('Bước chân', 'step_goal', formData.step_goal, 'numeric')}
            {renderEditableInput('Calo', 'calorie_goal', formData.calorie_goal, 'numeric')}
            {renderEditableInput('Nước', 'water_goal_ml', formData.water_goal_ml, 'numeric')}
            {renderEditableInput('Giấc ngủ (phút)', 'sleep_goal_minutes', formData.sleep_goal_minutes, 'numeric')}
          </>
        ) : (
          <>
            {renderInfoRow('Bước chân', `${formData.step_goal} bước`, 'walk')}
            {renderInfoRow('Calo', `${formData.calorie_goal} kcal`, 'flame')}
            {renderInfoRow('Nước', `${formData.water_goal_ml} ml`, 'water')}
            {renderInfoRow('Giấc ngủ', `${formData.sleep_goal_minutes} phút`, 'moon')}
          </>
        )}
      </View>

      {/* Sleep Schedule */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lịch trình ngủ</Text>
        {isEditing ? (
          <>
            <TouchableOpacity style={styles.inputRow} onPress={openBedtimePicker}>
              <Ionicons name="bed-outline" size={20} color={COLORS.textTertiary} />
              <Text style={styles.input}>Giờ đi ngủ: {formData.bedtime}</Text>
              <Ionicons name="chevron-down" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.inputRow} onPress={openWakePicker}>
              <Ionicons name="sunny-outline" size={20} color={COLORS.textTertiary} />
              <Text style={styles.input}>Giờ thức dậy: {formData.wake_time}</Text>
              <Ionicons name="chevron-down" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            {renderInfoRow('Giờ đi ngủ', formData.bedtime, 'bed-outline')}
            {renderInfoRow('Giờ thức dậy', formData.wake_time, 'sunny-outline')}
          </>
        )}
      </View>

      {/* Sharing Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chia sẻ dữ liệu</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="walk" size={20} color={COLORS.textTertiary} />
            <Text style={styles.settingLabel}>Bước chân</Text>
          </View>
          {isEditing ? (
            <Switch
              value={shareSteps}
              onValueChange={setShareSteps}
              trackColor={{ false: COLORS.border, true: COLORS.primary + '80' }}
              thumbColor={shareSteps ? COLORS.primary : COLORS.textSecondary}
            />
          ) : (
            <Text style={styles.settingValue}>{shareSteps ? 'Bật' : 'Tắt'}</Text>
          )}
        </View>
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="moon" size={20} color={COLORS.textTertiary} />
            <Text style={styles.settingLabel}>Giấc ngủ</Text>
          </View>
          {isEditing ? (
            <Switch
              value={shareSleep}
              onValueChange={setShareSleep}
              trackColor={{ false: COLORS.border, true: COLORS.primary + '80' }}
              thumbColor={shareSleep ? COLORS.primary : COLORS.textSecondary}
            />
          ) : (
            <Text style={styles.settingValue}>{shareSleep ? 'Bật' : 'Tắt'}</Text>
          )}
        </View>
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="restaurant" size={20} color={COLORS.textTertiary} />
            <Text style={styles.settingLabel}>Dinh dưỡng</Text>
          </View>
          {isEditing ? (
            <Switch
              value={shareNutrition}
              onValueChange={setShareNutrition}
              trackColor={{ false: COLORS.border, true: COLORS.primary + '80' }}
              thumbColor={shareNutrition ? COLORS.primary : COLORS.textSecondary}
            />
          ) : (
            <Text style={styles.settingValue}>{shareNutrition ? 'Bật' : 'Tắt'}</Text>
          )}
        </View>
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="calendar" size={20} color={COLORS.textTertiary} />
            <Text style={styles.settingLabel}>Chu kỳ</Text>
          </View>
          {isEditing ? (
            <Switch
              value={shareCycle}
              onValueChange={setShareCycle}
              trackColor={{ false: COLORS.border, true: COLORS.primary + '80' }}
              thumbColor={shareCycle ? COLORS.primary : COLORS.textSecondary}
            />
          ) : (
            <Text style={styles.settingValue}>{shareCycle ? 'Bật' : 'Tắt'}</Text>
          )}
        </View>
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="heart" size={20} color={COLORS.textTertiary} />
            <Text style={styles.settingLabel}>Nhịp tim</Text>
          </View>
          {isEditing ? (
            <Switch
              value={shareHeartRate}
              onValueChange={setShareHeartRate}
              trackColor={{ false: COLORS.border, true: COLORS.primary + '80' }}
              thumbColor={shareHeartRate ? COLORS.primary : COLORS.textSecondary}
            />
          ) : (
            <Text style={styles.settingValue}>{shareHeartRate ? 'Bật' : 'Tắt'}</Text>
          )}
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

      {/* Time Pickers */}
      {showBedtimePicker && (
        <DateTimePicker
          value={tempTime}
          mode="time"
          is24Hour={true}
          display="spinner"
          onChange={handleBedtimeChange}
        />
      )}
      {showWakePicker && (
        <DateTimePicker
          value={tempTime}
          mode="time"
          is24Hour={true}
          display="spinner"
          onChange={handleWakeChange}
        />
      )}

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Ionicons name="log-out" size={20} color={COLORS.danger} />
        <Text style={styles.signOutText}>Đăng xuất</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 40 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: { fontSize: FONT_SIZES.xl, fontWeight: 'bold', fontFamily: FONT_FAMILY.bold as string },
  saveBtn: { fontSize: FONT_SIZES.base, color: COLORS.danger, fontWeight: '600', fontFamily: FONT_FAMILY.semiBold as string },
  saveBtnDisabled: { opacity: 0.5 },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  email: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 8, fontFamily: FONT_FAMILY.base as string },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    fontFamily: FONT_FAMILY.semiBold as string,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginBottom: 2,
    fontFamily: FONT_FAMILY.base as string,
  },
  infoValue: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
    fontFamily: FONT_FAMILY.base as string,
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
    marginLeft: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
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
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingLabel: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
    fontFamily: FONT_FAMILY.base as string,
  },
  settingValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontFamily: FONT_FAMILY.base as string,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.danger + '30',
    marginTop: 20,
  },
  signOutText: { fontSize: FONT_SIZES.base, color: COLORS.danger, fontWeight: '600', marginLeft: 8, fontFamily: FONT_FAMILY.semiBold as string },
});
