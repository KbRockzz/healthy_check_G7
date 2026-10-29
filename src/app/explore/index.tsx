/**
 * Màn hình Khám phá kiến thức y tế
 * Fetch articles từ Supabase, hỗ trợ vote và xem chi tiết
 */
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS, FONT_FAMILY } from '@/theme';
import { useAuth } from '@/lib/hooks/use-auth';
import { supabase, HealthContent } from '@/lib/supabase';
import BottomTabBar from '@/components/bottom-tab-bar';

type Category = 'all' | 'nutrition' | 'sports' | 'running' | 'sleep' | 'mental_health' | 'womens_health' | 'lifestyle';

const CATEGORIES: { label: string; value: Category }[] = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Dinh dưỡng', value: 'nutrition' },
  { label: 'Thể thao', value: 'sports' },
  { label: 'Chạy bộ', value: 'running' },
  { label: 'Giấc ngủ', value: 'sleep' },
  { label: 'Tâm lý', value: 'mental_health' },
  { label: 'Sức khỏe nữ', value: 'womens_health' },
];

export default function ExploreScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<HealthContent[]>([]);
  const [featured, setFeatured] = useState<HealthContent[]>([]);
  const [category, setCategory] = useState<Category>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!session) {
      router.replace('/auth/sign-in');
      return;
    }
    fetchArticles();
  }, [session]);

  async function fetchArticles() {
    try {
      // Featured articles
      const { data: featuredData, error: featuredError } = await supabase
        .from('health_content')
        .select('*')
        .eq('is_published', true)
        .eq('is_featured', true)
        .limit(1);
      if (!featuredError && featuredData?.length) setFeatured(featuredData);

      // All published articles
      const { data, error } = await supabase
        .from('health_content')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error) setArticles(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filteredArticles = articles.filter(article => {
    const matchCategory = category === 'all' || article.category === category;
    const matchSearch = !search ||
      article.title.toLowerCase().includes(search.toLowerCase()) ||
      article.excerpt.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleVote = async (articleId: string) => {
    if (!session) return;
    const { error } = await supabase.rpc('vote_article', { p_article_id: articleId });
    if (error) {
      Alert.alert('Lỗi', error.message);
    } else {
      fetchArticles();
    }
  };

  const handleOpenArticle = (slug: string) => {
    router.push({ pathname: '/explore/[slug]', params: { slug } });
  };

  if (!session) return null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Khám phá</Text>
          <TouchableOpacity onPress={() => router.push('/profile')}>
            <Ionicons name="person" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm chủ đề..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={COLORS.textTertiary}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textTertiary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.value}
              style={[styles.chip, category === cat.value && styles.chipActive]}
              onPress={() => setCategory(cat.value)}
            >
              <Text style={[styles.chipText, category === cat.value && styles.chipTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured Article */}
        {featured.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📌 Bài viết nổi bật</Text>
            <TouchableOpacity style={styles.featuredCard} onPress={() => handleOpenArticle(featured[0].slug)}>
              <View style={styles.featuredImage}>
                <Ionicons name="book" size={40} color={COLORS.primary} />
              </View>
              <View style={styles.featuredContent}>
                <Text style={styles.featuredCategory}>{featured[0].category}</Text>
                <Text style={styles.featuredTitle} numberOfLines={2}>{featured[0].title}</Text>
                <Text style={styles.featuredExcerpt} numberOfLines={2}>{featured[0].excerpt}</Text>
                <View style={styles.featuredFooter}>
                  <Ionicons name="time" size={14} color={COLORS.textTertiary} />
                  <Text style={styles.featuredTime}>{featured[0].read_minutes} phút đọc</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Articles List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bài viết mới nhất</Text>
            <Text style={styles.articleCount}>{filteredArticles.length} bài</Text>
          </View>

          {loading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : filteredArticles.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="book-outline" size={48} color={COLORS.textTertiary} />
              <Text style={styles.emptyText}>Không có bài viết nào</Text>
            </View>
          ) : (
            filteredArticles.map(article => (
              <TouchableOpacity
                key={article.id}
                style={styles.articleCard}
                onPress={() => handleOpenArticle(article.slug)}
                activeOpacity={0.8}
              >
                <View style={styles.articleTop}>
                  <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(article.category) + '20' }]}>
                    <Text style={[styles.categoryText, { color: getCategoryColor(article.category) }]}>
                      {getCategoryLabel(article.category)}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleVote(article.id); }}>
                    <Ionicons name="heart" size={20} color={COLORS.accent} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.articleTitle}>{article.title}</Text>
                <Text style={styles.articleExcerpt} numberOfLines={2}>{article.excerpt}</Text>
                <View style={styles.articleFooter}>
                  <Text style={styles.articleAuthor}>{article.author}</Text>
                  <Text style={styles.articleMeta}>
                    {article.read_minutes} phút • {article.views} lượt xem
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <BottomTabBar currentRoute="/explore" onTabPress={(route) => router.push(route as any)} />
    </View>
  );
}

