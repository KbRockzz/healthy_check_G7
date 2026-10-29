/**
 * Màn hình Nutrition Tracker - Ghi nhận bữa ăn và calories
 */
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS, FONT_FAMILY } from '@/theme';
import { useAuth } from '@/lib/hooks/use-auth';
import { supabase } from '@/lib/supabase';

interface MealEntry {
  id: number;
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal: string;
  logged_on: string;
}

export default function NutritionScreen() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [calories, setCalories] = useState(0);
  const [goal, setGoal] = useState(2000);
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [foodName, setFoodName] = useState('');
  const [caloriesInput, setCaloriesInput] = useState('');
  const [proteinInput, setProteinInput] = useState('');
  const [carbsInput, setCarbsInput] = useState('');
  const [fatInput, setFatInput] = useState('');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');

  useEffect(() => {
    if (!session) {
      router.replace('/auth/sign-in');
      return;
    }
    fetchData();
  }, [session]);

  async function fetchData() {
    if (!session) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch total calories
      const { data } = await supabase
        .from('nutrition_logs')
        .select('calories')
        .eq('user_id', session.user.id)
        .eq('logged_on', today);

      const total = data?.reduce((sum, item) => sum + item.calories, 0) || 0;
      setCalories(total);

      // Fetch goal
      const { data: profileData } = await supabase
        .from('profiles')
        .select('calorie_goal')
        .eq('id', session.user.id)
        .single();
      if (profileData?.calorie_goal) setGoal(profileData.calorie_goal);

      // Fetch entries
      const { data: entriesData } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('logged_on', today)
        .order('created_at', { ascending: false });
      if (entriesData) setEntries(entriesData as MealEntry[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleAddMeal = async () => {
    if (!foodName.trim() || !caloriesInput) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên món ăn và calo');
      return;
    }

    const { error } = await supabase.from('nutrition_logs').insert({
      user_id: session?.user.id,
      logged_on: new Date().toISOString().split('T')[0],
      meal: mealType,
      food_name: foodName.trim(),
      quantity: 1,
      unit: 'phần',
      calories: parseInt(caloriesInput) || 0,
      protein_g: parseFloat(proteinInput) || 0,
      carbs_g: parseFloat(carbsInput) || 0,
      fat_g: parseFloat(fatInput) || 0,
    });

    if (error) {
      Alert.alert('Lỗi', error.message || 'Không thể ghi nhận');
      return;
    }

    Alert.alert(
      'Đã thêm! ✅',
      `Đã ghi nhận "${foodName}" - ${caloriesInput} kcal`,
      [{ text: 'OK' }]
    );

    // Reset form
    setFoodName('');
    setCaloriesInput('');
    setProteinInput('');
    setCarbsInput('');
    setFatInput('');
    setShowForm(false);
    fetchData();
  };

  const progress = Math.min((calories / goal) * 100, 100);
  const remaining = Math.max(goal - calories, 0);
  const mealLabels: Record<string, string> = {
    breakfast: 'Bữa sáng',
    lunch: 'Bữa trưa',
    dinner: 'Bữa tối',
    snack: 'Ăn nhẹ',
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
        <Text style={styles.headerTitle}>Nutrition</Text>
        <TouchableOpacity onPress={() => router.push('/settings/goals')}>
          <Ionicons name="settings-outline" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Calorie Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.calorieCircle}>
          <Text style={styles.calorieValue}>{calories}</Text>
          <Text style={styles.calorieLabel}>kcal</Text>
        </View>
        <View style={styles.calorieInfo}>
          <Text style={styles.calorieGoal}>Mục tiêu: {goal} kcal</Text>
          <Text style={[styles.calorieRemaining, { color: remaining > 0 ? COLORS.success : COLORS.danger }]}>
            {remaining > 0 ? `Còn ${remaining} kcal` : 'Đã đạt mục tiêu! 🎉'}
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: progress > 100 ? COLORS.danger : COLORS.primary }]} />
        </View>
      </View>

      {/* Macros */}
      <View style={styles.macroCard}>
        <Text style={styles.macroTitle}>Tóm tắt dinh dưỡng</Text>
        <View style={styles.macroRow}>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{entries.reduce((s, e) => s + e.protein_g, 0).toFixed(1)}g</Text>
            <Text style={styles.macroLabel}>Protein</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{entries.reduce((s, e) => s + e.carbs_g, 0).toFixed(1)}g</Text>
            <Text style={styles.macroLabel}>Carbs</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{entries.reduce((s, e) => s + e.fat_g, 0).toFixed(1)}g</Text>
            <Text style={styles.macroLabel}>Fat</Text>
          </View>
        </View>
      </View>

      {/* Add Meal Button */}
      <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(!showForm)}>
        <Ionicons name={showForm ? 'close' : 'add'} size={20} color={COLORS.textInverse} />
        <Text style={styles.addBtnText}>{showForm ? 'Hủy' : 'Thêm bữa ăn'}</Text>
      </TouchableOpacity>

      {/* Add Meal Form */}
      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Ghi nhận bữa ăn</Text>

          {/* Meal Type */}
          <View style={styles.mealTypeRow}>
            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.mealTypeBtn, mealType === type && styles.mealTypeBtnActive]}
                onPress={() => setMealType(type)}
              >
                <Text style={[styles.mealTypeText, mealType === type && styles.mealTypeTextActive]}>
                  {mealLabels[type]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputRow}>
            <Ionicons name="restaurant" size={20} color={COLORS.textTertiary} />
            <TextInput
              style={styles.input}
              placeholder="Tên món ăn..."
              value={foodName}
              onChangeText={setFoodName}
            />
          </View>

          <View style={styles.inputRow}>
            <Ionicons name="flame" size={20} color={COLORS.warning} />
            <TextInput
              style={styles.input}
              placeholder="Calories..."
              keyboardType="numeric"
              value={caloriesInput}
              onChangeText={setCaloriesInput}
            />
          </View>

          <View style={styles.rowInputs}>
            <View style={styles.inputSmall}>
              <Text style={styles.inputLabel}>Protein (g)</Text>
              <TextInput
                style={styles.smallInput}
                keyboardType="numeric"
                value={proteinInput}
                onChangeText={setProteinInput}
              />
            </View>
            <View style={styles.inputSmall}>
              <Text style={styles.inputLabel}>Carbs (g)</Text>
              <TextInput
                style={styles.smallInput}
                keyboardType="numeric"
                value={carbsInput}
                onChangeText={setCarbsInput}
              />
            </View>
            <View style={styles.inputSmall}>
              <Text style={styles.inputLabel}>Fat (g)</Text>
              <TextInput
                style={styles.smallInput}
                keyboardType="numeric"
                value={fatInput}
                onChangeText={setFatInput}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleAddMeal}>
            <Text style={styles.submitBtnText}>Ghi nhận</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Today's Entries */}
      <View style={styles.entriesSection}>
        <Text style={styles.entriesTitle}>Bữa ăn hôm nay</Text>
        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={48} color={COLORS.textTertiary} />
            <Text style={styles.emptyText}>Chưa có bữa ăn nào</Text>
            <Text style={styles.emptySub}>Hãy thêm bữa ăn đầu tiên của bạn!</Text>
          </View>
        ) : (
          entries.map(entry => (
            <View key={entry.id} style={styles.entryItem}>
              <View style={styles.entryLeft}>
                <View style={[styles.mealBadge, { backgroundColor: getMealColor(entry.meal) + '20' }]}>
                  <Text style={[styles.mealBadgeText, { color: getMealColor(entry.meal) }]}>{mealLabels[entry.meal]}</Text>
                </View>
                <Text style={styles.entryName}>{entry.food_name}</Text>
              </View>
              <Text style={styles.entryCalories}>{entry.calories} kcal</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function getMealColor(meal: string): string {
  switch (meal) {
    case 'breakfast': return '#F59E0B';
    case 'lunch': return '#10B981';
    case 'dinner': return '#8B5CF6';
    case 'snack': return '#EC4899';
    default: return COLORS.primary;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 40 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    marginBottom: 20,
  },
  headerTitle: { fontSize: FONT_SIZES.xl, fontWeight: 'bold', fontFamily: FONT_FAMILY.bold as string },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: 20,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  calorieCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calorieValue: { fontSize: 36, fontWeight: 'bold', color: COLORS.primary },
  calorieLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontFamily: FONT_FAMILY.base as string },
  calorieInfo: { marginTop: 16, alignItems: 'center' },
  calorieGoal: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontFamily: FONT_FAMILY.base as string },
  calorieRemaining: { fontSize: FONT_SIZES.base, fontWeight: '600', fontFamily: FONT_FAMILY.semiBold as string, marginTop: 4 },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 3,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  macroCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    marginTop: 16,
    ...SHADOWS.sm,
  },
  macroTitle: { fontSize: FONT_SIZES.base, fontWeight: '600', fontFamily: FONT_FAMILY.semiBold as string, marginBottom: 12 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-around' },
  macroItem: { alignItems: 'center' },
  macroValue: { fontSize: FONT_SIZES.lg, fontWeight: 'bold', fontFamily: FONT_FAMILY.bold as string, color: COLORS.textPrimary },
  macroLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontFamily: FONT_FAMILY.base as string, marginTop: 4 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.full,
    marginTop: 20,
    ...SHADOWS.md,
  },
  addBtnText: { color: COLORS.textInverse, fontWeight: '600', marginLeft: 8, fontSize: FONT_SIZES.base, fontFamily: FONT_FAMILY.semiBold as string },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    marginTop: 12,
    ...SHADOWS.sm,
  },
  formTitle: { fontSize: FONT_SIZES.lg, fontWeight: 'bold', fontFamily: FONT_FAMILY.bold as string, marginBottom: 16 },
  mealTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  mealTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  mealTypeBtnActive: { backgroundColor: COLORS.primary },
  mealTypeText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontFamily: FONT_FAMILY.base as string },
  mealTypeTextActive: { color: COLORS.textInverse, fontWeight: '600', fontFamily: FONT_FAMILY.semiBold as string },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 12,
  },
  input: { flex: 1, fontSize: FONT_SIZES.base, color: COLORS.textPrimary, fontFamily: FONT_FAMILY.base as string, marginLeft: 10 },
  rowInputs: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  inputSmall: { flex: 1 },
  inputLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontFamily: FONT_FAMILY.base as string, marginBottom: 4 },
  smallInput: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 12,
    height: 40,
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
  },
  submitBtn: {
    backgroundColor: COLORS.success,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
  },
  submitBtnText: { color: COLORS.textInverse, fontWeight: '600', fontSize: FONT_SIZES.base, fontFamily: FONT_FAMILY.semiBold as string },
  entriesSection: { marginTop: 20 },
  entriesTitle: { fontSize: FONT_SIZES.lg, fontWeight: 'bold', fontFamily: FONT_FAMILY.bold as string, marginBottom: 12 },
  entryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: 14,
    marginBottom: 8,
    ...SHADOWS.sm,
  },
  entryLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mealBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  mealBadgeText: { fontSize: FONT_SIZES.xs, fontWeight: '600', fontFamily: FONT_FAMILY.semiBold as string },
  entryName: { fontSize: FONT_SIZES.base, color: COLORS.textPrimary, fontFamily: FONT_FAMILY.base as string },
  entryCalories: { fontSize: FONT_SIZES.base, fontWeight: '600', fontFamily: FONT_FAMILY.semiBold as string, color: COLORS.primary },
  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.textPrimary, marginTop: 12 },
  emptySub: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontFamily: FONT_FAMILY.base as string, marginTop: 4 },
});
