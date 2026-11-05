/**
 * Bong bóng tin nhắn chat (§6.6): user = COLORS.primary, assistant = COLORS.surface.
 * Hỗ trợ in đậm đơn giản (**text**) — không dùng thư viện markdown native.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZES, BORDER_RADIUS, FONT_FAMILY } from '../../theme';
import type { ChatMessage } from '../../lib/hooks/use-chat';

interface Props {
  message: ChatMessage;
}

/**
 * Tách các đoạn **in đậm** và render tuần tự trong cùng một <Text>.
 */
function RichText({ content, color }: { content: string; color: string }) {
  const segments: { text: string; bold: boolean }[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) segments.push({ text: content.slice(last, m.index), bold: false });
    segments.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < content.length) segments.push({ text: content.slice(last), bold: false });
  return (
    <Text style={[styles.text, { color }]}>
      {segments.map((s, i) => (
        <Text key={i} style={s.bold ? styles.bold : undefined}>
          {s.text}
        </Text>
      ))}
    </Text>
  );
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const isEmergency = message.safety === 'emergency';
  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
          isEmergency && !isUser && styles.bubbleEmergency,
        ]}
      >
        <RichText content={message.content} color={isUser ? COLORS.textInverse : COLORS.textPrimary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  rowUser: { justifyContent: 'flex-end' },
  rowAssistant: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.lg,
  },
  bubbleUser: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: BORDER_RADIUS.sm,
  },
  bubbleAssistant: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bubbleEmergency: {
    backgroundColor: '#FEF2F2',
    borderColor: COLORS.danger,
  },
  text: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONT_FAMILY.base,
    lineHeight: 22,
  },
  bold: {
    fontFamily: FONT_FAMILY.bold,
    fontWeight: '700',
  },
});