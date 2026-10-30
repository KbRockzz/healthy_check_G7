/**
 * Màn hình Khám phá kiến thức y tế (Explore Screen)
 * Kho bài viết phong phú, phân loại chi tiết, bộ lọc thông minh & tìm kiếm
 */
import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS, FONT_FAMILY } from '@/theme';
import { useAuth } from '@/lib/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { HEALTH_ARTICLES, DetailedArticle } from '@/data/health-articles';
import BottomTabBar from '@/components/bottom-tab-bar';

type Category = 'all' | 'nutrition' | 'sleep' | 'running' | 'womens_health' | 'sports' | 'mental_health';
type SortOption = 'newest' | 'views' | 'upvotes';

const CATEGORY_TABS: { label: string; value: Category; icon: string }[] = [
  { label: 'Tất cả', value: 'all', icon: 'grid-outline' },
  { label: 'Dinh dưỡng', value: 'nutrition', icon: 'restaurant-outline' },
  { label: 'Giấc ngủ', value: 'sleep', icon: 'moon-outline' },
  { label: 'Chạy bộ', value: 'running', icon: 'walk-outline' },
  { label: 'Sức khỏe nữ', value: 'womens_health', icon: 'rose-outline' },
  { label: 'Thể thao', value: 'sports', icon: 'barbell-outline' },
  { label: 'Tâm lý', value: 'mental_health', icon: 'leaf-outline' },
];

