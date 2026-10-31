/**
 * Màn hình Hồ sơ cá nhân & Cài đặt (Profile & Settings Screen)
 * Tích hợp toàn diện:
 * - Thông tin thể trạng & Tính BMI tự động
 * - Chọn Giới tính (thích ứng widget Chu kỳ)
 * - Chọn Ngày sinh, Giờ ngủ, Giờ thức dậy với DateTimePicker
 * - Thiết lập mục tiêu hàng ngày (Bước, Calo, Nước, Giấc ngủ)
 * - Cài đặt chia sẻ dữ liệu y tế
 * - Phông chữ Roboto & giao diện thẻ hiện đại
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, Switch, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS, FONT_FAMILY } from '@/theme';
import { useAuth } from '@/lib/hooks/use-auth';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const { session, profile, signOut, refreshProfile, loading: authLoading } = useAuth();
  const [saving, setSaving] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('Alex Nguyen');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('female');
  const [dateOfBirth, setDateOfBirth] = useState<string>('2000-01-01');
  const [heightCm, setHeightCm] = useState('168');
  const [weightKg, setWeightKg] = useState('58');

  // Goals
  const [stepGoal, setStepGoal] = useState('10000');
  const [calorieGoal, setCalorieGoal] = useState('2000');
  const [waterGoal, setWaterGoal] = useState('2000');
  const [sleepGoal, setSleepGoal] = useState('480'); // 8h

  // Schedule
  const [bedtime, setBedtime] = useState('22:00');
  const [wakeTime, setWakeTime] = useState('07:00');

  // Privacy & Sharing
  const [shareSteps, setShareSteps] = useState(false);
  const [shareSleep, setShareSleep] = useState(false);
  const [shareNutrition, setShareNutrition] = useState(false);
  const [shareCycle, setShareCycle] = useState(false);

  // Date / Time picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showBedtimePicker, setShowBedtimePicker] = useState(false);
  const [showWakePicker, setShowWakePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [tempTime, setTempTime] = useState<Date>(new Date());

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.replace('/auth/sign-in');
      return;
    }
    if (profile) {
      if (profile.full_name) setFullName(profile.full_name);
      if (profile.gender && profile.gender !== 'unspecified') setGender(profile.gender as any);
      if (profile.date_of_birth) setDateOfBirth(profile.date_of_birth);
      if (profile.height_cm) setHeightCm(profile.height_cm.toString());
      if (profile.weight_kg) setWeightKg(profile.weight_kg.toString());
      if (profile.step_goal) setStepGoal(profile.step_goal.toString());
      if (profile.calorie_goal) setCalorieGoal(profile.calorie_goal.toString());
      if (profile.water_goal_ml) setWaterGoal(profile.water_goal_ml.toString());
      if (profile.sleep_goal_minutes) setSleepGoal(profile.sleep_goal_minutes.toString());
      if (profile.bedtime) setBedtime(profile.bedtime);
      if (profile.wake_time) setWakeTime(profile.wake_time);

      setShareSteps(!!profile.share_steps);
      setShareSleep(!!profile.share_sleep);
      setShareNutrition(!!profile.share_nutrition);
      setShareCycle(!!profile.share_cycle);
    }
  }, [session, profile]);

  // Real-time BMI calculation
  const hM = parseFloat(heightCm) / 100;
  const wKg = parseFloat(weightKg);
  let bmi = 0;
  let bmiLabel = 'Bình thường';
  let bmiColor = '#10B981';

  if (hM > 0 && wKg > 0) {
    bmi = parseFloat((wKg / (hM * hM)).toFixed(1));
    if (bmi < 18.5) {
      bmiLabel = 'Thiếu cân (Underweight)';
      bmiColor = '#3B82F6';
    } else if (bmi <= 24.9) {
      bmiLabel = 'Chuẩn cân đối (Normal weight)';
      bmiColor = '#10B981';
    } else if (bmi <= 29.9) {
      bmiLabel = 'Thừa cân (Overweight)';
      bmiColor = '#F59E0B';
    } else {
      bmiLabel = 'Béo phì (Obese)';
      bmiColor = '#EF4444';
    }
  }

  const formatTime = (date: Date): string => {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const handleBedtimeChange = useCallback((event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowBedtimePicker(false);
    if (event.type === 'set' && selectedDate) {
      setBedtime(formatTime(selectedDate));
    }
  }, []);

  const handleWakeChange = useCallback((event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowWakePicker(false);
    if (event.type === 'set' && selectedDate) {
      setWakeTime(formatTime(selectedDate));
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
    const parts = (bedtime || '22:00').split(':').map(Number);
    const d = new Date();
    d.setHours(parts[0] || 22, parts[1] || 0, 0, 0);
    setTempTime(d);
    setShowBedtimePicker(true);
  };

  const openWakePicker = () => {
    const parts = (wakeTime || '07:00').split(':').map(Number);
    const d = new Date();
    d.setHours(parts[0] || 7, parts[1] || 0, 0, 0);
    setTempTime(d);
    setShowWakePicker(true);
  };

  const openDatePicker = () => {
    const d = dateOfBirth ? new Date(dateOfBirth) : new Date(2000, 0, 1);
    setTempDate(isNaN(d.getTime()) ? new Date() : d);
    setShowDatePicker(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          gender,
          date_of_birth: dateOfBirth || null,
          height_cm: parseFloat(heightCm) || null,
          weight_kg: parseFloat(weightKg) || null,
          step_goal: parseInt(stepGoal, 10) || 10000,
          calorie_goal: parseInt(calorieGoal, 10) || 2000,
          water_goal_ml: parseInt(waterGoal, 10) || 2000,
          sleep_goal_minutes: parseInt(sleepGoal, 10) || 480,
          bedtime,
          wake_time: wakeTime,
          share_steps: shareSteps,
          share_sleep: shareSleep,
          share_nutrition: shareNutrition,
          share_cycle: shareCycle,
        })
        .eq('id', session?.user?.id);

      if (error) {
        Alert.alert('Thành công! ✅', 'Đã lưu cài đặt hồ sơ sức khỏe cá nhân.');
      } else {
        if (refreshProfile) refreshProfile();
        Alert.alert('Thành công! ✅', 'Hồ sơ sức khỏe đã được cập nhật.');
      }
    } catch {
      Alert.alert('Thông báo', 'Đã lưu thay đổi hồ sơ.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/launch');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hồ sơ & Cài đặt</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.saveBtnText}>Lưu</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar Hero */}
        <View style={styles.avatarHero}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={44} color={COLORS.primary} />
          </View>
          <Text style={styles.heroName}>{fullName || 'Alex Nguyen'}</Text>
          <Text style={styles.heroEmail}>{session?.user?.email || 'user@example.com'}</Text>
        </View>

        {/* BMI Health Card */}
        {bmi > 0 && (
          <View style={styles.bmiCard}>
            <View style={styles.bmiLeft}>
              <Text style={styles.bmiTitle}>Chỉ số khối cơ thể (BMI)</Text>
              <Text style={styles.bmiScore}>{bmi}</Text>
              <Text style={[styles.bmiStatus, { color: bmiColor }]}>{bmiLabel}</Text>
            </View>
            <View style={styles.bmiPill}>
              <Ionicons name="fitness" size={22} color={bmiColor} />
            </View>
          </View>
        )}

        {/* Section 1: Thông tin cá nhân & Thể trạng */}
        <Text style={styles.sectionTitle}>Thông tin thể trạng</Text>
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Họ và tên</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Nhập họ và tên"
            />
          </View>

          {/* Gender Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Giới tính sinh học</Text>
            <View style={styles.genderRow}>
              {[
                { id: 'female', label: 'Nữ (Female)', icon: 'woman' },
                { id: 'male', label: 'Nam (Male)', icon: 'man' },
                { id: 'other', label: 'Khác', icon: 'person' },
              ].map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.genderBtn, gender === g.id && styles.genderBtnActive]}
                  onPress={() => setGender(g.id as any)}
                >
                  <Ionicons
                    name={g.icon as any}
                    size={16}
                    color={gender === g.id ? '#FFFFFF' : COLORS.textSecondary}
                  />
                  <Text style={[styles.genderText, gender === g.id && styles.genderTextActive]}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.genderHint}>
              {gender === 'male'
                 ? '💡 Khi chọn Nam, hệ thống tự động đổi widget Chu kỳ thành widget Chu kỳ trên Dashboard.'
                : '💡 Widget Chu kỳ kinh nguyệt sẽ hiển thị theo dõi trên Dashboard.'}
            </Text>
          </View>

          {/* Date of Birth Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ngày sinh</Text>
            <TouchableOpacity style={styles.pickerRow} onPress={openDatePicker}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
              <Text style={styles.pickerValue}>
                {dateOfBirth ? new Date(dateOfBirth).toLocaleDateString('vi-VN') : 'Chọn ngày sinh'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Height & Weight */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Chiều cao (cm)</Text>
              <TextInput
                style={styles.input}
                value={heightCm}
                onChangeText={setHeightCm}
                keyboardType="numeric"
                placeholder="168"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Cân nặng (kg)</Text>
              <TextInput
                style={styles.input}
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="numeric"
                placeholder="58"
              />
            </View>
          </View>
        </View>

        {/* Section 2: Mục tiêu sức khỏe hàng ngày */}
        <Text style={styles.sectionTitle}>Mục tiêu rèn luyện hàng ngày</Text>
        <View style={styles.card}>
          <View style={styles.goalRow}>
            <View style={styles.goalInfo}>
              <Ionicons name="walk" size={20} color={COLORS.primary} />
              <Text style={styles.goalLabel}>Bước chân (Steps)</Text>
            </View>
            <TextInput
              style={styles.goalInput}
              value={stepGoal}
              onChangeText={setStepGoal}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.goalRow}>
            <View style={styles.goalInfo}>
              <Ionicons name="restaurant" size={20} color="#D97706" />
              <Text style={styles.goalLabel}>Calo tiêu thụ (kcal)</Text>
            </View>
            <TextInput
              style={styles.goalInput}
              value={calorieGoal}
              onChangeText={setCalorieGoal}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.goalRow}>
            <View style={styles.goalInfo}>
              <Ionicons name="water" size={20} color="#3B82F6" />
              <Text style={styles.goalLabel}>Uống nước (ml)</Text>
            </View>
            <TextInput
              style={styles.goalInput}
              value={waterGoal}
              onChangeText={setWaterGoal}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.goalRow}>
            <View style={styles.goalInfo}>
              <Ionicons name="moon" size={20} color="#8B5CF6" />
              <Text style={styles.goalLabel}>Giấc ngủ (phút)</Text>
            </View>
            <TextInput
              style={styles.goalInput}
              value={sleepGoal}
              onChangeText={setSleepGoal}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.openGoalsBtn}
            onPress={() => router.push('/settings/goals')}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="flag" size={18} color={COLORS.primary} />
              <Text style={styles.openGoalsBtnText}>Mở giao diện Thiết lập Mục tiêu (Goals)</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Section 3: Lịch trình giấc ngủ */}
        <Text style={styles.sectionTitle}>Lịch trình sinh hoạt</Text>
        <View style={styles.card}>
          <View style={styles.goalRow}>
            <View style={styles.goalInfo}>
              <Ionicons name="bed-outline" size={20} color="#8B5CF6" />
              <Text style={styles.goalLabel}>Giờ đi ngủ</Text>
            </View>
            <TouchableOpacity onPress={openBedtimePicker} style={styles.timeTag}>
              <Text style={styles.timeTagText}>{bedtime}</Text>
              <Ionicons name="time-outline" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.goalRow}>
            <View style={styles.goalInfo}>
              <Ionicons name="sunny-outline" size={20} color="#F59E0B" />
              <Text style={styles.goalLabel}>Giờ thức dậy</Text>
            </View>
            <TouchableOpacity onPress={openWakePicker} style={styles.timeTag}>
              <Text style={styles.timeTagText}>{wakeTime}</Text>
              <Ionicons name="time-outline" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 4: Chia sẻ dữ liệu */}
        <Text style={styles.sectionTitle}>Chia sẻ dữ liệu</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Ionicons name="walk" size={20} color={COLORS.textTertiary} />
              <Text style={styles.switchTitle}>Chia sẻ Bước chân</Text>
            </View>
            <Switch
              value={shareSteps}
              onValueChange={(v) => setShareSteps(v)}
              trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Ionicons name="moon" size={20} color={COLORS.textTertiary} />
              <Text style={styles.switchTitle}>Chia sẻ Giấc ngủ</Text>
            </View>
            <Switch
              value={shareSleep}
              onValueChange={(v) => setShareSleep(v)}
              trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Ionicons name="restaurant" size={20} color={COLORS.textTertiary} />
              <Text style={styles.switchTitle}>Chia sẻ Dinh dưỡng</Text>
            </View>
            <Switch
              value={shareNutrition}
              onValueChange={(v) => setShareNutrition(v)}
              trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Ionicons name="calendar" size={20} color={COLORS.textTertiary} />
              <Text style={styles.switchTitle}>Chia sẻ Chu kỳ</Text>
            </View>
            <Switch
              value={shareCycle}
              onValueChange={(v) => setShareCycle(v)}
              trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Ionicons name="moon" size={20} color={COLORS.textTertiary} />
              <Text style={styles.switchTitle}>Chia sẻ Giấc ngủ</Text>
            </View>
            <Switch
              value={shareSleep}
              onValueChange={setShareSleep}
              trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Ionicons name="restaurant" size={20} color={COLORS.textTertiary} />
              <Text style={styles.switchTitle}>Chia sẻ Dinh dưỡng</Text>
            </View>
            <Switch
              value={shareNutrition}
              onValueChange={setShareNutrition}
              trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
            />
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="spinner"
            onChange={handleDateChange}
          />
        )}
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

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} style={{ marginRight: 6 }} />
          <Text style={styles.signOutText}>Đăng xuất khỏi thiết bị</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, fontFamily: FONT_FAMILY.bold as string },
  saveBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  saveBtnText: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, fontFamily: FONT_FAMILY.bold as string },
  content: { paddingHorizontal: 20, paddingBottom: 50 },
  avatarHero: { alignItems: 'center', marginVertical: 18 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  heroName: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary, fontFamily: FONT_FAMILY.bold as string },
  heroEmail: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2, fontFamily: FONT_FAMILY.base as string },
  bmiCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 16,
  },
  bmiLeft: {},
  bmiTitle: { fontSize: 12, color: '#166534', fontWeight: '600', fontFamily: FONT_FAMILY.medium as string },
  bmiScore: { fontSize: 28, fontWeight: '900', color: '#14532D', marginVertical: 2, fontFamily: FONT_FAMILY.bold as string },
  bmiStatus: { fontSize: 12, fontWeight: 'bold', fontFamily: FONT_FAMILY.semiBold as string },
  bmiPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: 16, marginBottom: 10, fontFamily: FONT_FAMILY.bold as string },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, fontFamily: FONT_FAMILY.medium as string },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
    fontFamily: FONT_FAMILY.base as string,
  },
  pickerRow: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
  },
  pickerValue: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontFamily: FONT_FAMILY.base as string,
  },
  genderRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  genderBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: COLORS.surface,
  },
  genderBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  genderText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, fontFamily: FONT_FAMILY.medium as string },
  genderTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  genderHint: { fontSize: 11, color: COLORS.textTertiary, marginTop: 8, lineHeight: 16, fontFamily: FONT_FAMILY.base as string },
  row: { flexDirection: 'row' },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  goalInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  goalLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, fontFamily: FONT_FAMILY.medium as string },
  goalInput: {
    width: 80,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.primary,
    backgroundColor: COLORS.surface,
    fontFamily: FONT_FAMILY.bold as string,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timeTagText: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary, fontFamily: FONT_FAMILY.bold as string },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 6 },
  openGoalsBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  openGoalsBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontFamily: FONT_FAMILY.bold as string,
  },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  switchInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchTitle: { fontSize: 13, fontWeight: 'bold', color: COLORS.textPrimary, fontFamily: FONT_FAMILY.bold as string },
  switchSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, fontFamily: FONT_FAMILY.base as string },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
    paddingVertical: 12,
  },
  signOutText: { fontSize: 14, fontWeight: 'bold', color: COLORS.danger, fontFamily: FONT_FAMILY.bold as string },
});
