/**
 * Hook quản lý lịch sử hội thoại: list, mở lại, xoá một/tất cả.
 * Dùng supabase-js client — RLS chỉ cho phép select/delete của chính mình (§4).
 */

import { useState, useCallback } from 'react';
import { supabase } from '../supabase';
import type { ChatConversation } from '../supabase';

interface UseChatHistoryReturn {
  conversations: ChatConversation[];
  loading: boolean;
  load: () => Promise<void>;
  openConversation: (id: string) => Promise<ChatConversation | null>;
  deleteConversation: (id: string) => Promise<void>;
  deleteAll: () => Promise<void>;
}

export function useChatHistory(): UseChatHistoryReturn {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('id, user_id, title, created_at, updated_at')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setConversations(data ?? []);
    } catch (e) {
      console.error('use-chat-history: load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const openConversation = useCallback(
    async (id: string): Promise<ChatConversation | null> => {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('id, user_id, title, created_at, updated_at')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    []
  );

  const deleteConversation = useCallback(async (id: string) => {
    const { error } = await supabase.from('chat_conversations').delete().eq('id', id);
    if (error) throw error;
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const deleteAll = useCallback(async () => {
    const { error } = await supabase.from('chat_conversations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
    setConversations([]);
  }, []);

  return { conversations, loading, load, openConversation, deleteConversation, deleteAll };
}