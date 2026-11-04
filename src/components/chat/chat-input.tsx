/**
 * Ô nhập chat + nút gửi/dừng. Hỗ trợ multiline, max 2000 ký tự (khớp validate server).
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, BORDER_RADIUS, FONT_FAMILY } from '../../theme';

const MAX_LEN = 2000;

interface Props {
  onSend: (text: string) => void;
  onStop: () => void;
  streaming: boolean;
  disabled?: boolean;
  prefill?: string;
}

export function ChatInput({ onSend, onStop, streaming, disabled, prefill }: Props) {
  const [text, setText] = useState(prefill ?? '');

  const canSend = text.trim().length > 0 && !streaming && !disabled;

  const handleSend = () => {
    if (!canSend) return;
    const value = text.trim();
    setText('');
    Keyboard.dismiss();
    onSend(value);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.inputPill}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={(t) => setText(t.slice(0, MAX_LEN))}
          placeholder="Nhập câu hỏi sức khỏe..."
          placeholderTextColor={COLORS.textTertiary}
          multiline
          maxLength={MAX_LEN}
          onKeyPress={(e: any) => {
            // Trên Web: nhấn Enter (không kèm Shift) để gửi tin nhắn ngay lập tức
            if (Platform.OS === 'web' && e.nativeEvent?.key === 'Enter' && !e.nativeEvent?.shiftKey) {
              e.preventDefault?.();
              handleSend();
            }
          }}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          editable={!disabled}
          accessibilityLabel="Nhập tin nhắn"
        />
      </View>
      {streaming ? (
        <TouchableOpacity
          style={[styles.btn, styles.stopBtn]}
          onPress={onStop}
          accessibilityRole="button"
          accessibilityLabel="Dừng"
        >
          <Ionicons name="stop" size={20} color={COLORS.textInverse} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.btn, canSend ? styles.sendBtn : styles.sendDisabled]}
          onPress={handleSend}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Gửi"
        >
          <Ionicons
            name="send"
            size={20}
            color={canSend ? COLORS.textInverse : COLORS.disabled}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  inputPill: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  input: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONT_FAMILY.base,
    color: COLORS.textPrimary,
    lineHeight: 20,
    paddingTop: 0,
    paddingBottom: 0,
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
  },
  sendDisabled: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stopBtn: {
    backgroundColor: COLORS.danger,
  },
});
