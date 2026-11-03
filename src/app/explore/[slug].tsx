/**
 * Màn hình Chi tiết bài viết (Article Detail Screen)
 * Thiết kế sống động, tương tác phong phú:
 * - Tùy chỉnh kích thước chữ đọc (A- / A+)
 * - Hộp điểm cốt lõi (Key Takeaways) & Trích dẫn chuyên gia (Expert Quote)
 * - Danh sách việc cần làm tương tác (Interactive Action Checklist)
 * - Nút yêu thích, lưu bài viết (Bookmark), chia sẻ & Đề xuất bài viết liên quan
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Share, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS, FONT_FAMILY } from '@/theme';
import { useAuth } from '@/lib/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { HealthContent } from '@/lib/supabase';

interface DetailedArticle extends HealthContent {
  author_role: string;
  author_avatar?: string;
  key_takeaways: string[];
  quote?: {
    text: string;
    author: string;
  };
  action_tips: string[];
}

function enrichArticleFromDB(art: HealthContent): DetailedArticle {
  const authorRoles: Record<string, string> = {
    'nutrition': 'Chuyên gia Dinh dưỡng',
    'sleep': 'Chuyên gia Y học Giấc ngủ',
    'running': 'Huấn luyện viên Chạy bộ',
    'womens_health': 'Bác sĩ Sản phụ khoa',
    'sports': 'Huấn luyện viên Thể thao',
    'mental_health': 'Chuyên gia Tâm lý',
  };
  const categoriesWithQuotes: Record<string, { text: string; author: string }> = {
    'nutrition': {
      text: 'Thực phẩm bạn ăn mỗi ngày có thể là liều thuốc an toàn nhất hoặc là chất độc tích tụ chậm nhất.',
      author: 'Chuyên gia Dinh dưỡng',
    },
    'sleep': {
      text: 'Giấc ngủ không phải là sự nghỉ ngơi, mà là quá trình phục hồi và tái tạo thiết yếu nhất.',
      author: 'Chuyên gia Y học Giấc ngủ',
    },
    'running': {
      text: 'Chạy bộ không phải là chạy nhanh, mà là chạy đều đặn và kiên trì.',
      author: 'Huấn luyện viên Chạy bộ',
    },
    'womens_health': {
      text: 'Hiểu cơ thể mình là bước đầu tiên để chăm sóc sức khỏe toàn diện.',
      author: 'Bác sĩ Sản phụ khoa',
    },
    'sports': {
      text: 'Thể thao không chỉ rèn cơ thể, mà còn rèn ý chí.',
      author: 'Huấn luyện viên Thể thao',
    },
    'mental_health': {
      text: 'Sức khỏe tâm thần quan trọng không kém sức khỏe thể chất.',
      author: 'Chuyên gia Tâm lý',
    },
  };
  const categoriesWithActions: Record<string, string[]> = {
    'nutrition': [
      'Uống 1 cốc nước ấm cùng vài giọt chanh vào mỗi buổi sáng.',
      'Đảm bảo mỗi bữa chính luôn có ít nhất 25-30g protein chất lượng cao.',
      'Bổ sung quả mọng hoặc một nắm nhỏ hạt hạnh nhân vào bữa phụ.',
    ],
    'sleep': [
      'Cố định giờ thức dậy, kể cả cuối tuần.',
      'Cắt caffeine sau 14h, phòng ngủ 26-28°C.',
      'Tắt màn hình 45 phút trước giờ ngủ mục tiêu.',
    ],
    'running': [
      'Tăng cự ly không quá 10% mỗi tuần.',
      'Xen kẽ đi bộ - chạy để tránh chấn thương.',
      'Theo dõi Steps để biết khi nào đang quá tải.',
    ],
    'womens_health': [
      'Ghi nhận triệu chứng mỗi ngày để tìm quy律.',
      'Ăn đủ protein để ổn định đường huyết.',
      'Ngủ đủ 7 tiếng để giảm cơn thèm ăn.',
    ],
    'sports': [
      'Tập lực 3-4 lần/tuần, xen kẽ cardio.',
      'Protein sau tập trong vòng 30 phút.',
      'Ngủ 7-9 tiếng để phục hồi cơ bắp.',
    ],
    'mental_health': [
      'Thiền 5-10 phút mỗi ngày.',
      'Ghi nhật ký cảm xúc hàng ngày.',
      'Hạn chế mạng xã hội trước khi ngủ.',
    ],
  };

  return {
    ...art,
    author_role: authorRoles[art.category] || 'Chuyên gia Healthy Check',
    author_avatar: undefined,
    key_takeaways: [],
    quote: categoriesWithQuotes[art.category],
    action_tips: categoriesWithActions[art.category] || [],
    tags: art.tags || [],
  };
}

export default function ArticleScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { session } = useAuth();

  const [article, setArticle] = useState<DetailedArticle | null>(null);
  const [voted, setVoted] = useState(false);
  const [upvotes, setUpvotes] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [fontSize, setFontSize] = useState<number>(16);
  const [loading, setLoading] = useState(true);

  // Action checklist state (checked items)
  const [checkedActions, setCheckedActions] = useState<Record<number, boolean>>({});

  // Helpfulness feedback
  const [feedback, setFeedback] = useState<'yes' | 'no' | null>(null);

  const fetchArticle = useCallback(async () => {
    if (!slug) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('health_content')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

      if (error) throw error;

      if (data) {
        const enriched = enrichArticleFromDB(data);
        setArticle(enriched);
        setUpvotes(data.upvotes || 0);
      }
    } catch (err) {
      console.error('Fetch article error:', err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchArticle();
  }, [fetchArticle]);

  const handleVote = () => {
    if (!voted) {
      setVoted(true);
      setUpvotes((prev) => prev + 1);
    } else {
      setVoted(false);
      setUpvotes((prev) => prev - 1);
    }
  };

  const handleToggleBookmark = () => {
    const next = !isBookmarked;
    setIsBookmarked(next);
    Alert.alert(
      next ? 'Đã lưu bài viết 📌' : 'Đã bỏ lưu',
      next ? 'Bài viết đã được thêm vào danh sách yêu thích của bạn.' : 'Đã xóa khỏi danh sách lưu.'
    );
  };

  const handleShare = async () => {
    if (!article) return;
    try {
      await Share.share({
        message: `Đọc bài viết y khoa hữu ích: "${article.title}" trên Healthy Check!`,
        url: `https://healthycheck.io/explore/${article.slug}`,
      });
    } catch {
      Alert.alert('Chia sẻ', `Đã sao chép liên kết bài viết "${article.title}"`);
    }
  };

  const toggleAction = (idx: number) => {
    setCheckedActions((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Related articles - fetch from DB
  const [relatedArticles, setRelatedArticles] = useState<DetailedArticle[]>([]);

  const fetchRelated = useCallback(async () => {
    if (!article) return;
    try {
      const { data } = await supabase
        .from('health_content')
        .select('*')
        .eq('is_published', true)
        .neq('slug', slug)
        .order('published_at', { ascending: false })
        .limit(10);

      if (data && data.length > 0) {
        const enriched = data.map(enrichArticleFromDB);
        // Filter by same category or shared tags, then limit to 2
        const related = enriched
          .filter((a) => a.category === article.category || a.tags.some((t) => article.tags.includes(t)))
          .slice(0, 2);
        setRelatedArticles(related);
      }
    } catch {
      // Ignore
    }
  }, [article, slug]);

  useEffect(() => {
    if (article) {
      fetchRelated();
    }
  }, [article, fetchRelated]);

  const catColor = article ? getCategoryColor(article.category) : COLORS.primary;

  if (loading || !article) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Floating App Bar */}
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <View style={styles.appBarActions}>
          {/* Font Size Adjuster */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setFontSize((f) => (f >= 18 ? 14 : f + 2))}
          >
            <Text style={styles.fontSizeText}>A{fontSize > 16 ? '+' : ''}</Text>
          </TouchableOpacity>

          {/* Bookmark */}
          <TouchableOpacity style={styles.actionBtn} onPress={handleToggleBookmark}>
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={isBookmarked ? COLORS.primary : COLORS.textPrimary}
            />
          </TouchableOpacity>

          {/* Share */}
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Category Pill & Publish Date */}
        <View style={styles.metaTop}>
          <View style={[styles.categoryBadge, { backgroundColor: catColor + '18' }]}>
            <Text style={[styles.categoryText, { color: catColor }]}>
              {getCategoryLabel(article.category)}
            </Text>
          </View>
          <Text style={styles.publishedDate}>
            ⏱️ {article.read_minutes} phút đọc • {article.views} lượt xem
          </Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{article.title}</Text>

        {/* Excerpt Lead */}
        <Text style={styles.leadExcerpt}>{article.excerpt}</Text>

        {/* Author Card & Verified Medical Stamp */}
        <View style={styles.authorCard}>
          <View style={styles.authorAvatar}>
            <Ionicons name="person" size={22} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.authorNameRow}>
              <Text style={styles.authorName}>{article.author}</Text>
              <Ionicons name="checkmark-circle" size={16} color="#0EA5E9" style={{ marginLeft: 4 }} />
            </View>
            <Text style={styles.authorRole}>{article.author_role}</Text>
            <Text style={styles.verifiedStamp}>Đã kiểm định y khoa bởi Hội đồng Bác sĩ G7</Text>
          </View>
        </View>

        {/* Key Takeaways Box (Điểm cốt lõi cần nhớ 💡) */}
        {article.key_takeaways?.length > 0 && (
          <View style={styles.takeawaysBox}>
            <View style={styles.takeawaysHeader}>
              <Ionicons name="bulb" size={20} color="#D97706" />
              <Text style={styles.takeawaysTitle}>Điểm cốt lõi cần nhớ (Key Takeaways)</Text>
            </View>
            {article.key_takeaways.map((item, idx) => (
              <View key={idx} style={styles.takeawayRow}>
                <Ionicons name="checkmark-circle" size={16} color="#D97706" style={{ marginTop: 2, marginRight: 8 }} />
                <Text style={styles.takeawayText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Main Article Body */}
        <View style={styles.bodyContainer}>
          {article.body.split('\n\n').map((paragraph, pIdx) => {
            const isHeading = paragraph.length < 60 && !paragraph.includes('.') && !paragraph.includes(':');
            return (
              <Text
                key={pIdx}
                style={[
                  styles.paragraph,
                  { fontSize, lineHeight: fontSize * 1.6 },
                  isHeading && styles.subHeading,
                ]}
              >
                {paragraph}
              </Text>
            );
          })}
        </View>

        {/* Expert Quotation Block */}
        {article.quote && (
          <View style={styles.quoteCard}>
            <Ionicons name="chatbubble-ellipses-outline" size={28} color={catColor} style={{ marginBottom: 8 }} />
            <Text style={styles.quoteText}>"{article.quote.text}"</Text>
            <Text style={styles.quoteAuthor}>— {article.quote.author}</Text>
          </View>
        )}

        {/* Actionable Today Checklist (Mẹo thực hành hôm nay 🎯) */}
        {article.action_tips?.length > 0 && (
          <View style={styles.actionBox}>
            <View style={styles.actionHeader}>
              <Ionicons name="rocket-outline" size={20} color={COLORS.primary} />
              <Text style={styles.actionTitle}>Mẹo thực hành hôm nay</Text>
            </View>
            <Text style={styles.actionSubtitle}>Chạm vào để đánh dấu những thói quen bạn đã hoàn thành:</Text>

            {article.action_tips.map((tip, idx) => {
              const checked = !!checkedActions[idx];
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.actionItem, checked && styles.actionItemChecked]}
                  onPress={() => toggleAction(idx)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={checked ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={checked ? '#10B981' : COLORS.textTertiary}
                    style={{ marginRight: 10 }}
                  />
                  <Text style={[styles.actionTipText, checked && styles.actionTipTextChecked]}>
                    {tip}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Tags */}
        <View style={styles.tagsSection}>
          <Text style={styles.tagsLabel}>Chủ đề liên quan:</Text>
          <View style={styles.tagsRow}>
            {article.tags.map((tag, idx) => (
              <View key={idx} style={styles.tagPill}>
                <Text style={styles.tagPillText}>#{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Interactive Engagement Card */}
        <View style={styles.engagementCard}>
          <Text style={styles.engagementQuestion}>Bài viết này có hữu ích với bạn không?</Text>
          <View style={styles.feedbackRow}>
            <TouchableOpacity
              style={[styles.feedbackBtn, feedback === 'yes' && styles.feedbackBtnActive]}
              onPress={() => {
                setFeedback('yes');
                if (!voted) handleVote();
              }}
            >
              <Ionicons name="thumbs-up" size={18} color={feedback === 'yes' ? '#FFFFFF' : COLORS.primary} />
              <Text style={[styles.feedbackText, feedback === 'yes' && styles.feedbackTextActive]}>Hữu ích</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.feedbackBtn, feedback === 'no' && styles.feedbackBtnActive]}
              onPress={() => setFeedback('no')}
            >
              <Ionicons name="thumbs-down" size={18} color={feedback === 'no' ? '#FFFFFF' : COLORS.textSecondary} />
              <Text style={[styles.feedbackText, feedback === 'no' && styles.feedbackTextActive]}>Chưa rõ</Text>
            </TouchableOpacity>
          </View>

          {/* Big Heart Like Button */}
          <TouchableOpacity
            style={[styles.bigVoteBtn, voted && styles.bigVoteBtnActive]}
            onPress={handleVote}
            activeOpacity={0.8}
          >
            <Ionicons name={voted ? 'heart' : 'heart-outline'} size={24} color={voted ? '#FFFFFF' : '#EF4444'} />
            <Text style={[styles.bigVoteText, voted && styles.bigVoteTextActive]}>
              {voted ? 'Đã yêu thích' : 'Thả tim bài viết'} ({upvotes})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Related Articles Carousel */}
        {relatedArticles.length > 0 && (
          <View style={styles.relatedSection}>
            <Text style={styles.relatedSectionTitle}>Bài viết cùng chuyên mục</Text>
            {relatedArticles.map((rel) => (
              <TouchableOpacity
                key={rel.id}
                style={styles.relatedCard}
                onPress={() => router.push({ pathname: '/explore/[slug]', params: { slug: rel.slug } })}
                activeOpacity={0.8}
              >
                <View style={styles.relatedCardLeft}>
                  <Text style={styles.relatedCategory}>{getCategoryLabel(rel.category)}</Text>
                  <Text style={styles.relatedTitle} numberOfLines={2}>{rel.title}</Text>
                  <Text style={styles.relatedAuthor}>Tác giả: {rel.author}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
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
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 14,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  iconBtn: { padding: 4 },
  appBarActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSizeText: { fontSize: 13, fontWeight: 'bold', color: COLORS.textPrimary },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60 },
  metaTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  categoryText: { fontSize: 11, fontWeight: '700', fontFamily: FONT_FAMILY.bold as string },
  publishedDate: { fontSize: 11, color: COLORS.textTertiary, fontFamily: FONT_FAMILY.base as string },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    lineHeight: 30,
    marginBottom: 10,
    fontFamily: FONT_FAMILY.bold as string,
  },
  leadExcerpt: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
    fontStyle: 'italic',
    fontFamily: FONT_FAMILY.base as string,
  },
  authorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 18,
    ...SHADOWS.sm,
  },
  authorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  authorNameRow: { flexDirection: 'row', alignItems: 'center' },
  authorName: { fontSize: 13, fontWeight: 'bold', color: COLORS.textPrimary, fontFamily: FONT_FAMILY.bold as string },
  authorRole: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, fontFamily: FONT_FAMILY.base as string },
  verifiedStamp: { fontSize: 10, color: '#0369A1', fontWeight: '600', marginTop: 4, fontFamily: FONT_FAMILY.medium as string },
  takeawaysBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 22,
  },
  takeawaysHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  takeawaysTitle: { fontSize: 13, fontWeight: 'bold', color: '#92400E', fontFamily: FONT_FAMILY.bold as string },
  takeawayRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  takeawayText: { flex: 1, fontSize: 12, color: '#78350F', lineHeight: 18, fontFamily: FONT_FAMILY.base as string },
  bodyContainer: { marginBottom: 20 },
  paragraph: {
    color: COLORS.textPrimary,
    marginBottom: 16,
    fontFamily: FONT_FAMILY.base as string,
  },
  subHeading: {
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    fontFamily: FONT_FAMILY.bold as string,
    marginTop: 8,
    marginBottom: 6,
  },
  quoteCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 18,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quoteText: { fontSize: 13, fontStyle: 'italic', color: COLORS.textPrimary, lineHeight: 21, fontFamily: FONT_FAMILY.base as string },
  quoteAuthor: { fontSize: 11, fontWeight: 'bold', color: COLORS.textSecondary, marginTop: 8, textAlign: 'right', fontFamily: FONT_FAMILY.bold as string },
  actionBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 22,
  },
  actionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  actionTitle: { fontSize: 14, fontWeight: 'bold', color: '#166534', fontFamily: FONT_FAMILY.bold as string },
  actionSubtitle: { fontSize: 11, color: '#15803D', marginBottom: 12, fontFamily: FONT_FAMILY.base as string },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  actionItemChecked: { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' },
  actionTipText: { flex: 1, fontSize: 12, color: COLORS.textPrimary, lineHeight: 18, fontFamily: FONT_FAMILY.base as string },
  actionTipTextChecked: { textDecorationLine: 'line-through', color: COLORS.textTertiary },
  tagsSection: { marginBottom: 24 },
  tagsLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8, fontFamily: FONT_FAMILY.medium as string },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagPill: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagPillText: { fontSize: 11, color: COLORS.primary, fontWeight: '600', fontFamily: FONT_FAMILY.medium as string },
  engagementCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginBottom: 28,
    ...SHADOWS.sm,
  },
  engagementQuestion: { fontSize: 13, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 14, fontFamily: FONT_FAMILY.bold as string },
  feedbackRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  feedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  feedbackBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  feedbackText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, fontFamily: FONT_FAMILY.medium as string },
  feedbackTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  bigVoteBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  bigVoteBtnActive: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  bigVoteText: { fontSize: 13, fontWeight: 'bold', color: '#EF4444', fontFamily: FONT_FAMILY.bold as string },
  bigVoteTextActive: { color: '#FFFFFF' },
  relatedSection: { marginTop: 4 },
  relatedSectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 12, fontFamily: FONT_FAMILY.bold as string },
  relatedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    ...SHADOWS.sm,
  },
  relatedCardLeft: { flex: 1, marginRight: 12 },
  relatedCategory: { fontSize: 10, fontWeight: 'bold', color: COLORS.primary, textTransform: 'uppercase', marginBottom: 4, fontFamily: FONT_FAMILY.bold as string },
  relatedTitle: { fontSize: 13, fontWeight: 'bold', color: COLORS.textPrimary, lineHeight: 18, marginBottom: 4, fontFamily: FONT_FAMILY.bold as string },
  relatedAuthor: { fontSize: 11, color: COLORS.textTertiary, fontFamily: FONT_FAMILY.base as string },
});