function getCategoryColor(cat: string): string {
  const colors: Record<string, string> = {
    nutrition: COLORS.warning,
    sports: COLORS.success,
    running: COLORS.primary,
    sleep: '#8B5CF6',
    mental_health: '#3B82F6',
    womens_health: COLORS.accent,
    lifestyle: '#6366F1',
  };
  return colors[cat] || COLORS.primary;
}

function getCategoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    nutrition: 'Dinh dưỡng',
    sports: 'Thể thao',
    running: 'Chạy bộ',
    sleep: 'Giấc ngủ',
    mental_health: 'Tâm lý',
    womens_health: 'Sức khỏe nữ',
    lifestyle: 'Lối sống',
  };
  return labels[cat] || cat;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: { fontSize: FONT_SIZES['3xl'], fontWeight: 'bold', color: COLORS.textPrimary, fontFamily: FONT_FAMILY.bold as string },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 16,
    height: 48,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: FONT_SIZES.base, color: COLORS.textPrimary, marginLeft: 10, fontFamily: FONT_FAMILY.base as string },
  chipsScroll: { paddingHorizontal: 20, marginBottom: 24 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontWeight: '500', fontFamily: FONT_FAMILY.medium as string },
  chipTextActive: { color: COLORS.textInverse },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: 'bold', color: COLORS.textPrimary, fontFamily: FONT_FAMILY.bold as string },
  articleCount: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontFamily: FONT_FAMILY.base as string },
  featuredCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: 16,
    marginHorizontal: 20,
    ...SHADOWS.md,
  },
  featuredImage: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredContent: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  featuredCategory: { fontSize: FONT_SIZES.xs, color: COLORS.primary, fontWeight: '600', marginBottom: 4, fontFamily: FONT_FAMILY.semiBold as string },
  featuredTitle: { fontSize: FONT_SIZES.base, fontWeight: 'bold', color: COLORS.textPrimary, lineHeight: 22, fontFamily: FONT_FAMILY.bold as string },
  featuredExcerpt: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 6, lineHeight: 18, fontFamily: FONT_FAMILY.base as string },
  featuredFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  featuredTime: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary, fontFamily: FONT_FAMILY.base as string },
  loader: { paddingVertical: 40, alignItems: 'center' },
  emptyState: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: FONT_SIZES.base, color: COLORS.textSecondary, marginTop: 12, fontFamily: FONT_FAMILY.base as string },
  articleCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  articleTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  categoryText: { fontSize: FONT_SIZES.xs, fontWeight: '600', fontFamily: FONT_FAMILY.semiBold as string },
  articleTitle: { fontSize: FONT_SIZES.base, fontWeight: 'bold', color: COLORS.textPrimary, lineHeight: 22, fontFamily: FONT_FAMILY.bold as string },
  articleExcerpt: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 6, lineHeight: 18, fontFamily: FONT_FAMILY.base as string },
  articleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  articleAuthor: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary, fontFamily: FONT_FAMILY.base as string },
  articleMeta: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary, fontFamily: FONT_FAMILY.base as string },
});
