/**
 * Màn hình chi tiết bài viết
 */
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '@/theme';
import { supabase, HealthContent } from '@/lib/supabase';
import { useAuth } from '@/lib/hooks/use-auth';

export default function ArticleScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState<HealthContent | null>(null);
  const [voted, setVoted] = useState(false);

  useEffect(() => {
    fetchArticle();
  }, [slug]);

  async function fetchArticle() {
    try {
      const { data, error } = await supabase
        .from('health_content')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

      if (error || !data) {
        Alert.alert('Không tìm thấy', 'Bài viết không tồn tại');
        router.back();
        return;
      }

      setArticle(data);

      // Register view
      try {
        await supabase.rpc('register_content_view', { p_article_id: data.id });
      } catch (e) {
        console.error('Register view error:', e);
      }

      // Check if already voted
      if (session) {
        const { data: votes } = await supabase
          .from('content_votes')
          .select('id')
          .eq('article_id', data.id)
          .eq('user_id', session.user.id)
          .single();
        if (votes) setVoted(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleVote = async () => {
    if (!session) {
      Alert.alert('Đăng nhập', 'Vui lòng đăng nhập để bình chọn');
      router.push('/auth/sign-in');
      return;
    }
    if (voted) {
      Alert.alert('Đã bình chọn', 'Bạn đã bình chọn cho bài viết này rồi!');
      return;
    }
    const { error } = await supabase.rpc('vote_article', { p_article_id: article?.id });
    if (error) {
      Alert.alert('Lỗi', error.message);
    } else {
      setVoted(true);
      setArticle(prev => prev ? { ...prev, upvotes: prev.upvotes + 1 } : prev);
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!article) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bài viết</Text>
        <TouchableOpacity onPress={handleVote}>
          <Ionicons name={voted ? 'heart' : 'heart-outline'} size={24} color={voted ? COLORS.accent : COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Category */}
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>{getCategoryLabel(article.category)}</Text>
      </View>

      {/* Title */}
      <Text style={styles.title}>{article.title}</Text>

      {/* Meta */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="person" size={14} color={COLORS.textTertiary} />
          <Text style={styles.metaText}>{article.author}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time" size={14} color={COLORS.textTertiary} />
          <Text style={styles.metaText}>{article.read_minutes} phút đọc</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="eye" size={14} color={COLORS.textTertiary} />
          <Text style={styles.metaText}>{article.views} lượt xem</Text>
        </View>
      </View>

      {/* Excerpt */}
      <View style={styles.excerptBox}>
        <Text style={styles.excerpt}>{article.excerpt}</Text>
      </View>

      {/* Content */}
      <Text style={styles.body}>{article.body}</Text>

      {/* Tags */}
      {article.tags?.length > 0 && (
        <View style={styles.tagsRow}>
          {article.tags.map((tag, idx) => (
            <View key={idx} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Vote Button */}
      <TouchableOpacity style={styles.voteBtn} onPress={handleVote}>
        <Ionicons name={voted ? 'heart' : 'heart-outline'} size={20} color={COLORS.textInverse} />
        <Text style={styles.voteBtnText}>
          {voted ? 'Đã bình chọn' : `Bình chọn (${article.upvotes})`}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
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
  content: { padding: 20, paddingBottom: 40 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    marginBottom: 20,
  },
  headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: 'bold' },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: 16,
  },
  categoryText: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: '600' },
  title: { fontSize: FONT_SIZES['3xl'], fontWeight: 'bold', color: COLORS.textPrimary, lineHeight: 36 },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  excerptBox: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    marginBottom: 20,
  },
  excerpt: { fontSize: FONT_SIZES.base, color: COLORS.textSecondary, lineHeight: 24 },
  body: { fontSize: FONT_SIZES.base, color: COLORS.textPrimary, lineHeight: 26 },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 20,
    marginBottom: 24,
  },
  tag: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  tagText: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  voteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.full,
    marginTop: 10,
  },
  voteBtnText: { color: COLORS.textInverse, fontWeight: '600', marginLeft: 8, fontSize: FONT_SIZES.base },
});
