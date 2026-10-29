/**
 * Màn hình chính của ứng dụng — Dashboard điều hướng
 * Hiển thị lưới các chức năng chính sau khi đăng nhập
 */
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '@/theme';
import { useAuth } from '@/lib/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import BottomTabBar from '@/components/bottom-tab-bar';

interface FeatureItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  route: string;
  gradient?: [string, string];
}

const FEATURES: FeatureItem[] = [
  {
    id: 'steps',
    title: 'Steps',
    subtitle: 'Track your daily walks',
    icon: 'walk',
    color: COLORS.primary,
    route: '/dashboard/steps',
  },
  {
    id: 'sleep',
    title: 'Sleep',
    subtitle: 'Monitor your rest quality',
    icon: 'moon',
    color: '#8B5CF6',
    route: '/dashboard/sleep',
  },
  {
    id: 'nutrition',
    title: 'Nutrition',
    subtitle: 'Log meals & calories',
    icon: 'restaurant',
    color: COLORS.warning,
    route: '/dashboard/nutrition',
  },
  {
    id: 'cycle',
    title: 'Cycle',
    subtitle: 'Track your period',
    icon: 'calendar',
    color: COLORS.accent,
    route: '/dashboard/cycle',
  },
  {
    id: 'health-data',
    title: 'Health Data',
    subtitle: 'All metrics overview',
    icon: 'analytics',
    color: '#3B82F6',
    route: '/health-data',
  },
  {
    id: 'profile',
    title: 'Profile',
    subtitle: 'Settings & preferences',
    icon: 'person',
    color: '#6366F1',
    route: '/profile',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { session, profile, signOut, loading: authLoading } = useAuth();
  const [todaySteps, setTodaySteps] = useState<number | null>(null);
  const [todayCalories, setTodayCalories] = useState(0);
  const [todayWater, setTodayWater] = useState(0);
  const [todaySleep, setTodaySleep] = useState(0);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (!session) {
      router.replace('/auth/sign-in');
      return;
    }
    const name = session.user.user_metadata?.full_name || profile?.full_name || 'User';
    setUserName(name.split(' ')[0]);
    fetchData();
  }, [session]);

  async function fetchData() {
    if (!session) return;
    const today = new Date().toISOString().split('T')[0];

    // Fetch today's steps
    const { data: stepsData } = await supabase
      .from('step_records')
      .select('steps')
      .eq('user_id', session.user.id)
      .eq('recorded_on', today)
      .single();
    if (stepsData) setTodaySteps(stepsData.steps);

    // Fetch today's calories
    const { data: nutritionData } = await supabase
      .from('nutrition_logs')
      .select('calories')
      .eq('user_id', session.user.id)
      .eq('logged_on', today);
    const totalCal = nutritionData?.reduce((s, i) => s + i.calories, 0) || 0;
    setTodayCalories(totalCal);

    // Fetch today's water
    const { data: waterData } = await supabase
      .from('health_metrics')
      .select('value')
      .eq('user_id', session.user.id)
      .eq('metric_kind', 'water_intake')
      .gte('recorded_at', new Date(today + 'T00:00:00Z').toISOString())
      .lt('recorded_at', new Date(today + 'T23:59:59Z').toISOString());
    const totalWater = waterData?.reduce((s, i) => s + i.value, 0) || 0;
    setTodayWater(totalWater);

    // Fetch today's sleep
    const { data: sleepData } = await supabase
      .from('sleep_records')
      .select('total_minutes')
      .eq('user_id', session.user.id)
      .eq('sleep_date', today)
      .single();
    if (sleepData) setTodaySleep(sleepData.total_minutes);
  }

  const handleSignOut = async () => {
    await signOut();
    router.replace('/launch');
  };

  if (authLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.name}>{userName} 👋</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/profile')} style={styles.avatar}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={24} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Today's Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.quickStatItem}>
            <Ionicons name="walk" size={28} color={COLORS.primary} />
            <Text style={styles.quickStatValue}>{todaySteps?.toLocaleString() ?? '-'}</Text>
            <Text style={styles.quickStatLabel}>Bước</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatItem}>
            <Ionicons name="flame" size={28} color={COLORS.warning} />
            <Text style={styles.quickStatValue}>{todayCalories}</Text>
            <Text style={styles.quickStatLabel}>Calo</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatItem}>
            <Ionicons name="water" size={28} color="#3B82F6" />
            <Text style={styles.quickStatValue}>{todayWater}</Text>
            <Text style={styles.quickStatLabel}>Nước (ml)</Text>
          </View>
        </View>

        {/* Features Grid */}
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.grid}>
          {FEATURES.map((feature) => (
            <TouchableOpacity
              key={feature.id}
              style={[styles.card, { borderLeftColor: feature.color }]}
              onPress={() => router.push(feature.route as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrap, { backgroundColor: feature.color + '15' }]}>
                <Ionicons name={feature.icon as any} size={28} color={feature.color} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{feature.title}</Text>
                <Text style={styles.cardSubtitle}>{feature.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out" size={20} color={COLORS.danger} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomTabBar currentRoute="/dashboard" onTabPress={(route) => router.push(route as any)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  greeting: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  name: { fontSize: FONT_SIZES['3xl'], fontWeight: 'bold', color: COLORS.textPrimary },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarImage: { width: 44, height: 44, borderRadius: 22 },
  quickStats: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    borderRadius: BORDER_RADIUS.xl,
    padding: 20,
    ...SHADOWS.sm,
  },
  quickStatItem: { flex: 1, alignItems: 'center' },
  quickStatValue: { fontSize: FONT_SIZES.lg, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: 4 },
  quickStatLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  quickStatDivider: { width: 1, backgroundColor: COLORS.border, marginHorizontal: 12 },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 16,
  },
  grid: { paddingHorizontal: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
    ...SHADOWS.sm,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: FONT_SIZES.base, fontWeight: '600', color: COLORS.textPrimary },
  cardSubtitle: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 30,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.danger + '30',
  },
  signOutText: { fontSize: FONT_SIZES.base, color: COLORS.danger, fontWeight: '600', marginLeft: 8 },
});