export default function ExploreScreen() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [articles, setArticles] = useState<DetailedArticle[]>(HEALTH_ARTICLES);
  const [category, setCategory] = useState<Category>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [likedArticles, setLikedArticles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.replace('/auth/sign-in');
      return;
    }
    fetchArticles();
  }, [session, authLoading]);

  async function fetchArticles() {
    try {
      const { data } = await supabase
        .from('health_content')
        .select('*')
        .eq('is_published', true);

      if (data && data.length > 0) {
        // Merge Supabase upvotes/views if available
        setArticles(prev =>
          prev.map(localArt => {
            const serverArt = data.find((d: any) => d.slug === localArt.slug);
            if (serverArt) {
              return {
                ...localArt,
                views: serverArt.views || localArt.views,
                upvotes: serverArt.upvotes || localArt.upvotes,
              };
            }
            return localArt;
          })
        );
      }
    } catch {
      // Keep local repository
    }
  }

  // Count articles per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: articles.length };
    articles.forEach(art => {
      counts[art.category] = (counts[art.category] || 0) + 1;
    });
    return counts;
  }, [articles]);

  // Featured article
  const featuredArticle = useMemo(() => {
    return articles.find(a => a.is_featured) || articles[0];
  }, [articles]);

  // Filtered and sorted articles
  const filteredArticles = useMemo(() => {
    let result = articles.filter((art) => {
      const matchCat = category === 'all' || art.category === category;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        art.title.toLowerCase().includes(q) ||
        art.excerpt.toLowerCase().includes(q) ||
        art.author.toLowerCase().includes(q) ||
        art.tags.some(t => t.toLowerCase().includes(q.replace('#', '')));
      return matchCat && matchSearch;
    });

    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.published_at || '').getTime() - new Date(a.published_at || '').getTime());
    } else if (sortBy === 'views') {
      result.sort((a, b) => b.views - a.views);
    } else if (sortBy === 'upvotes') {
      result.sort((a, b) => b.upvotes - a.upvotes);
    }

    return result;
  }, [articles, category, search, sortBy]);

  const handleOpenArticle = (slug: string) => {
    router.push({ pathname: '/explore/[slug]', params: { slug } });
  };

  const handleToggleLike = (articleId: string) => {
    const isLiked = likedArticles[articleId];
    setLikedArticles(prev => ({ ...prev, [articleId]: !isLiked }));
    setArticles(prev =>
      prev.map(art => {
        if (art.id === articleId) {
          return {
            ...art,
            upvotes: isLiked ? art.upvotes - 1 : art.upvotes + 1,
          };
        }
        return art;
      })
    );
  };

  const handleTagPress = (tag: string) => {
    setSearch(tag);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Khám phá</Text>
            <Text style={styles.subtitle}>Kiến thức y khoa chuẩn xác & Lối sống lành mạnh</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/profile')} style={styles.avatarBtn}>
            <Ionicons name="person-circle-outline" size={34} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Quick Stats Pill */}
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Ionicons name="book-outline" size={16} color={COLORS.primary} />
            <Text style={styles.statPillText}>{articles.length} bài viết chuyên sâu</Text>
          </View>
          <View style={styles.statPill}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#10B981" />
            <Text style={[styles.statPillText, { color: '#047857' }]}>100% kiểm duyệt y khoa</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm bài viết, tác giả, #calo, #zone2, #rem..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={COLORS.textTertiary}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Category Chips Scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {CATEGORY_TABS.map((cat) => {
            const count = categoryCounts[cat.value] || 0;
            const isActive = category === cat.value;
            return (
              <TouchableOpacity
                key={cat.value}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setCategory(cat.value)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={15}
                  color={isActive ? '#FFFFFF' : COLORS.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {cat.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Featured Card (Only when not searching and viewing 'all') */}
        {featuredArticle && !search && category === 'all' && (
          <View style={styles.featuredSection}>
            <View style={styles.featuredHeader}>
              <Text style={styles.sectionTitle}>📌 Bài viết tiêu điểm</Text>
              <View style={styles.featuredPill}>
                <Ionicons name="flame" size={14} color="#FFFFFF" />
                <Text style={styles.featuredPillText}>ĐỌC NHIỀU NHẤT</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.featuredCard}
              onPress={() => handleOpenArticle(featuredArticle.slug)}
              activeOpacity={0.9}
            >
              <View style={styles.featuredTopRow}>
                <View style={[styles.categoryTag, { backgroundColor: '#38BDF820' }]}>
                  <Text style={[styles.categoryTagText, { color: '#0284C7' }]}>
                    {getCategoryLabel(featuredArticle.category)}
                  </Text>
                </View>
                <Text style={styles.featuredReadTime}>⏱️ {featuredArticle.read_minutes} phút đọc</Text>
              </View>

              <Text style={styles.featuredTitle}>{featuredArticle.title}</Text>
              <Text style={styles.featuredExcerpt} numberOfLines={3}>{featuredArticle.excerpt}</Text>

              <View style={styles.featuredDivider} />

              <View style={styles.featuredFooter}>
                <View style={styles.authorGroup}>
                  <View style={styles.authorAvatarWrap}>
                    <Ionicons name="person" size={14} color={COLORS.primary} />
                  </View>
                  <View>
                    <Text style={styles.featuredAuthor}>{featuredArticle.author}</Text>
                    <Text style={styles.featuredRole} numberOfLines={1}>{featuredArticle.author_role}</Text>
                  </View>
                </View>
                <View style={styles.featuredStats}>
                  <Text style={styles.statCount}>👁️ {featuredArticle.views}</Text>
                  <Text style={styles.statCount}>❤️ {featuredArticle.upvotes}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Filter & Sort Bar */}
        <View style={styles.listHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>
              {category === 'all' ? 'Tất cả bài viết' : `Chuyên mục: ${getCategoryLabel(category)}`}
            </Text>
            <Text style={styles.listSubtitle}>Tìm thấy {filteredArticles.length} bài viết</Text>
          </View>

          {/* Sort Switcher */}
          <View style={styles.sortButtons}>
            {[
              { id: 'newest', label: 'Mới' },
              { id: 'views', label: 'Xem' },
              { id: 'upvotes', label: 'Thích' },
            ].map(s => (
              <TouchableOpacity
                key={s.id}
                style={[styles.sortBtn, sortBy === s.id && styles.sortBtnActive]}
                onPress={() => setSortBy(s.id as SortOption)}
              >
                <Text style={[styles.sortBtnText, sortBy === s.id && styles.sortBtnTextActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Articles List */}
        {filteredArticles.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="search-outline" size={48} color={COLORS.textTertiary} />
            <Text style={styles.emptyTitle}>Không tìm thấy bài viết</Text>
            <Text style={styles.emptySub}>Thử tìm từ khóa khác hoặc chuyển sang danh mục "Tất cả"</Text>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => {
                setSearch('');
                setCategory('all');
              }}
            >
              <Text style={styles.resetBtnText}>Đặt lại bộ lọc</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredArticles.map((art) => {
            const isLiked = !!likedArticles[art.id];
            const catColor = getCategoryColor(art.category);
            return (
              <TouchableOpacity
                key={art.id}
                style={styles.articleCard}
                onPress={() => handleOpenArticle(art.slug)}
                activeOpacity={0.85}
              >
                {/* Header row of card */}
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.catBadge, { backgroundColor: catColor + '18' }]}>
                    <Text style={[styles.catBadgeText, { color: catColor }]}>
                      {getCategoryLabel(art.category)}
                    </Text>
                  </View>

                  <View style={styles.cardHeaderRight}>
                    <Text style={styles.readMinutes}>⏱️ {art.read_minutes} phút</Text>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handleToggleLike(art.id);
                      }}
                      style={styles.heartBtn}
                    >
                      <Ionicons
                        name={isLiked ? 'heart' : 'heart-outline'}
                        size={18}
                        color={isLiked ? '#EF4444' : COLORS.textTertiary}
                      />
                      <Text style={[styles.heartCount, isLiked && { color: '#EF4444' }]}>
                        {art.upvotes}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Article Title */}
                <Text style={styles.cardTitle}>{art.title}</Text>

                {/* Article Excerpt */}
                <Text style={styles.cardExcerpt} numberOfLines={2}>
                  {art.excerpt}
                </Text>

                {/* Tags row */}
                <View style={styles.tagsContainer}>
                  {art.tags.slice(0, 3).map((tag, tIdx) => (
                    <TouchableOpacity
                      key={tIdx}
                      style={styles.tagPill}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleTagPress(tag);
                      }}
                    >
                      <Text style={styles.tagText}>#{tag}</Text>
                    </TouchableOpacity>
                  ))}
                  <Text style={styles.viewsText}>👁️ {art.views} lượt xem</Text>
                </View>

                {/* Author footer */}
                <View style={styles.authorFooter}>
                  <Ionicons name="medical" size={13} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.authorName} numberOfLines={1}>
                    {art.author} <Text style={styles.authorSub}>• {art.author_role.split('-')[0].trim()}</Text>
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Bottom 4-Tab Bar */}
      <BottomTabBar currentRoute="/explore" onTabPress={(route) => router.push(route as any)} />
    </View>
  );
}

