/**
 * Màn hình Nutrition Tracker - Calorie Ring, Đa lượng chất Carbs/Protein/Fat & Gợi ý Món ăn
 * Khớp thiết kế Mockup #7: Dashboard - Nutrition Tracker.png & Tích hợp Roboto Fonts
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  logged_on: string;
}

const PRESET_FOODS = [
  { name: 'Phở bò tái nạm', cal: 450, p: 28, c: 58, f: 12, meal: 'breakfast' },
  { name: 'Bánh mì ức gà nướng', cal: 380, p: 26, c: 45, f: 8, meal: 'lunch' },
  { name: 'Salad cá hồi quả bơ', cal: 520, p: 35, c: 18, f: 26, meal: 'dinner' },
  { name: 'Yến mạch sữa tươi & chuối', cal: 310, p: 12, c: 54, f: 5, meal: 'breakfast' },
  { name: 'Sữa chua Hy Lạp & việt quất', cal: 160, p: 15, c: 18, f: 2, meal: 'snack' },
  { name: 'Hạnh nhân sấy (30g)', cal: 170, p: 6, c: 6, f: 15, meal: 'snack' },
];

export default function NutritionScreen() {
  const router = useRouter();
  const { session, profile, loading: authLoading } = useAuth();

  const [calories, setCalories] = useState(1850);
  const [goal, setGoal] = useState(2200);

  // Macros state
  const [carbs, setCarbs] = useState(210);
  const [carbsGoal] = useState(250);
  const [protein, setProtein] = useState(95);
  const [proteinGoal] = useState(110);
  const [fat, setFat] = useState(55);
  const [fatGoal] = useState(70);

  const [showAddModal, setShowAddModal] = useState(false);

  // Manual Form
  const [foodName, setFoodName] = useState('');
  const [calInput, setCalInput] = useState('');
  const [mealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');

  const fetchData = useCallback(async () => {
    if (!session) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const storageKey = `@healthy_check_calories_${today}`;
      const savedCal = await AsyncStorage.getItem(storageKey);
      if (savedCal) setCalories(parseInt(savedCal, 10));

      const { data } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('logged_on', today)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        const totalCal = data.reduce((sum, item) => sum + (item.calories || 0), 0);
        setCalories(totalCal);
        await AsyncStorage.setItem(storageKey, totalCal.toString());
      }

      if (profile?.calorie_goal) setGoal(profile.calorie_goal);
    } catch {
      // keep state
    }
  }, [session, profile]);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.replace('/auth/sign-in');
      return;
    }
    fetchData();
  }, [session, authLoading, fetchData]);

  const handleAddMeal = async (food: { name: string; cal: number; p: number; c: number; f: number; meal: string }) => {
    const today = new Date().toISOString().split('T')[0];
    const storageKey = `@healthy_check_calories_${today}`;
    const nextCal = calories + food.cal;
    setCalories(nextCal);
    setCarbs((prev) => prev + food.c);
    setProtein((prev) => prev + food.p);
    setFat((prev) => prev + food.f);

    try {
      await AsyncStorage.setItem(storageKey, nextCal.toString());
      await supabase.from('nutrition_logs').insert({
        user_id: session?.user.id,
        logged_on: today,
        meal: food.meal,
        food_name: food.name,
        quantity: 1,
        unit: 'phần',
        calories: food.cal,
        protein_g: food.p,
        carbs_g: food.c,
        fat_g: food.f,
      });
    } catch {
      // local update persisted
    }

    setShowAddModal(false);
    setFoodName('');
    setCalInput('');
    Alert.alert('Đã thêm bữa ăn! 🥗', `${food.name} (+${food.cal} kcal)`);
  };

  const handleSimulateBarcode = () => {
    Alert.alert(
      'Quét mã vạch thực phẩm 📷',
      'Đã quét thành công sản phẩm: "Thanh Protein Yến Mạch Granola"\n• Calo: 210 kcal\n• Protein: 14g\n• Carbs: 22g\n• Fat: 6g',
      [
        { text: 'Hủy' },
        {
          text: 'Thêm vào nhật ký',
          onPress: () => {
            handleAddMeal({
              name: 'Thanh Protein Granola',
              cal: 210,
              p: 14,
              c: 22,
              f: 6,
              meal: 'snack',
            });
          },
        },
      ]
    );
  };

  const remaining = Math.max(0, goal - calories);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nutrition Tracker</Text>
        <TouchableOpacity onPress={handleSimulateBarcode} style={styles.scanBtn}>
          <Ionicons name="barcode-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Calorie Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroTitle}>Calorie Budget</Text>
            <Text style={styles.heroCalNum}>{calories.toLocaleString()}</Text>
            <Text style={styles.heroTarget}>/ {goal.toLocaleString()} kcal</Text>
            <View style={styles.remainingPill}>
              <Text style={styles.remainingPillText}>Còn lại: {remaining.toLocaleString()} kcal</Text>
            </View>
          </View>

          <View style={styles.ringContainer}>
            <View style={styles.outerRing}>
              <Text style={styles.ringPercent}>{Math.round((calories / goal) * 100)}%</Text>
              <Text style={styles.ringLabel}>Consumed</Text>
            </View>
          </View>
        </View>

        {/* Macronutrient Progress Bars */}
        <View style={styles.macrosCard}>
          <Text style={styles.cardHeader}>Tỷ lệ đa lượng chất (Macros)</Text>

          {/* Carbs */}
          <View style={styles.macroRow}>
            <View style={styles.macroInfo}>
              <Text style={styles.macroLabel}>Carbohydrates</Text>
              <Text style={styles.macroVal}>{carbs}g / {carbsGoal}g ({Math.round((carbs / carbsGoal) * 100)}%)</Text>
            </View>
            <View style={styles.macroBarBg}>
              <View style={[styles.macroBarFill, { width: `${Math.min(100, (carbs / carbsGoal) * 100)}%`, backgroundColor: '#3B82F6' }]} />
            </View>
          </View>

          {/* Protein */}
          <View style={styles.macroRow}>
            <View style={styles.macroInfo}>
              <Text style={styles.macroLabel}>Protein (Đạm)</Text>
              <Text style={styles.macroVal}>{protein}g / {proteinGoal}g ({Math.round((protein / proteinGoal) * 100)}%)</Text>
            </View>
            <View style={styles.macroBarBg}>
              <View style={[styles.macroBarFill, { width: `${Math.min(100, (protein / proteinGoal) * 100)}%`, backgroundColor: '#10B981' }]} />
            </View>
          </View>

          {/* Fat */}
          <View style={styles.macroRow}>
            <View style={styles.macroInfo}>
              <Text style={styles.macroLabel}>Fat (Chất béo lành mạnh)</Text>
              <Text style={styles.macroVal}>{fat}g / {fatGoal}g ({Math.round((fat / fatGoal) * 100)}%)</Text>
            </View>
            <View style={styles.macroBarBg}>
              <View style={[styles.macroBarFill, { width: `${Math.min(100, (fat / fatGoal) * 100)}%`, backgroundColor: '#F59E0B' }]} />
            </View>
          </View>
        </View>

        {/* Meal Categories */}
        <Text style={styles.sectionTitle}>Các bữa ăn trong ngày</Text>

        <View style={styles.mealsList}>
          {/* Breakfast */}
          <View style={styles.mealCard}>
            <View style={styles.mealHeader}>
              <View style={styles.mealTitleRow}>
                <Ionicons name="sunny-outline" size={20} color="#F59E0B" />
                <Text style={styles.mealName}>Bữa sáng (Breakfast)</Text>
              </View>
              <Text style={styles.mealCalories}>450 kcal</Text>
            </View>
            <Text style={styles.mealDetailText}>• Phở bò tái nạm (1 tô vừa)</Text>
          </View>

          {/* Lunch */}
          <View style={styles.mealCard}>
            <View style={styles.mealHeader}>
              <View style={styles.mealTitleRow}>
                <Ionicons name="partly-sunny-outline" size={20} color="#10B981" />
                <Text style={styles.mealName}>Bữa trưa (Lunch)</Text>
              </View>
              <Text style={styles.mealCalories}>650 kcal</Text>
            </View>
            <Text style={styles.mealDetailText}>• Cơm gạo lứt ức gà nướng & rau củ hấp</Text>
          </View>

          {/* Dinner */}
          <View style={styles.mealCard}>
            <View style={styles.mealHeader}>
              <View style={styles.mealTitleRow}>
                <Ionicons name="moon-outline" size={20} color="#6366F1" />
                <Text style={styles.mealName}>Bữa tối (Dinner)</Text>
              </View>
              <Text style={styles.mealCalories}>600 kcal</Text>
            </View>
            <Text style={styles.mealDetailText}>• Salad cá hồi dầu giấm quả bơ</Text>
          </View>

          {/* Snack */}
          <View style={styles.mealCard}>
            <View style={styles.mealHeader}>
              <View style={styles.mealTitleRow}>
                <Ionicons name="cafe-outline" size={20} color="#EC4899" />
                <Text style={styles.mealName}>Bữa phụ (Snacks)</Text>
              </View>
              <Text style={styles.mealCalories}>150 kcal</Text>
            </View>
            <Text style={styles.mealDetailText}>• 1 quả táo xanh & 10 hạt hạnh nhân</Text>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.addFoodBtn}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.addFoodBtnText}>Ghi nhận món ăn mới (Add Food)</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add Food Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalTopRow}>
              <Text style={styles.modalTitle}>Thêm món ăn</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close-circle" size={26} color={COLORS.textTertiary} />
              </TouchableOpacity>
            </View>

            {/* Quick Presets */}
            <Text style={styles.presetHeading}>Gợi ý món ăn phổ biến (1 chạm)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
              {PRESET_FOODS.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.presetChip}
                  onPress={() => handleAddMeal(item)}
                >
                  <Text style={styles.presetName}>{item.name}</Text>
                  <Text style={styles.presetCal}>{item.cal} kcal</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Manual Form */}
            <Text style={[styles.presetHeading, { marginTop: 14 }]}>Hoặc nhập thủ công</Text>
            <View style={styles.formGroup}>
              <TextInput
                style={styles.textInput}
                placeholder="Tên món ăn (vd: Bánh cuốn)"
                placeholderTextColor={COLORS.textTertiary}
                value={foodName}
                onChangeText={setFoodName}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Số Calo (kcal)"
                placeholderTextColor={COLORS.textTertiary}
                value={calInput}
                onChangeText={setCalInput}
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={() => {
                  if (!foodName || !calInput) {
                    Alert.alert('Lỗi', 'Vui lòng nhập tên món và số calo');
                    return;
                  }
                  handleAddMeal({
                    name: foodName,
                    cal: parseInt(calInput) || 300,
                    p: 15,
                    c: 35,
                    f: 8,
                    meal: mealType,
                  });
                }}
              >
                <Text style={styles.submitBtnText}>Thêm vào nhật ký</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: COLORS.textPrimary,
  },
  scanBtn: { padding: 4 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  heroCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 24,
    padding: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
    ...SHADOWS.md,
  },
  heroLeft: { flex: 1 },
  heroTitle: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '600',
    fontFamily: FONT_FAMILY.semiBold as string,
  },
  heroCalNum: {
    fontSize: 36,
    fontWeight: '900',
    fontFamily: FONT_FAMILY.bold as string,
    color: '#78350F',
    marginTop: 4,
  },
  heroTarget: {
    fontSize: 13,
    color: '#B45309',
    fontFamily: FONT_FAMILY.base as string,
    marginTop: -2,
  },
  remainingPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  remainingPillText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.bold as string,
    color: '#D97706',
  },
  ringContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  outerRing: { alignItems: 'center' },
  ringPercent: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: '#B45309',
  },
  ringLabel: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.base as string,
    color: '#92400E',
  },
  macrosCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: COLORS.textPrimary,
    marginBottom: 14,
  },
  macroRow: { marginBottom: 12 },
  macroInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  macroLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: FONT_FAMILY.base as string,
  },
  macroVal: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.semiBold as string,
    color: COLORS.textPrimary,
  },
  macroBarBg: { height: 7, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
  macroBarFill: { height: '100%', borderRadius: 4 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: COLORS.textPrimary,
    marginTop: 22,
    marginBottom: 12,
  },
  mealsList: { gap: 10 },
  mealCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  mealTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mealName: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: FONT_FAMILY.semiBold as string,
    color: COLORS.textPrimary,
  },
  mealCalories: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: COLORS.primary,
  },
  mealDetailText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: FONT_FAMILY.base as string,
    marginLeft: 28,
  },
  addFoodBtn: {
    backgroundColor: '#D97706',
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    ...SHADOWS.md,
  },
  addFoodBtnText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.bold as string,
    color: '#FFFFFF',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
  modalTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: COLORS.textPrimary,
  },
  presetHeading: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.semiBold as string,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  presetScroll: { flexDirection: 'row', marginBottom: 10 },
  presetChip: {
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  presetName: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FONT_FAMILY.semiBold as string,
    color: '#92400E',
  },
  presetCal: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.base as string,
    color: '#D97706',
    marginTop: 2,
  },
  formGroup: { gap: 10, marginTop: 8 },
  textInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: FONT_FAMILY.base as string,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
  },
  submitBtn: {
    backgroundColor: '#D97706',
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: '#FFFFFF',
  },
});
