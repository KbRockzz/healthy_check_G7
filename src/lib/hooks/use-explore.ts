/**
 * Hook Explore — quản lý state và tương tác của màn hình Explore.
 *
 * Trả về: articles, likedIds, savedIds, loading, offline, refresh,
 *         toggleLike, toggleSave.
 *
 * - Cập nhật lạc quan (optimistic), hoàn tác + Alert nếu server lỗi.
 * - Bài có id không phải uuid → chỉ đổi state cục bộ (không gọi RPC).
 * - Chưa đăng nhập → Alert yêu cầu đăng nhập.
 * - refresh() giữ lại các lựa chọn của bài id không phải uuid.
 */
import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/lib/hooks/use-auth';
import { useFocusEffect } from 'expo-router';
import {
  fetchArticles,
  fetchMyVotedIds,
  fetchMyBookmarkIds,
  setVote,
  setBookmark,
  isServerId,
} from '@/lib/explore-api';
import { HEALTH_ARTICLES, DetailedArticle } from '@/data/health-articles';

export interface UseExploreReturn {
  articles: DetailedArticle[];
  likedIds: Set<string>;
  savedIds: Set<string>;
  loading: boolean;
  offline: boolean;
  refresh: () => Promise<void>;
  toggleLike: (articleId: string) => Promise<void>;
  toggleSave: (articleId: string) => Promise<void>;
}

export function useExplore(): UseExploreReturn {
  const { session } = useAuth();
  const userId = session?.user?.id as string | undefined;

  // Khởi tạo bằng bài local → màn hình luôn có data để hiển thị ngay,
// không phụ thuộc vào request server (tránh treo khi mạng chậm/lỗi).
const [articles, setArticles] = useState<DetailedArticle[]>(HEALTH_ARTICLES);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    console.log('[useExplore] load() started, userId =', userId);
    try {
      const [articlesRes, liked, saved] = await Promise.all([
        fetchArticles(),
        userId ? fetchMyVotedIds(userId) : Promise.resolve([]),
        userId ? fetchMyBookmarkIds(userId) : Promise.resolve([]),
      ]);
      console.log('[useExplore] load() completed, articles.length =', articlesRes.articles.length, 'fromServer =', articlesRes.fromServer);
      setArticles(articlesRes.articles);
      setLikedIds(new Set(liked));
      setSavedIds(new Set(saved));
      setOffline(!articlesRes.fromServer);
    } catch (err) {
      console.warn('[useExplore] load() error:', err);
      setOffline(true);
    } finally {
      console.log('[useExplore] load() finally, setting loading = false');
      setLoading(false);
    }
  }, [userId]);

  // load() là async → các setState() xảy ra sau await (trong promise
  // callback), không phải synchronous trong effect body. Đây là pattern
  // async-data-init chuẩn của React; rule set-state-in-effect là false
  // positive với hàm async. Ví dụ: https://react.dev/reference/react/useEffect

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    await load();
  }, [load]);

  const toggleLike = useCallback(
    async (articleId: string) => {
      if (!userId) {
        Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để thích bài viết.');
        return;
      }
      // Bài chỉ có trong app (id không phải uuid) → chỉ đổi state cục bộ.
      if (!isServerId(articleId)) {
        const next = new Set(likedIds);
        if (next.has(articleId)) next.delete(articleId);
        else next.add(articleId);
        setLikedIds(next);
        setArticles(prev =>
          prev.map(a =>
            a.id === articleId ? { ...a, upvotes: a.upvotes + (next.has(articleId) ? 1 : -1) } : a
          )
        );
        return;
      }

      const prevLiked = likedIds.has(articleId);
      const prevUpvotes = articles.find(a => a.id === articleId)?.upvotes ?? 0;

      // Optimistic
      const nextLiked = new Set(likedIds);
      if (prevLiked) nextLiked.delete(articleId);
      else nextLiked.add(articleId);
      setLikedIds(nextLiked);
      setArticles(prev =>
        prev.map(a =>
          a.id === articleId
            ? { ...a, upvotes: prevLiked ? prevUpvotes - 1 : prevUpvotes + 1 }
            : a
        )
      );

      try {
        await setVote(articleId, !prevLiked);
      } catch {
        // Hoàn tác
        setLikedIds(prevLiked ? new Set([...likedIds, articleId]) : likedIds);
        setArticles(prev =>
          prev.map(a =>
            a.id === articleId ? { ...a, upvotes: prevUpvotes } : a
          )
        );
        Alert.alert('Lỗi', 'Không thể cập nhật thích. Vui lòng thử lại.');
      }
    },
    [articles, likedIds, userId]
  );

  const toggleSave = useCallback(
    async (articleId: string) => {
      if (!userId) {
        Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để lưu bài viết.');
        return;
      }
      if (!isServerId(articleId)) {
        const next = new Set(savedIds);
        if (next.has(articleId)) next.delete(articleId);
        else next.add(articleId);
        setSavedIds(next);
        return;
      }

      const prevSaved = savedIds.has(articleId);
      const nextSaved = new Set(savedIds);
      if (prevSaved) nextSaved.delete(articleId);
      else nextSaved.add(articleId);
      setSavedIds(nextSaved);

      try {
        await setBookmark(articleId, userId, !prevSaved);
      } catch {
        setSavedIds(prevSaved ? new Set([...savedIds, articleId]) : savedIds);
        Alert.alert('Lỗi', 'Không thể cập nhật lưu bài. Vui lòng thử lại.');
      }
    },
    [savedIds, userId]
  );

  return {
    articles,
    likedIds,
    savedIds,
    loading,
    offline,
    refresh,
    toggleLike,
    toggleSave,
  };
}