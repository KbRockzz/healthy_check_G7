/**
 * Consent sheet lần đầu mở chat (§6.5): giải thích dữ liệu sức khỏe được gửi tới
 * Google (Gemini API). Cờ đồng ý lưu AsyncStorage, khoá theo user.id (Q5).
 * Banner "Chế độ thử nghiệm" bắt buộc vì đang dùng Gemini tầng miễn phí (Q7).
 */

import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FONT_SIZES, BORDER_RADIUS, FONT_FAMILY } from '../../theme';

const CONSENT_PREFIX = 'health_coach_consent_v1_'; // + user.id

export async function hasConsent(userId: string): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(CONSENT_PREFIX + userId);
    return v === 'granted';
  } catch {
    return false;
  }
}

export async function setConsent(userId: string, granted: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(CONSENT_PREFIX + userId, granted ? 'granted' : 'denied');
  } catch {
    /* best-effort */
  }
}

interface Props {
  visible: boolean;
  onAgree: () => void;
  onDecline: () => void;
}

export function ConsentSheet({ visible, onAgree, onDecline }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDecline}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Health Coach cần sự đồng ý của bạn</Text>

          <ScrollView style={styles.body} bounces={false}>
            <Text style={styles.p}>
              Khi bạn trò chuyện, các thông tin sức khỏe của bạn (bước chân, giấc ngủ,
              dinh dưỡng, nước uống, chu kỳ — nếu đã bật) sẽ được gửi tới{' '}
              <Text style={styles.strong}>Google (Gemini API)</Text> để tạo câu trả lời.
            </Text>
            <Text style={styles.p}>
              Tên, email và mã định danh của bạn KHÔNG được gửi đi. Lịch sử trò chuyện
              được lưu trên máy chủ và chỉ mình bạn xem được; bạn có thể xoá bất cứ lúc nào.
            </Text>
            <View style={styles.betaBox}>
              <Text style={styles.betaTitle}>Chế độ thử nghiệm</Text>
              <Text style={styles.betaText}>
                Trợ lý đang chạy ở tầng miễn phí. Vui lòng không nhập thông tin cá nhân
                nhạy cảm (số điện thoại, địa chỉ, mã y tế...).
              </Text>
            </View>
            <Text style={styles.p}>
              Câu trả lời chỉ mang tính tham khảo, không thay thế tư vấn của bác sĩ.
            </Text>
          </ScrollView>

          <TouchableOpacity style={styles.agreeBtn} onPress={onAgree} activeOpacity={0.85}>
            <Text style={styles.agreeText}>Tôi đồng ý</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.declineBtn} onPress={onDecline} activeOpacity={0.7}>
            <Text style={styles.declineText}>Chưa, có thể sau</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: 20,
    paddingBottom: 34,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONT_FAMILY.bold,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  body: { maxHeight: 320, marginBottom: 12 },
  p: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONT_FAMILY.base,
    color: COLORS.textSecondary,
    lineHeight: 21,
    marginBottom: 10,
  },
  strong: { fontFamily: FONT_FAMILY.bold, color: COLORS.textPrimary },
  betaBox: {
    backgroundColor: '#FFFBEB',
    borderColor: COLORS.warning,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: 12,
    marginBottom: 10,
  },
  betaTitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONT_FAMILY.bold,
    color: '#92400E',
    marginBottom: 4,
  },
  betaText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONT_FAMILY.base,
    color: '#92400E',
    lineHeight: 18,
  },
  agreeBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  agreeText: {
    color: COLORS.textInverse,
    fontSize: FONT_SIZES.base,
    fontFamily: FONT_FAMILY.bold,
  },
  declineBtn: { paddingVertical: 12, alignItems: 'center' },
  declineText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    fontFamily: FONT_FAMILY.base,
  },
});