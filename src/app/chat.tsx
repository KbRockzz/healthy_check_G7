/**
 * Màn hình chat "Health Coach" (§6).
 * - FlatList inverted, bong bóng, typing indicator, chip gợi ý (§6.4)
 * - Consent sheet lần đầu (§6.5) — từ chối thì không gọi Edge Function
 * - Banner "Chế độ thử nghiệm" (Q7: Gemini tầng miễn phí) + disclaimer y tế
 * - Header: lịch sử hội thoại (drawer đơn giản), xoá một/tất cả, tin nhắn mới
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, FONT_FAMILY, BORDER_RADIUS, SHADOWS } from '@/theme';
import { useAuth } from '@/lib/hooks/use-auth';
import { useChat } from '@/lib/hooks/use-chat';
import { useChatHistory } from '@/lib/hooks/use-chat-history';
import { MessageBubble } from '@/components/chat/message-bubble';
import { ChatInput } from '@/components/chat/chat-input';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { SuggestedChips, buildDynamicPrompts } from '@/components/chat/suggested-chips';
import { ConsentSheet, hasConsent, setConsent } from '@/components/chat/consent-sheet';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { session, profile } = useAuth();
  const userId = session?.user?.id as string | undefined;
  const params = useLocalSearchParams<{ prefill?: string }>();

  const chat = useChat();
  const history = useChatHistory();
  const [consentVisible, setConsentVisible] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const listRef = useRef<FlatList>(null);

  // Lần đầu mở chat → hiện consent (§6.5)
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    hasConsent(userId).then((ok) => {
      if (!cancelled && !ok) setConsentVisible(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Load danh sách hội thoại khi mở màn
  useEffect(() => {
    if (userId) void history.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Gợi ý động từ dữ liệu profile (client-side, không gọi LLM — §6.4)
  const dynamicPrompts = useMemo(
    () =>
      buildDynamicPrompts({
        stepsPct: 0, // TODO(Phase 6): lấy từ DashboardSummary đang cache
        sleepBelowGoal: false,
        cycleEnabled: profile?.cycle_enabled === true,
      }),
    [profile?.cycle_enabled]
  );

  const handleSend = (text: string) => {
    if (!userId) return;
    void chat.sendMessage(text);
  };

  const handleNewChat = () => {
    chat.reset();
    setHistoryOpen(false);
  };

  const handleDeleteAll = () => {
    Alert.alert(
      'Xoá tất cả lịch sử?',
      'Toàn bộ hội thoại sẽ bị gỡ khỏi máy chủ. Không thể hoàn tác.',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá tất cả',
          style: 'destructive',
          onPress: () => {
            void history.deleteAll().then(() => chat.reset());
          },
        },
      ]
    );
  };

  const handleOpenConversation = async (id: string) => {
    // Phase 6: mở lại hội thoại cũ (nạp message từ DB)
    setHistoryOpen(false);
    void id;
  };

  const showChips = chat.messages.length === 0 && !chat.isStreaming;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
          accessibilityLabel="Quay lại"
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Health Coach</Text>
          <Text style={styles.headerSub}>Trợ lý sức khỏe của bạn</Text>
        </View>
        <TouchableOpacity
          onPress={() => setHistoryOpen(true)}
          style={styles.headerBtn}
          accessibilityLabel="Lịch sử trò chuyện"
        >
          <Ionicons name="time-outline" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Banner thử nghiệm + disclaimer (Q7 + §6.5) */}
      <View style={styles.betaBanner}>
        <Ionicons name="flask-outline" size={14} color="#92400E" />
        <Text style={styles.betaText}>Chế độ thử nghiệm — không nhập thông tin cá nhân nhạy cảm.</Text>
      </View>

      <FlatList
        ref={listRef}
        style={styles.flex}
        data={chat.messages}
        inverted
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: 12 }]}
        ListFooterComponent={chat.isStreaming ? () => <TypingIndicator label={chat.currentTool} /> : undefined}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      {showChips && (
        <SuggestedChips
          hidden={false}
          onSelect={handleSend}
          dynamicPrompts={dynamicPrompts}
        />
      )}

      <ChatInput
        onSend={handleSend}
        onStop={chat.stop}
        streaming={chat.isStreaming}
        disabled={!userId || consentVisible}
        prefill={typeof params.prefill === 'string' ? params.prefill : undefined}
      />

      <Text style={styles.disclaimer}>
        Thông tin chỉ mang tính tham khảo, không thay thế tư vấn của bác sĩ.
      </Text>

      {/* Drawer lịch sử (modal đơn giản) */}
      <Modal visible={historyOpen} animationType="slide" onRequestClose={() => setHistoryOpen(false)}>
        <View style={[styles.historySheet, { paddingTop: insets.top + 12 }]}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Lịch sử trò chuyện</Text>
            <TouchableOpacity onPress={() => setHistoryOpen(false)} accessibilityLabel="Đóng">
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.newChatBtn} onPress={handleNewChat}>
            <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
            <Text style={styles.newChatText}>Cuộc trò chuyện mới</Text>
          </TouchableOpacity>

          <FlatList
            data={history.conversations}
            keyExtractor={(c) => c.id}
            ListEmptyComponent={
              <Text style={styles.emptyHistory}>Chưa có hội thoại nào.</Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.historyRow}
                onPress={() => handleOpenConversation(item.id)}
              >
                <View style={styles.historyRowText}>
                  <Text style={styles.historyItemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.historyItemDate}>
                    {new Date(item.updated_at).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert('Xoá hội thoại?', 'Không thể hoàn tác.', [
                      { text: 'Huỷ', style: 'cancel' },
                      { text: 'Xoá', style: 'destructive', onPress: () => void history.deleteConversation(item.id) },
                    ])
                  }
                  accessibilityLabel="Xoá hội thoại"
                >
                  <Ionicons name="trash-outline" size={20} color={COLORS.textTertiary} />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />

          {history.conversations.length > 0 && (
            <TouchableOpacity style={styles.deleteAllBtn} onPress={handleDeleteAll}>
              <Ionicons name="warning-outline" size={18} color={COLORS.danger} />
              <Text style={styles.deleteAllText}>Xoá tất cả lịch sử</Text>
            </TouchableOpacity>
          )}
        </View>
      </Modal>

      {/* Consent lần đầu (§6.5) */}
      <ConsentSheet
        visible={consentVisible}
        onAgree={() => {
          if (userId) void setConsent(userId, true);
          setConsentVisible(false);
        }}
        onDecline={() => {
          if (userId) void setConsent(userId, false);
          setConsentVisible(false);
          router.back();
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerBtn: { padding: 8 },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONT_FAMILY.bold,
    color: COLORS.textPrimary,
  },
  headerSub: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONT_FAMILY.base,
    color: COLORS.textTertiary,
  },
  betaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  betaText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONT_FAMILY.medium,
    color: '#92400E',
    flex: 1,
  },
  listContent: { paddingHorizontal: 4, paddingTop: 8 },
  disclaimer: {
    textAlign: 'center',
    fontSize: FONT_SIZES.xs,
    fontFamily: FONT_FAMILY.base,
    color: COLORS.textTertiary,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 6,
  },
  historySheet: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONT_FAMILY.bold,
    color: COLORS.textPrimary,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginBottom: 12,
    justifyContent: 'center',
  },
  newChatText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONT_FAMILY.medium,
    color: COLORS.primary,
  },
  emptyHistory: {
    textAlign: 'center',
    color: COLORS.textTertiary,
    marginTop: 40,
    fontSize: FONT_SIZES.sm,
    fontFamily: FONT_FAMILY.base,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  historyRowText: { flex: 1, gap: 2 },
  historyItemTitle: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONT_FAMILY.medium,
    color: COLORS.textPrimary,
  },
  historyItemDate: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONT_FAMILY.base,
    color: COLORS.textTertiary,
  },
  deleteAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    marginBottom: 12,
  },
  deleteAllText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONT_FAMILY.medium,
    color: COLORS.danger,
  },
});