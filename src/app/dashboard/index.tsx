import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, BORDER_RADIUS } from '@/src/theme';
import { supabase, DashboardSummary } from '@/src/lib/supabase';
import HealthScoreCard from '@/src/components/health-score-card';
import MetricWidget from '@/src/components/metric-widget';
import BottomTabBar from '@/src/components/bottom-tab-bar';

/**
 * Màn hình Bảng tin tổng quan sức khỏe (Home - Dashboard / Overview) — Mockup #4
 *
 * Màn hình 3/10: Điểm sức khỏe + 4 widget tóm tắt (Steps, Sleep, Nutrition, Cycle)
 * + Báo cáo tuần + Bài viết blogs nổi bật.
 */
export default function DashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [userName, setUserName] = useState('User');

  const fetchDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Chưa đăng nhập -> quay về trang Sign In hoặc demo owner từ migration 0005
        router.replace('/auth/sign-in');
        return;
      }

      setUserName(session.user.user_metadata?.full_name || 'Nguyễn Minh Anh');

      // Gọi RPC get_dashboard_summary đã thiết kế ở Migration 0003
      const { data, error } = await supabase.rpc('get_dashboard_summary', {
        p_user: session.user.id,
        p_day: new Date().toISOString().split('T')[0],
      });

      if (error) {
        console.warn('Lỗi gọi get_dashboard_summary RPC:', error.message);
        return;
      }

      if (data) {
        setSummary(data as DashboardSummary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Nội dung cuộn */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Header: Lời chào + Avatar */}
        <View style={styles.header}>
          <View>
            <Text style={styles.dateText}>TUES, 11 JUL</Text>
            <Text style={styles.welcomeText}>Overview</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/profile')}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={20} color={COLORS.primary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Thẻ điểm sức khỏe tổng hợp (Health Score Widget) */}
        {summary && (
          <HealthScoreCard
            score={summary.health_score.score}
            label={summary.health_score.label}
          />
        )}

        {/* 4 Widget Tóm tắt chỉ số */}
        <View style={styles.widgetsGrid}>
          <MetricWidget
            title="Steps"
            value={summary?.steps.count.toLocaleString() || '11,857'}
            subtitle="updated 15 min ago"
            icon="walk"
            iconColor={COLORS.primary}
            onPress={() => router.push('/dashboard/steps')}
          />
          <MetricWidget
            title="Cycle tracking"
            value={summary?.cycle ? `${summary.cycle.days_to_next} days` : '12 days'}
            subtitle="before period"
            icon="calendar"
            iconColor={COLORS.accent}
            onPress={() => router.push('/dashboard/cycle')}
          />
          <MetricWidget
            title="Sleep"
            value={summary ? `${Math.floor(summary.sleep.total_minutes / 60)}h ${summary.sleep.total_minutes % 60}min` : '7h 31 min'}
            subtitle="updated a day ago"
            icon="moon"
            iconColor="#3B82F6"
            onPress={() => router.push('/dashboard/sleep')}
          />
          <MetricWidget
            title="Nutrition"
            value={summary ? `${summary.nutrition.calories} kcal` : '960 kcal'}
            subtitle="updated 5 min ago"
            icon="restaurant"
            iconColor={COLORS.warning}
            onPress={() => router.push('/dashboard/nutrition')}
          />
        </View>

        {/* Báo cáo tuần (This week report) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>This week report</Text>
            <TouchableOpacity onPress={() => router.push('/health-data')}>
              <Text style={styles.viewMoreText}>View more</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.reportGrid}>
            <View style={styles.reportCard}>
              <Ionicons name="footsteps" size={20} color={COLORS.primary} />
              <Text style={styles.reportValue}>{summary?.week_report.steps.toLocaleString() || '697,978'}</Text>
              <Text style={styles.reportLabel}>Steps</Text>
            </View>
            <View style={styles.reportCard}>
              <Ionicons name="fitness" size={20} color={COLORS.success} />
              <Text style={styles.reportValue}>6h 45min</Text>
              <Text style={styles.reportLabel}>Workout</Text>
            </View>
            <View style={styles.reportCard}>
              <Ionicons name="water" size={20} color="#3B82F6" />
              <Text style={styles.reportValue}>10,659 ml</Text>
              <Text style={styles.reportLabel}>Water</Text>
            </View>
            <View style={styles.reportCard}>
              <Ionicons name="bed" size={20} color="#8B5CF6" />
              <Text style={styles.reportValue}>29h 17min</Text>
              <Text style={styles.reportLabel}>Sleep</Text>
            </View>
          </View>
        </View>

        {/* Khám phá Blog / Kiến thức y tế */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Blogs</Text>
            <TouchableOpacity onPress={() => router.push('/explore')}>
              <Text style={styles.viewMoreText}>View more</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.blogScroll}>
            <TouchableOpacity
              style={styles.blogCard}
              onPress={() => router.push('/explore')}
            >
              <View style={styles.blogImagePlaceholder}>
                <Ionicons name="nutrition" size={32} color={COLORS.primary} />
              </View>
              <Text style={styles.blogCategory}>Nutrition</Text>
              <Text style={styles.blogTitle} numberOfLines={2}>
                More about Apples: Benefits, nutrition, and tips
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </ScrollView>

      {/* Thanh điều hướng dưới đáy */}
      <BottomTabBar currentRoute="/dashboard" onTabPress={(route) => router.push(route as any)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  dateText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  welcomeText: {
    fontSize: FONT_SIZES['3xl'],
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  widgetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 16,
    marginTop: 20,
  },
  section: {
    marginTop: 30,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  viewMoreText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },
  reportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  reportCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reportValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: 8,
  },
  reportLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  blogScroll: {
    marginTop: 4,
  },
  blogCard: {
    width: 260,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: 12,
    marginRight: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  blogImagePlaceholder: {
    height: 140,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  blogCategory: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  blogTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
});
