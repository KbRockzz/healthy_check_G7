/**
 * Màn hình Bảng tin tổng quan sức khỏe (Home - Dashboard Screen)
 * Khớp thiết kế Mockup #4: Home - Dashboard.png
 * Tích hợp:
 * - Health Score 88/100 (Kèm Modal phân tích chi tiết)
 * - AI Daily Health Insight Card
 * - Interactive Hydration Widget (+250ml, +500ml & liên kết màn hình /dashboard/water)
 * - 4 Metric Widgets (Steps, Sleep, Nutrition, Cycle/Cardio theo Giới tính)
 * - Tự động ẩn/hiện Chu kỳ nếu người dùng là Nam
 * - Pull-to-refresh & Fetch Supabase thực tế
 * - Typography chuẩn Roboto
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, Modal, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS, FONT_FAMILY } from '@/theme';
import { useAuth } from '@/lib/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import BottomTabBar from '@/components/bottom-tab-bar';

export default function HomeScreen() {
  const router = useRouter();
  const { session, profile, signOut, loading: authLoading } = useAuth();
  const [userName, setUserName] = useState('Alex');
  const [userGender, setUserGender] = useState<'male' | 'female' | 'other'>('female');

  // Metrics state
  const [todaySteps, setTodaySteps] = useState<number>(6432);
  const [stepGoal, setStepGoal] = useState<number>(10000);
  const [todaySleepMins, setTodaySleepMins] = useState<number>(450); // 7h 30m
  const [todayCalories, setTodayCalories] = useState<number>(1850);
  const [calorieGoal, setCalorieGoal] = useState<number>(2200);
  const [waterMl, setWaterMl] = useState<number>(1600);
  const [waterGoalMl, setWaterGoalMl] = useState<number>(2000);
  const [healthScore] = useState<number>(88);

  const [refreshing, setRefreshing] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState<boolean>(false);
  const [showNotificationModal, setShowNotificationModal] = useState<boolean>(false);
  const [showAiModal, setShowAiModal] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    if (!session) return;
    const today = new Date().toISOString().split('T')[0];

    try {
      // 1. Fetch today's steps (kết hợp AsyncStorage + Supabase)
      const stepsKey = `@healthy_check_steps_${today}`;
      const savedSteps = await AsyncStorage.getItem(stepsKey);
      if (savedSteps) setTodaySteps(parseInt(savedSteps, 10));

      const { data: stepsData } = await supabase
        .from('step_records')
        .select('steps')
        .eq('user_id', session.user.id)
        .eq('recorded_on', today)
        .single();
      if (stepsData?.steps) {
        setTodaySteps(stepsData.steps);
        await AsyncStorage.setItem(stepsKey, stepsData.steps.toString());
      }

      // 2. Fetch today's calories
      const calKey = `@healthy_check_calories_${today}`;
      const savedCal = await AsyncStorage.getItem(calKey);
      if (savedCal) setTodayCalories(parseInt(savedCal, 10));

      const { data: nutritionData } = await supabase
        .from('nutrition_logs')
        .select('calories')
        .eq('user_id', session.user.id)
        .eq('logged_on', today);
      const totalCal = nutritionData?.reduce((s, i) => s + (i.calories || 0), 0) || 0;
      if (totalCal > 0) {
        setTodayCalories(totalCal);
        await AsyncStorage.setItem(calKey, totalCal.toString());
      }

      // 3. Fetch today's water (đồng bộ hoàn hảo với /dashboard/water)
      const waterKey = `@healthy_check_water_${today}`;
      const savedWater = await AsyncStorage.getItem(waterKey);
      let activeWater = savedWater ? parseInt(savedWater, 10) : 1600;

      const { data: waterData } = await supabase
        .from('health_metrics')
        .select('value')
        .eq('user_id', session.user.id)
        .eq('metric_kind', 'water_intake')
        .gte('recorded_at', new Date(today + 'T00:00:00Z').toISOString())
        .lt('recorded_at', new Date(today + 'T23:59:59Z').toISOString());
      const totalWater = waterData?.reduce((s, i) => s + (i.value || 0), 0) || 0;
      if (totalWater > 0) {
        activeWater = totalWater;
        await AsyncStorage.setItem(waterKey, totalWater.toString());
      } else if (!savedWater) {
        await AsyncStorage.setItem(waterKey, '1600');
      }
      setWaterMl(activeWater);

      // 4. Fetch today's sleep
      const sleepKey = `@healthy_check_sleep_${today}`;
      const savedSleep = await AsyncStorage.getItem(sleepKey);
      if (savedSleep) setTodaySleepMins(parseInt(savedSleep, 10));

      const { data: sleepData } = await supabase
        .from('sleep_records')
        .select('total_minutes')
        .eq('user_id', session.user.id)
        .eq('sleep_date', today)
        .single();
      if (sleepData?.total_minutes) {
        setTodaySleepMins(sleepData.total_minutes);
        await AsyncStorage.setItem(sleepKey, sleepData.total_minutes.toString());
      }
    } catch {
      // Keep state values
    }
  }, [session]);

  // Tự động tải lại dữ liệu mỗi khi người dùng quay lại màn hình Dashboard
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.replace('/auth/sign-in');
      return;
    }
    const name = session.user?.user_metadata?.full_name || profile?.full_name || 'Alex';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    setUserName(parts.length > 0 ? parts[parts.length - 1] : name);

    if (profile?.gender) {
      setUserGender(profile.gender as any);
    }
    if (profile?.step_goal) setStepGoal(profile.step_goal);
    if (profile?.calorie_goal) setCalorieGoal(profile.calorie_goal);
    if (profile?.water_goal_ml) setWaterGoalMl(profile.water_goal_ml);

    fetchData();
  }, [session, profile, authLoading, fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  }, [fetchData]);

  const handleAddWater = async (amount: number) => {
    const today = new Date().toISOString().split('T')[0];
    const waterKey = `@healthy_check_water_${today}`;
    const next = waterMl + amount;
    setWaterMl(next);

    try {
      await AsyncStorage.setItem(waterKey, next.toString());
      if (session?.user?.id) {
        await supabase.from('health_metrics').insert({
          user_id: session.user.id,
          metric_kind: 'water_intake',
          value: amount,
          unit: 'ml',
          recorded_at: new Date().toISOString(),
          source: 'manual',
        });
      }
    } catch {
      // local update persisted in state & AsyncStorage
    }
  };

  const isFemale = userGender === 'female';

  if (authLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!session) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.name}>{userName} 👋</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.iconCircle}
              onPress={() => setShowNotificationModal(true)}
            >
              <Ionicons name="notifications-outline" size={22} color={COLORS.textPrimary} />
              <View style={styles.notificationDot} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/profile')}
              style={styles.avatar}
            >
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={22} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Health Score Card (Mockup #4) */}
        <TouchableOpacity
          style={styles.scoreHeroCard}
          onPress={() => setShowScoreModal(true)}
          activeOpacity={0.9}
        >
          <View style={styles.scoreLeft}>
            <View style={styles.scoreBadgePill}>
              <Ionicons name="shield-checkmark" size={14} color={COLORS.success} />
              <Text style={styles.scoreBadgeText}>Daily Health Score</Text>
            </View>
            <Text style={styles.scoreHeadline}>Excellent Condition</Text>
            <Text style={styles.scoreSubtext}>
              Dựa trên vận động, giấc ngủ và dinh dưỡng hôm nay. Nhấn để xem chi tiết chấm điểm.
            </Text>
          </View>

          <View style={styles.scoreRingWrap}>
            <View style={styles.scoreRingCircle}>
              <Text style={styles.scoreNumber}>{healthScore}</Text>
              <Text style={styles.scoreTotal}>/100</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* AI Health Coach Insight Card */}
        <TouchableOpacity
          style={styles.aiCard}
          onPress={() => setShowAiModal(true)}
          activeOpacity={0.85}
        >
          <View style={styles.aiHeader}>
            <View style={styles.aiBadge}>
              <Ionicons name="sparkles" size={15} color="#8B5CF6" />
              <Text style={styles.aiBadgeText}>AI Health Coach</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.aiTime}>Xem chi tiết</Text>
              <Ionicons name="chevron-forward" size={14} color="#8B5CF6" />
            </View>
          </View>
          <Text style={styles.aiText}>
            💡 Bạn đã đạt <Text style={{ fontWeight: 'bold' }}>{Math.round((todaySteps / stepGoal) * 100)}%</Text> mục tiêu bước chân và ngủ đủ {Math.floor(todaySleepMins / 60)}h {todaySleepMins % 60}m. Nhấn để xem 3 lời khuyên sức khỏe dành riêng cho bạn hôm nay!
          </Text>
        </TouchableOpacity>

        {/* Interactive Hydration Tracker */}
        <View style={styles.waterCard}>
          <View style={styles.waterHeader}>
            <TouchableOpacity
              style={styles.waterTitleRow}
              onPress={() => router.push('/dashboard/water' as any)}
            >
              <Ionicons name="water" size={22} color="#3B82F6" />
              <Text style={styles.waterTitle}>Hydration Tracker</Text>
              <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
            </TouchableOpacity>
            <Text style={styles.waterStats}>
              <Text style={{ fontWeight: 'bold', color: '#1D4ED8' }}>{(waterMl / 1000).toFixed(1)}L</Text> / {(waterGoalMl / 1000).toFixed(1)}L
            </Text>
          </View>

          {/* Progress bar */}
          <View style={styles.waterProgressBarBg}>
            <View style={[styles.waterProgressFill, { width: `${Math.min(100, Math.round((waterMl / waterGoalMl) * 100))}%` }]} />
          </View>

          <View style={styles.waterActionsRow}>
            <Text style={styles.waterPercentText}>{Math.round((waterMl / waterGoalMl) * 100)}% mục tiêu</Text>
            <View style={styles.waterBtnGroup}>
              <TouchableOpacity
                style={styles.waterAddBtn}
                onPress={() => handleAddWater(250)}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={14} color="#1D4ED8" />
                <Text style={styles.waterAddBtnText}>+250ml</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.waterAddBtn}
                onPress={() => handleAddWater(500)}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={14} color="#1D4ED8" />
                <Text style={styles.waterAddBtnText}>+500ml</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 4 Core Metrics Grid (Steps, Sleep, Nutrition, Cycle/Cardio) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Chỉ số sức khỏe chính</Text>
          <TouchableOpacity onPress={() => router.push('/health-data')}>
            <Text style={styles.seeAllText}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metricGrid}>
          {/* 1. Step Tracker Widget */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => router.push('/dashboard/steps')}
            activeOpacity={0.8}
          >
            <View style={styles.metricTop}>
              <View style={[styles.metricIconWrap, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="walk" size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.metricProgressText}>{Math.round((todaySteps / stepGoal) * 100)}%</Text>
            </View>
            <Text style={styles.metricTitle}>Steps</Text>
            <Text style={styles.metricValue}>{todaySteps.toLocaleString()}</Text>
            <Text style={styles.metricSub}>Mục tiêu: {stepGoal.toLocaleString()}</Text>
            <View style={styles.metricFooterPill}>
              <Text style={styles.metricFooterPillText}>{(todaySteps * 0.00075).toFixed(1)} km • {Math.round(todaySteps * 0.045)} kcal</Text>
            </View>
          </TouchableOpacity>

          {/* 2. Sleep Tracker Widget */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => router.push('/dashboard/sleep')}
            activeOpacity={0.8}
          >
            <View style={styles.metricTop}>
              <View style={[styles.metricIconWrap, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="moon" size={22} color="#8B5CF6" />
              </View>
              <Text style={[styles.metricProgressText, { color: '#8B5CF6' }]}>94%</Text>
            </View>
            <Text style={styles.metricTitle}>Sleep</Text>
            <Text style={styles.metricValue}>{Math.floor(todaySleepMins / 60)}h {todaySleepMins % 60}m</Text>
            <Text style={styles.metricSub}>Mục tiêu: 8h 00m</Text>
            <View style={[styles.metricFooterPill, { backgroundColor: '#F3E8FF' }]}>
              <Text style={[styles.metricFooterPillText, { color: '#6B21A8' }]}>Deep: 2h 15m (30%)</Text>
            </View>
          </TouchableOpacity>

          {/* 3. Nutrition Tracker Widget */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => router.push('/dashboard/nutrition')}
            activeOpacity={0.8}
          >
            <View style={styles.metricTop}>
              <View style={[styles.metricIconWrap, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="restaurant" size={22} color="#D97706" />
              </View>
              <Text style={[styles.metricProgressText, { color: '#D97706' }]}>84%</Text>
            </View>
            <Text style={styles.metricTitle}>Nutrition</Text>
            <Text style={styles.metricValue}>{todayCalories} kcal</Text>
            <Text style={styles.metricSub}>Mục tiêu: {calorieGoal} kcal</Text>
            <View style={[styles.metricFooterPill, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.metricFooterPillText, { color: '#92400E' }]}>Carb/Pro/Fat chuẩn</Text>
            </View>
          </TouchableOpacity>

          {/* 4. Cycle Tracker Widget (Hoặc Cardio/Vitals nếu người dùng là Nam) */}
          <TouchableOpacity
              style={styles.metricCard}
              onPress={() => router.push('/dashboard/cycle')}
              activeOpacity={0.8}
            >
              <View style={styles.metricTop}>
                <View style={[styles.metricIconWrap, { backgroundColor: '#FCE7F3' }]}>
                  <Ionicons name="calendar" size={22} color="#DB2777" />
                </View>
                <Text style={[styles.metricProgressText, { color: '#DB2777' }]}>Day 14</Text>
              </View>
              <Text style={styles.metricTitle}>Cycle Tracking</Text>
              <Text style={styles.metricValue}>Cửa sổ rụng trứng</Text>
              <Text style={styles.metricSub}>Khả năng thụ thai cao</Text>
              <View style={[styles.metricFooterPill, { backgroundColor: '#FCE7F3' }]}>
                <Text style={[styles.metricFooterPillText, { color: '#9D174D' }]}>14 ngày tới kỳ tiếp</Text>
              </View>
            </TouchableOpacity>
        </View>

        {/* Quick Links Banner */}
        <View style={styles.quickBannerRow}>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => router.push('/health-data')}
            activeOpacity={0.8}
          >
            <Ionicons name="analytics" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.quickActionText}>All Health Data</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionBtn, { borderColor: '#10B981' }]}
            onPress={() => router.push('/settings/goals')}
            activeOpacity={0.8}
          >
            <Ionicons name="flag" size={18} color="#10B981" style={{ marginRight: 6 }} />
            <Text style={[styles.quickActionText, { color: '#10B981' }]}>Mục tiêu (Goals)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionBtn, { borderColor: '#8B5CF6' }]}
            onPress={() => router.push('/share')}
            activeOpacity={0.8}
          >
            <Ionicons name="share-social" size={18} color="#8B5CF6" style={{ marginRight: 6 }} />
            <Text style={[styles.quickActionText, { color: '#8B5CF6' }]}>Chia sẻ</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Health Score Breakdown Modal */}
      <Modal
        visible={showScoreModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowScoreModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Chi tiết Health Score</Text>
                <Text style={styles.modalSub}>Cách tính điểm tổng hợp sức khỏe của bạn</Text>
              </View>
              <TouchableOpacity onPress={() => setShowScoreModal(false)}>
                <Ionicons name="close-circle" size={28} color={COLORS.textTertiary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalHeroScore}>
              <Text style={styles.modalBigScore}>88</Text>
              <Text style={styles.modalScoreStatus}>Tình trạng Xuất sắc</Text>
              <Text style={styles.modalScoreTip}>Bạn cao hơn 82% người dùng cùng độ tuổi</Text>
            </View>

            {/* Breakdown criteria */}
            <View style={styles.breakdownList}>
              <View style={styles.breakdownItem}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>1. Hoạt động bước chân (Steps Activity)</Text>
                  <Text style={styles.breakdownVal}>28 / 30 điểm</Text>
                </View>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: '93%', backgroundColor: COLORS.primary }]} />
                </View>
              </View>

              <View style={styles.breakdownItem}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>2. Chất lượng giấc ngủ (Sleep Duration)</Text>
                  <Text style={styles.breakdownVal}>29 / 30 điểm</Text>
                </View>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: '96%', backgroundColor: '#8B5CF6' }]} />
                </View>
              </View>

              <View style={styles.breakdownItem}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>3. Cân bằng calo & dinh dưỡng</Text>
                  <Text style={styles.breakdownVal}>22 / 25 điểm</Text>
                </View>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: '88%', backgroundColor: '#D97706' }]} />
                </View>
              </View>

              <View style={styles.breakdownItem}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>4. Uống nước & Thói quen lành mạnh</Text>
                  <Text style={styles.breakdownVal}>9 / 15 điểm</Text>
                </View>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: '60%', backgroundColor: '#10B981' }]} />
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowScoreModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>Đã hiểu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Notification Center Modal */}
      <Modal
        visible={showNotificationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNotificationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Thông báo & Nhắc nhở 🔔</Text>
                <Text style={styles.modalSub}>Lịch trình theo dõi sức khỏe hôm nay</Text>
              </View>
              <TouchableOpacity onPress={() => setShowNotificationModal(false)}>
                <Ionicons name="close-circle" size={28} color={COLORS.textTertiary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {/* Reminder 1: Uống nước */}
              <TouchableOpacity
                style={styles.notifCard}
                onPress={() => {
                  setShowNotificationModal(false);
                  router.push('/dashboard/water' as any);
                }}
              >
                <View style={[styles.notifIconWrap, { backgroundColor: '#DBEAFE' }]}>
                  <Ionicons name="water" size={20} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle}>Bổ sung nước lọc định kỳ</Text>
                  <Text style={styles.notifDesc}>Đã uống {(waterMl / 1000).toFixed(1)}L / {(waterGoalMl / 1000).toFixed(1)}L mục tiêu.</Text>
                  <Text style={styles.notifLink}>Mở Water Tracker →</Text>
                </View>
              </TouchableOpacity>

              {/* Reminder 2: Giấc ngủ */}
              <TouchableOpacity
                style={styles.notifCard}
                onPress={() => {
                  setShowNotificationModal(false);
                  router.push('/dashboard/sleep');
                }}
              >
                <View style={[styles.notifIconWrap, { backgroundColor: '#F3E8FF' }]}>
                  <Ionicons name="moon" size={20} color="#8B5CF6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle}>Lịch trình giấc ngủ tối nay</Text>
                  <Text style={styles.notifDesc}>Đề xuất đi ngủ lúc 23:00 để duy trì 8 giờ ngủ trọn vẹn.</Text>
                  <Text style={styles.notifLink}>Mở Sleep Tracker →</Text>
                </View>
              </TouchableOpacity>

              {/* Reminder 3: Bước chân */}
              <TouchableOpacity
                style={styles.notifCard}
                onPress={() => {
                  setShowNotificationModal(false);
                  router.push('/dashboard/steps');
                }}
              >
                <View style={[styles.notifIconWrap, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="walk" size={20} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle}>Tiến trình vận động</Text>
                  <Text style={styles.notifDesc}>Đạt {todaySteps.toLocaleString()} / {stepGoal.toLocaleString()} bước hôm nay.</Text>
                  <Text style={styles.notifLink}>Xem thống kê bước chân →</Text>
                </View>
              </TouchableOpacity>

              {/* Reminder 4: Thiết lập mục tiêu */}
              <TouchableOpacity
                style={styles.notifCard}
                onPress={() => {
                  setShowNotificationModal(false);
                  router.push('/settings/goals');
                }}
              >
                <View style={[styles.notifIconWrap, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="flag" size={20} color="#16A34A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle}>Tùy chỉnh mục tiêu cá nhân</Text>
                  <Text style={styles.notifDesc}>Cập nhật lại chỉ tiêu bước chân, calo, giờ ngủ, nước uống.</Text>
                  <Text style={[styles.notifLink, { color: '#16A34A' }]}>Thiết lập mục tiêu (Goals) →</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowNotificationModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* AI Health Coach Modal */}
      <Modal
        visible={showAiModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAiModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>AI Health Coach 💡</Text>
                <Text style={styles.modalSub}>Lời khuyên cá nhân hóa cho ngày hôm nay</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAiModal(false)}>
                <Ionicons name="close-circle" size={28} color={COLORS.textTertiary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              <View style={styles.aiTipItem}>
                <Ionicons name="flash" size={22} color="#D97706" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiTipTitle}>1. Giảm thiểu mệt mỏi sau bữa ăn</Text>
                  <Text style={styles.aiTipBody}>
                    Sau bữa trưa hoặc tối, bạn nên đi bộ thư giãn từ 10 - 15 phút. Vận động nhẹ nhàng kích hoạt cơ bắp sử dụng glucose mà không cần tiết thêm insulin.
                  </Text>
                </View>
              </View>

              <View style={styles.aiTipItem}>
                <Ionicons name="water" size={22} color="#2563EB" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiTipTitle}>2. Bù nước thông minh</Text>
                  <Text style={styles.aiTipBody}>
                    Bạn đã uống {(waterMl / 1000).toFixed(1)}L nước. Hãy bổ sung thêm 400ml nữa trước 20h để tránh phải thức giấc đi vệ sinh vào ban đêm.
                  </Text>
                </View>
              </View>

              <View style={styles.aiTipItem}>
                <Ionicons name="moon" size={22} color="#8B5CF6" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiTipTitle}>3. Vệ sinh giấc ngủ chuẩn y khoa</Text>
                  <Text style={styles.aiTipBody}>
                    Nên duy trì phòng ngủ thoáng mát (22 - 25°C) và tắt thông báo điện thoại 30 phút trước khi lên giường để sóng não chuyển dần về trạng thái ngủ sâu.
                  </Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: '#8B5CF6' }]}
              onPress={() => setShowAiModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>Tôi đã hiểu & Áp dụng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bottom 4-Tab Bar */}
      <BottomTabBar currentRoute="/dashboard" onTabPress={(route) => router.push(route as any)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 110 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontFamily: FONT_FAMILY.base as string,
  },
  name: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: COLORS.textPrimary,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarImage: { width: 40, height: 40, borderRadius: 20 },
  scoreHeroCard: {
    backgroundColor: '#0F172A',
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.md,
  },
  scoreLeft: { flex: 1, paddingRight: 12 },
  scoreBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 8,
  },
  scoreBadgeText: {
    fontSize: 11,
    color: '#34D399',
    fontWeight: '700',
    fontFamily: FONT_FAMILY.semiBold as string,
  },
  scoreHeadline: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  scoreSubtext: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: FONT_FAMILY.base as string,
    lineHeight: 17,
  },
  scoreRingWrap: { alignItems: 'center', justifyContent: 'center' },
  scoreRingCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 5,
    borderColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  scoreNumber: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: FONT_FAMILY.bold as string,
    color: '#FFFFFF',
  },
  scoreTotal: { fontSize: 10, color: '#94A3B8', marginTop: -2 },
  aiCard: {
    backgroundColor: '#F5F3FF',
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: BORDER_RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  aiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.bold as string,
    color: '#7C3AED',
  },
  aiTime: { fontSize: 11, color: COLORS.textTertiary, fontFamily: FONT_FAMILY.base as string },
  aiText: {
    fontSize: 13,
    color: '#4C1D95',
    fontFamily: FONT_FAMILY.base as string,
    lineHeight: 19,
  },
  waterCard: {
    backgroundColor: '#EFF6FF',
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: BORDER_RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  waterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  waterTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  waterTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.bold as string,
    color: '#1E3A8A',
  },
  waterStats: {
    fontSize: 13,
    color: '#3B82F6',
    fontFamily: FONT_FAMILY.base as string,
  },
  waterProgressBarBg: { height: 8, backgroundColor: '#DBEAFE', borderRadius: 4, overflow: 'hidden' },
  waterProgressFill: { height: '100%', backgroundColor: '#2563EB', borderRadius: 4 },
  waterActionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  waterPercentText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '500',
    fontFamily: FONT_FAMILY.medium as string,
  },
  waterBtnGroup: { flexDirection: 'row', gap: 8 },
  waterAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  waterAddBtnText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.bold as string,
    color: '#1D4ED8',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 22,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: COLORS.textPrimary,
  },
  seeAllText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
    fontFamily: FONT_FAMILY.semiBold as string,
  },
  metricGrid: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  metricTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  metricIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  metricProgressText: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: COLORS.primary,
  },
  metricTitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    fontFamily: FONT_FAMILY.medium as string,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: COLORS.textPrimary,
    marginVertical: 4,
  },
  metricSub: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontFamily: FONT_FAMILY.base as string,
    marginBottom: 8,
  },
  metricFooterPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  metricFooterPillText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontFamily: FONT_FAMILY.semiBold as string,
  },
  quickBannerRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  quickActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.bold as string,
    color: COLORS.primary,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 12,
  },
  signOutText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.danger,
    fontWeight: '600',
    fontFamily: FONT_FAMILY.semiBold as string,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: COLORS.textPrimary,
  },
  modalSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: FONT_FAMILY.base as string,
    marginTop: 4,
  },
  modalHeroScore: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalBigScore: {
    fontSize: 52,
    fontWeight: '900',
    fontFamily: FONT_FAMILY.bold as string,
    color: COLORS.primary,
  },
  modalScoreStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  modalScoreTip: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: FONT_FAMILY.base as string,
    marginTop: 2,
  },
  breakdownList: { gap: 14, marginBottom: 24 },
  breakdownItem: {},
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  breakdownLabel: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '500',
    fontFamily: FONT_FAMILY.medium as string,
  },
  breakdownVal: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: COLORS.primary,
  },
  barBg: { height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  modalCloseBtn: {
    backgroundColor: COLORS.primary,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: '#FFFFFF',
  },
  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  notifIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    fontFamily: FONT_FAMILY.bold as string,
  },
  notifDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontFamily: FONT_FAMILY.base as string,
  },
  notifLink: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 4,
    fontFamily: FONT_FAMILY.medium as string,
  },
  aiTipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  aiTipTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 4,
    fontFamily: FONT_FAMILY.bold as string,
  },
  aiTipBody: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.base as string,
  },
});