function getCategoryColor(cat: string): string {
  const colors: Record<string, string> = {
    nutrition: '#D97706',
    sports: '#10B981',
    running: '#0284C7',
    sleep: '#8B5CF6',
    mental_health: '#3B82F6',
    womens_health: '#DB2777',
    lifestyle: '#059669',
  };
  return colors[cat] || '#0284C7';
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 110 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 12,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, fontFamily: FONT_FAMILY.bold as string },
  subtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, fontFamily: FONT_FAMILY.base as string },
  avatarBtn: { padding: 4 },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statPillText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, fontFamily: FONT_FAMILY.medium as string },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    gap: 8,
    ...SHADOWS.sm,
  },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.textPrimary, fontFamily: FONT_FAMILY.base as string },
  chipsScroll: { marginBottom: 18 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, fontFamily: FONT_FAMILY.medium as string },
  chipTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  featuredSection: { marginBottom: 20 },
  featuredHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  featuredPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  featuredPillText: { fontSize: 9, fontWeight: '900', color: '#FFFFFF', fontFamily: FONT_FAMILY.bold as string },
  featuredCard: {
    backgroundColor: '#0F172A',
    borderRadius: 22,
    padding: 20,
    ...SHADOWS.md,
  },
  featuredTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  categoryTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  categoryTagText: { fontSize: 11, fontWeight: 'bold', fontFamily: FONT_FAMILY.semiBold as string },
  featuredReadTime: { fontSize: 11, color: '#38BDF8', fontWeight: '600', fontFamily: FONT_FAMILY.medium as string },
  featuredTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', lineHeight: 24, marginBottom: 8, fontFamily: FONT_FAMILY.bold as string },
  featuredExcerpt: { fontSize: 12, color: '#94A3B8', lineHeight: 18, marginBottom: 14, fontFamily: FONT_FAMILY.base as string },
  featuredDivider: { height: 1, backgroundColor: '#1E293B', marginBottom: 12 },
  featuredFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  authorGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 },
  authorAvatarWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredAuthor: { fontSize: 12, fontWeight: 'bold', color: '#F1F5F9', fontFamily: FONT_FAMILY.semiBold as string },
  featuredRole: { fontSize: 10, color: '#64748B', fontFamily: FONT_FAMILY.base as string },
  featuredStats: { flexDirection: 'row', gap: 10 },
  statCount: { fontSize: 11, color: '#94A3B8', fontWeight: '600', fontFamily: FONT_FAMILY.medium as string },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, fontFamily: FONT_FAMILY.bold as string },
  listSubtitle: { fontSize: 11, color: COLORS.textTertiary, marginTop: 2, fontFamily: FONT_FAMILY.base as string },
  sortButtons: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 10, padding: 2, borderWidth: 1, borderColor: COLORS.border },
  sortBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  sortBtnActive: { backgroundColor: COLORS.primary },
  sortBtnText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, fontFamily: FONT_FAMILY.medium as string },
  sortBtnTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  articleCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    ...SHADOWS.sm,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  catBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  catBadgeText: { fontSize: 11, fontWeight: '700', fontFamily: FONT_FAMILY.bold as string },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  readMinutes: { fontSize: 11, color: COLORS.textTertiary, fontFamily: FONT_FAMILY.base as string },
  heartBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 },
  heartCount: { fontSize: 11, fontWeight: '600', color: COLORS.textTertiary, fontFamily: FONT_FAMILY.semiBold as string },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, lineHeight: 22, marginBottom: 6, fontFamily: FONT_FAMILY.bold as string },
  cardExcerpt: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 12, fontFamily: FONT_FAMILY.base as string },
  tagsContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  tagPill: { backgroundColor: COLORS.surface, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: COLORS.border },
  tagText: { fontSize: 10, color: COLORS.primary, fontWeight: '600', fontFamily: FONT_FAMILY.medium as string },
  viewsText: { fontSize: 10, color: COLORS.textTertiary, marginLeft: 'auto', fontFamily: FONT_FAMILY.base as string },
  authorFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 10,
  },
  authorName: { fontSize: 11, fontWeight: 'bold', color: COLORS.textPrimary, fontFamily: FONT_FAMILY.semiBold as string, flex: 1 },
  authorSub: { fontWeight: 'normal', color: COLORS.textSecondary },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 10,
  },
  emptyTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: 12, fontFamily: FONT_FAMILY.bold as string },
  emptySub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center', lineHeight: 18, fontFamily: FONT_FAMILY.base as string },
  resetBtn: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  resetBtnText: { fontSize: 12, fontWeight: 'bold', color: '#FFFFFF', fontFamily: FONT_FAMILY.bold as string },
});
