/**
 * Màn hình Hồ sơ cá nhân (Profile Screen)
 */
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '@/theme';
import { useAuth } from '@/lib/hooks/use-auth';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const { session, profile, signOut, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    if (!session) {
      router.replace('/auth/sign-in');
      return;
    }
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        height_cm: profile.height_cm?.toString() || '',
        weight_kg: profile.weight_kg?.toString() || '',
        step_goal: profile.step_goal.toString(),
        calorie_goal: profile.calorie_goal.toString(),
        water_goal_ml: profile.water_goal_ml.toString(),
        sleep_goal_minutes: profile.sleep_goal_minutes.toString(),
        bedtime: profile.bedtime,
        wake_time: profile.wake_time,
      });
    }
  }, [session, profile]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
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
      Alert.alert('Thành công', 'Đã lưu thông tin hồ sơ');
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
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          <Text style={[styles.saveBtn, loading && styles.saveBtnDisabled]}>
            {loading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
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
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TouchableOpacity style={styles.inputRow}>
            <Ionicons name="person-outline" size={20} color={COLORS.textTertiary} />
            <Text style={styles.inputValue}>{formData.full_name || 'Enter your name'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.label}>Height (cm)</Text>
            <TouchableOpacity style={styles.inputRow}>
              <Ionicons name="resize-outline" size={20} color={COLORS.textTertiary} />
              <Text style={styles.inputValue}>{formData.height_cm || '170'}</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Weight (kg)</Text>
            <TouchableOpacity style={styles.inputRow}>
              <Ionicons name="person-outline" size={20} color={COLORS.textTertiary} />
              <Text style={styles.inputValue}>{formData.weight_kg || '60'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Goals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Goals</Text>
        {[
          { label: 'Steps', key: 'step_goal', icon: 'walk', suffix: 'steps' },
          { label: 'Calories', key: 'calorie_goal', icon: 'fire', suffix: 'kcal' },
          { label: 'Water', key: 'water_goal_ml', icon: 'water', suffix: 'ml' },
          { label: 'Sleep', key: 'sleep_goal_minutes', icon: 'moon', suffix: 'min' },
        ].map((item) => (
          <View key={item.key} style={styles.inputGroup}>
            <Text style={styles.label}>{item.label}</Text>
            <TouchableOpacity style={styles.inputRow}>
              <Ionicons name={item.icon as any} size={20} color={COLORS.textTertiary} />
              <Text style={styles.inputValue}>{formData[item.key as keyof typeof formData]}</Text>
              <Text style={styles.inputSuffix}>{item.suffix}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Schedule */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sleep Schedule</Text>
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.label}>Bedtime</Text>
            <TouchableOpacity style={styles.inputRow}>
              <Ionicons name="bed-outline" size={20} color={COLORS.textTertiary} />
              <Text style={styles.inputValue}>{formData.bedtime}</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Wake Up</Text>
            <TouchableOpacity style={styles.inputRow}>
              <Ionicons name="sunny-outline" size={20} color={COLORS.textTertiary} />
              <Text style={styles.inputValue}>{formData.wake_time}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Ionicons name="log-out" size={20} color={COLORS.danger} />
        <Text style={styles.signOutText}>Sign Out</Text>
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
  headerTitle: { fontSize: FONT_SIZES.xl, fontWeight: 'bold' },
  saveBtn: { fontSize: FONT_SIZES.base, color: COLORS.primary, fontWeight: '600' },
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
  email: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 8 },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 14,
    height: 48,
  },
  inputValue: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
    marginLeft: 10,
  },
  inputSuffix: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    marginLeft: 8,
  },
  row: {
    flexDirection: 'row',
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
  },
  signOutText: { fontSize: FONT_SIZES.base, color: COLORS.danger, fontWeight: '600', marginLeft: 8 },
});
