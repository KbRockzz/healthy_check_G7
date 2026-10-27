import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, BORDER_RADIUS } from '@/theme';
import BottomTabBar from '@/components/bottom-tab-bar';

/**
 * Màn hình Khám phá kiến thức y tế (Explore Screen) — Mockup #5
 *
 * Màn hình 9/10: Danh mục bài viết y khoa, tìm kiếm và phân loại chuyên đề.
 */
export default function ExploreScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Explore</Text>

        {/* Thanh tìm kiếm */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textTertiary} style={{ marginRight: 8 }} />
          <Text style={styles.searchText}>Search topic</Text>
        </View>

        {/* Danh mục chuyên đề */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {['All', 'Nutrition', 'Sports', 'Running', 'Sleep', 'Mental Health'].map((chip, index) => (
            <TouchableOpacity
              key={chip}
              style={[styles.chip, index === 0 && styles.chipActive]}
            >
              <Text style={[styles.chipText, index === 0 && styles.chipTextActive]}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Bài viết nổi bật */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Newest blogs</Text>

          <TouchableOpacity style={styles.articleCard}>
            <View style={styles.articleImage}>
              <Ionicons name="nutrition" size={40} color={COLORS.primary} />
            </View>
            <Text style={styles.articleCategory}>Nutrition</Text>
            <Text style={styles.articleTitle}>More about Apples: Benefits, nutrition, and tips</Text>
            <View style={styles.articleFooter}>
              <Ionicons name="heart" size={16} color={COLORS.accent} />
              <Text style={styles.voteText}>78 votes</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BottomTabBar currentRoute="/explore" onTabPress={(route) => router.push(route as any)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: FONT_SIZES['3xl'],
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  searchText: {
    color: COLORS.textTertiary,
    fontSize: FONT_SIZES.base,
  },
  chipsScroll: {
    marginBottom: 24,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.textInverse,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  articleCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  articleImage: {
    height: 180,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  articleCategory: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  articleTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  articleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voteText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginLeft: 6,
    fontWeight: '500',
  },
});
