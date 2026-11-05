/**
 * Màn hình Dashboard được chia sẻ — xem dữ liệu từ người khác
 * Chỉ hiển thị các nhóm dữ liệu mà chủ sở hữu đã cấp quyền (scopes).
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS, FONT_FAMILY } from '@/theme';
import { useAuth } from '@/lib/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import BottomTabBar from '@/components/bottom-tab-bar';

interface Grant {
  id: string;
  owner_id: string;
  owner_email: string;
  owner_name: string | null;
  scopes: string[];
  status: string;
  expires_at: string | null;
  accepted_at: string | null;
}

interface SharedSummary {
  is_viewing_shared: boolean;
  owner_id: string;
  health_score: { score: number };
  goals: { step_goal: number; calorie_goal: number; sleep_goal_minutes: number; water_goal_ml: number };
  steps: { count: number; distance_km: number; calories_burned: number; active_minutes: number };
  sleep: { total_minutes: number; deep_minutes: number; quality_score: number };
  nutrition: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  water: number;
  week_report: { steps: number; active_minutes: number; calories_burned: number; sleep_minutes: number };
  viewer_scopes: string[];
}

export default function SharedDashboardScreen() {
  const router = useRouter();
  const { grantId } = useLocalSearchParams<{ grantId: string }>();
  const { session, loading: authLoading } = useAuth();

  const [dataLoaded, setDataLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [grant, setGrant] = useState<Grant | null>(null);
  const [summary, setSummary] = useState<SharedSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (): Promise<void> => {
    if (!session?.user?.id || !grantId) return;
    try {
      setError(null);
      // Use RPC instead of direct table query (RLS blocks recipients from reading sharing_grants)
      const { data: grantData, error: grantError } = await supabase.rpc('list_my_shared_with_me');

      if (grantError) throw grantError;

      // Find the specific grant by ID
      const foundGrant = Array.isArray(grantData)
        ? grantData.find((g: any) => g.id === grantId)
        : null;

      if (!foundGrant) {
        setError('Không tìm thấy quyền chia sẻ hoặc đã bị thu hồi');
        setDataLoaded(true);
        return;
      }
      setGrant(foundGrant as Grant);

      // Use get_shared_dashboard - validates scopes and filters data for recipient
      const { data: summaryData, error: summaryError } = await supabase.rpc('get_shared_dashboard', {
        p_owner: foundGrant.owner_id as string,
      });

      if (summaryError) {
        console.error('get_shared_dashboard error:', summaryError);
        // Fallback: try get_dashboard_summary directly with owner's ID
        const { data: fallbackData, error: fallbackError } = await supabase.rpc('get_dashboard_summary', {
          p_user: foundGrant.owner_id as string,
          p_day: new Date().toISOString().split('T')[0],
        });
        if (fallbackError) throw fallbackError;
        setSummary(fallbackData as SharedSummary);
      } else {
        setSummary(summaryData as SharedSummary);
      }
      setDataLoaded(true);
    } catch (err: any) {
      console.error('fetchData error:', err);
      setError(err.message || 'Không thể tải dữ liệu');
      setDataLoaded(true);
    }
  }, [session, grantId]);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.replace('/auth/sign-in');
      return;
    }
    fetchData();
  }, [session, authLoading]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  }, [fetchData]);

  if (!dataLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle" size={48} color={COLORS.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!summary || !grant) return null;

  const scopes = summary.viewer_scopes || [];
  const hasSteps = scopes.includes('steps');
  const hasSleep = scopes.includes('sleep');
  const hasNutrition = scopes.includes('nutrition');

  const healthScore = summary.health_score?.score || 0;
  const goals = summary.goals || {};

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
        {/* Back Button + Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Dữ liệu được chia sẻ</Text>
            <Text style={styles.ownerLabel}>Từ: {grant.owner_name || grant.owner_email || 'Người dùng'}</Text>
          </View>
        </View>

        {/* Warning Banner */}
        <View style={styles.sharedBanner}>
          <Ionicons name="lock-closed" size={20} color="#8B5CF6" />
          <Text style={styles.sharedBannerText}>
            Dữ liệu được cắt theo phạm vi chia sẻ ({scopes.map((s: string) => ({ steps: 'Bước chân', sleep: 'Giấc ngủ', nutrition: 'Dinh dưỡng', cycle: 'Chu kỳ' }[s] || s)).join(', ')}).
          </Text>
        </View>

        {/* Health Score Card */}
        <View style={styles.scoreHeroCard}>
          <View style={styles.scoreLeft}>
            <View style={styles.scoreBadgePill}>
              <Ionicons name="shield-checkmark" size={14} color={COLORS.success} />
              <Text style={styles.scoreBadgeText}>Điểm sức khỏe</Text>
            </View>
            <Text style={styles.scoreHeadline}>Điểm sức khỏe hôm nay</Text>
            <Text style={styles.scoreSubtext}>
              Dựa trên vận động, giấc ngủ và dinh dưỡng.
            </Text>
          </View>
          <View style={styles.scoreRingWrap}>
            <View style={styles.scoreRingCircle}>
              <Text style={styles.scoreNumber}>{healthScore}</Text>
              <Text style={styles.scoreTotal}>/100</Text>
            </View>
          </View>
        </View>

        {/* Metrics Grid */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Chỉ số sức khỏe</Text>
        </View>

        <View style={styles.metricGrid}>
          {/* Steps */}
          {hasSteps && (
            <TouchableOpacity
              style={styles.metricCard}
              onPress={() => router.push('/dashboard/steps' as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.metricIconWrap, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="walk" size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.metricLabel}>Bước chân</Text>
              <Text style={styles.metricValue}>{(summary.steps?.count || 0).toLocaleString()}</Text>
              <Text style={styles.metricSub}>
                {Math.round((goals.step_goal > 0 ? (summary.steps?.count || 0) / goals.step_goal : 0) * 100)}% mục tiêu
              </Text>
            </TouchableOpacity>
          )}

          {/* Sleep */}
          {hasSleep && (
            <TouchableOpacity
              style={styles.metricCard}
              onPress={() => router.push('/dashboard/sleep' as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.metricIconWrap, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="moon" size={22} color="#8B5CF6" />
              </View>
              <Text style={styles.metricLabel}>Giấc ngủ</Text>
              <Text style={styles.metricValue}>
                {Math.floor((summary.sleep?.total_minutes || 0) / 60)}h {(summary.sleep?.total_minutes || 0) % 60}m
              </Text>
              <Text style={styles.metricSub}>
                Chất lượng: {Math.round(summary.sleep?.quality_score || 0)}%
              </Text>
            </TouchableOpacity>
          )}

          {/* Nutrition */}
          {hasNutrition && (
            <TouchableOpacity
              style={styles.metricCard}
              onPress={() => router.push('/dashboard/nutrition' as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.metricIconWrap, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="restaurant" size={22} color="#D97706" />
              </View>
              <Text style={styles.metricLabel}>Dinh dưỡng</Text>
              <Text style={styles.metricValue}>{Math.round(summary.nutrition?.calories || 0)} kcal</Text>
              <Text style={styles.metricSub}>
                {Math.round((goals.calorie_goal > 0 ? (summary.nutrition?.calories || 0) / goals.calorie_goal : 0) * 100)}% mục tiêu
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Week Report */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Tổng hợp 7 ngày gần nhất</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.weekRow}>
            <View style={styles.weekItem}>
              <Text style={styles.weekValue}>{(summary.week_report?.steps || 0).toLocaleString()}</Text>
              <Text style={styles.weekLabel}>Tổng bước</Text>
            </View>
            <View style={styles.weekDivider} />
            <View style={styles.weekItem}>
              <Text style={styles.weekValue}>{Math.round((summary.week_report?.sleep_minutes || 0) / 60)}h</Text>
              <Text style={styles.weekLabel}>Giấc ngủ TB</Text>
            </View>
            <View style={styles.weekDivider} />
            <View style={styles.weekItem}>
              <Text style={styles.weekValue}>{Math.round(summary.week_report?.active_minutes || 0)}p</Text>
              <Text style={styles.weekLabel}>Hoạt động</Text>
            </View>
          </View>
        </View>

        {/* Note */}
        <View style={styles.noteCard}>
          <Ionicons name="information-circle" size={18} color={COLORS.primary} />
          <Text style={styles.noteText}>
            Người chia sẻ có thể điều chỉnh hoặc thu hồi quyền truy cập bất cứ lúc nào.
          </Text>
        </View>
      </ScrollView>

      <BottomTabBar currentRoute="/share" onTabPress={(route) => router.push(route as any)} />
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 110 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingTop: 40,
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1 },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    fontFamily: FONT_FAMILY.bold as string,
  },
  ownerLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: FONT_FAMILY.base as string,
    marginTop: 2,
  },
  sharedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FAF5FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 16,
  },
  sharedBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#7C3AED',
    fontFamily: FONT_FAMILY.base as string,
    lineHeight: 16,
  },
  scoreHeroCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    ...SHADOWS.sm,
  },
  scoreLeft: { flex: 1 },
  scoreBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  scoreBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: FONT_FAMILY.medium as string,
  },
  scoreHeadline: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    marginTop: 8,
  },
  scoreSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontFamily: FONT_FAMILY.base as string,
    marginTop: 4,
  },
  scoreRingWrap: { alignItems: 'center' },
  scoreRingCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumber: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
  },
  scoreTotal: {
    color: 'white',
    fontSize: 10,
    fontFamily: FONT_FAMILY.base as string,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    fontFamily: FONT_FAMILY.bold as string,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  metricIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
    fontFamily: FONT_FAMILY.medium as string,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    fontFamily: FONT_FAMILY.bold as string,
  },
  metricSub: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontFamily: FONT_FAMILY.base as string,
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    ...SHADOWS.sm,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  weekItem: { flex: 1, alignItems: 'center' },
  weekValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    fontFamily: FONT_FAMILY.bold as string,
  },
  weekLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: FONT_FAMILY.base as string,
    marginTop: 4,
  },
  weekDivider: { width: 1, height: 36, backgroundColor: COLORS.border },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 20,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: '#0284C7',
    fontFamily: FONT_FAMILY.base as string,
    lineHeight: 16,
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    fontFamily: FONT_FAMILY.medium as string,
  },
  errorCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    fontFamily: FONT_FAMILY.base as string,
  },
});
