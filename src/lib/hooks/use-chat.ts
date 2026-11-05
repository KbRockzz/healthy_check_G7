/**
 * Hook quản lý state hội thoại chat + streaming.
 * Che giấu sự khác biệt stream/no-stream (§6.2): nếu `expo/fetch` không trả
 * stream (web), fallback là gom toàn bộ delta → hiện typing indicator.
 */

import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { streamChat } from '../chat-api';
import { supabase, type ChatRole } from '../supabase';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  safety?: 'emergency' | 'refused' | null;
}

interface UseChatReturn {
  messages: ChatMessage[];
  conversationId: string | null;
  isStreaming: boolean;
  /** Nhãn tool đang chạy (event `tool` — Phase 5): "Đang xem dữ liệu của bạn…" */
  currentTool: string | null;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  loadConversation: (convId: string) => Promise<void>;
  stop: () => void;
  reset: () => void;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const msgIdRef = useRef(0);
  // Refs để update assistant message content mà không re-render toàn bộ list
  const assistantRef = useRef<ChatMessage | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);

  const pushMessage = useCallback((m: ChatMessage) => {
    messagesRef.current = [...messagesRef.current, m];
    setMessages(messagesRef.current);
  }, []);

  const updateAssistant = useCallback((text: string) => {
    const cur = messagesRef.current;
    const last = cur[cur.length - 1];
    if (last && last.role === 'assistant') {
      const updated = { ...last, content: last.content + text };
      messagesRef.current = cur.slice(0, -1).concat(updated);
      assistantRef.current = updated;
      setMessages(messagesRef.current);
    } else {
      const m: ChatMessage = {
        id: `asst-${msgIdRef.current++}`,
        role: 'assistant',
        content: text,
        safety: null,
      };
      assistantRef.current = m;
      pushMessage(m);
    }
  }, [pushMessage]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;
      setError(null);
      setIsStreaming(true);

      // Append user message
      const userMsg: ChatMessage = {
        id: `user-${msgIdRef.current++}`,
        role: 'user',
        content: text.trim(),
      };
      pushMessage(userMsg);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        for await (const evt of streamChat(
          { message: text.trim(), conversation_id: conversationId },
          controller.signal
        )) {
          if (evt.type === 'meta') {
            setConversationId(evt.conversation_id ?? null);
          } else if (evt.type === 'delta') {
            setCurrentTool(null); // text đã bắt đầu → bỏ nhãn tool
            updateAssistant(evt.text);
          } else if (evt.type === 'tool') {
            // Phase 5: UI hiện "Đang xem dữ liệu của bạn…" khi tool chạy
            setCurrentTool('Đang xem dữ liệu của bạn…');
          } else if (evt.type === 'error') {
            setError(evt.message);
            Alert.alert('Lỗi', evt.message);
            break;
          } else if (evt.type === 'done') {
            break;
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Lỗi không xác định';
        setError(msg);
        Alert.alert('Lỗi', msg);
      } finally {
        abortRef.current = null;
        setIsStreaming(false);
        setCurrentTool(null);
      }
    },
    [conversationId, isStreaming, pushMessage, updateAssistant]
  );

  const loadConversation = useCallback(async (convId: string) => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setError(null);

    try {
      const { data, error: dbErr } = await supabase
        .from('chat_messages')
        .select('id, role, content, safety_flag')
        .eq('conversation_id', convId)
        .order('id', { ascending: true });
      if (dbErr || !data) return;

      const loaded: ChatMessage[] = data.map((row: { id: number | string; role: string; content: string; safety_flag?: string | null }) => ({
        id: `db-${row.id}`,
        role: (row.role === 'assistant' ? 'assistant' : 'user') as ChatRole,
        content: row.content,
        safety: (row.safety_flag as 'emergency' | 'refused' | null) ?? null,
      }));
      messagesRef.current = loaded;
      assistantRef.current = null;
      setMessages(loaded);
      setConversationId(convId);
    } catch {
      // Ignore error
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    msgIdRef.current = 0;
    messagesRef.current = [];
    assistantRef.current = null;
    setMessages([]);
    setConversationId(null);
    setIsStreaming(false);
    setError(null);
  }, []);

  return {
    messages,
    conversationId,
    isStreaming,
    currentTool,
    error,
    sendMessage,
    loadConversation,
    stop,
    reset,
  };
}
