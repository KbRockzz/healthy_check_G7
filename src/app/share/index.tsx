/**
 * Màn hình Chia sẻ - Quản lý chia sẻ dữ liệu sức khỏe
 * Tạo link chia sẻ và quản lý người được chia sẻ
 */
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS, FONT_FAMILY } from '@/theme';
import { useAuth } from '@/lib/hooks/use-auth';
import { supabase, SharingGrant } from '@/lib/supabase';

type GrantStatus = 'pending' | 'active' | 'revoked' | 'expired';

export default function ShareScreen() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [shares, setShares] = useState<SharingGrant[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!session) {
      router.replace('/auth/sign-in');
      return;
    }
    fetchShares();
  }, [session]);

  async function fetchShares() {
    if (!session) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('sharing_grants')
        .select('*')
        .eq('owner_id', session.user.id)
        .order('created_at', { ascending: false });
      if (data) setShares(data as SharingGrant[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateShare = async () => {
    if (!recipientEmail.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email người nhận');
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.rpc('create_share_link', {
        p_recipient_email: recipientEmail.trim(),
        p_recipient_name: recipientName.trim() || null,
        p_scopes: ['steps', 'sleep', 'nutrition', 'cycle', 'health_metrics'],
        p_validity_days: 30,
      });

      if (error) throw error;

      Alert.alert(
        'Đã tạo link chia sẻ! 🔗',
        `Link đã được gửi đến ${recipientEmail}. Người nhận sẽ nhận được thông báo.`,
        [{ text: 'OK' }]
      );

      setRecipientEmail('');
      setRecipientName('');
      fetchShares();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể tạo link chia sẻ');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (grantId: string) => {
    Alert.alert(
      'Thu hồi quyền',
      'Bạn có chắc muốn thu hồi quyền chia sẻ?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Thu hồi',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.rpc('revoke_share_link', { p_grant_id: grantId });
            if (error) {
              Alert.alert('Lỗi', error.message);
            } else {
              Alert.alert('Đã thu hồi', 'Người nhận không còn truy cập được dữ liệu của bạn.');
              fetchShares();
            }
          },
        },
      ]
    );
  };

  const getStatusText = (status: GrantStatus) => {
    switch (status) {
      case 'pending': return 'Đang chờ';
      case 'active': return 'Đang hoạt động';
      case 'revoked': return 'Đã thu hồi';
      case 'expired': return 'Đã hết hạn';
    }
  };

  const getStatusColor = (status: GrantStatus) => {
    switch (status) {
      case 'pending': return COLORS.warning;
      case 'active': return COLORS.success;
      case 'revoked': return COLORS.danger;
      case 'expired': return COLORS.textTertiary;
    }
  };

  if (!session) return null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Chia sẻ</Text>
          <TouchableOpacity onPress={() => router.push('/profile')}>
            <Ionicons name="person" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Intro Cards */}
        <View style={styles.infoCard}>
          <View style={styles.iconWrap}>
            <Ionicons name="share-social" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Chia sẻ dữ liệu sức khỏe</Text>
            <Text style={styles.infoDesc}>Cho phép người thân, bác sĩ truy cập dữ liệu sức khỏe của bạn một cách an toàn.</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.iconWrap}>
            <Ionicons name="shield-checkmark" size={24} color={COLORS.accent} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Bảo mật tuyệt đối</Text>
            <Text style={styles.infoDesc}>Mỗi link chỉ tồn tại 30 ngày và bạn có thể thu hồi bất cứ lúc nào.</Text>
          </View>
        </View>

        {/* Create Share Form */}
        <View style={styles.formSection}>
          <Text style={styles.formTitle}>Tạo link chia sẻ mới</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email người nhận</Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textTertiary} />
              <TextInput
                style={styles.input}
                placeholder="nhapemail@example.com"
                value={recipientEmail}
                onChangeText={setRecipientEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tên người nhận (tùy chọn)</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={20} color={COLORS.textTertiary} />
              <TextInput
                style={styles.input}
                placeholder="Nguyễn Văn A"
                value={recipientName}
                onChangeText={setRecipientName}
              />
            </View>
          </View>

          <View style={styles.scopesSection}>
            <Text style={styles.label}>Dữ liệu được chia sẻ:</Text>
            <View style={styles.scopesRow}>
              <View style={[styles.scopeBadge, { backgroundColor: COLORS.primary + '15' }]}>
                <Ionicons name="walk" size={14} color={COLORS.primary} />
                <Text style={[styles.scopeText, { color: COLORS.primary }]}>Bước chân</Text>
              </View>
              <View style={[styles.scopeBadge, { backgroundColor: '#8B5CF615' }]}>
                <Ionicons name="moon" size={14} color="#8B5CF6" />
                <Text style={[styles.scopeText, { color: '#8B5CF6' }]}>Giấc ngủ</Text>
              </View>
              <View style={[styles.scopeBadge, { backgroundColor: COLORS.warning + '15' }]}>
                <Ionicons name="restaurant" size={14} color={COLORS.warning} />
                <Text style={[styles.scopeText, { color: COLORS.warning }]}>Dinh dưỡng</Text>
              </View>
              <View style={[styles.scopeBadge, { backgroundColor: COLORS.accent + '15' }]}>
                <Ionicons name="calendar" size={14} color={COLORS.accent} />
                <Text style={[styles.scopeText, { color: COLORS.accent }]}>Chu kỳ</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.createBtn, creating && styles.createBtnDisabled]}
            onPress={handleCreateShare}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator color={COLORS.textInverse} />
            ) : (
              <>
                <Ionicons name="send" size={20} color={COLORS.textInverse} />
                <Text style={styles.createBtnText}>Gửi lời mời chia sẻ</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Existing Shares */}
        <View style={styles.listSection}>
          <Text style={styles.listTitle}>Danh sách chia sẻ</Text>
          {loading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : shares.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="share-outline" size={48} color={COLORS.textTertiary} />
              <Text style={styles.emptyText}>Chưa có chia sẻ nào</Text>
              <Text style={styles.emptySub}>Nhập email để tạo link chia sẻ</Text>
            </View>
          ) : (
            shares.map(grant => (
              <View key={grant.id} style={styles.grantItem}>
                <View style={styles.grantInfo}>
                  <View style={styles.grantAvatar}>
                    <Ionicons name="person" size={16} color={COLORS.textInverse} />
                  </View>
                  <View style={styles.grantDetails}>
                    <Text style={styles.grantName}>
                      {grant.recipient_name || grant.recipient_email}
                    </Text>
                    <Text style={styles.grantEmail}>{grant.recipient_email}</Text>
                  </View>
                </View>
                <View style={styles.grantActions}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(grant.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(grant.status) }]}>
                      {getStatusText(grant.status)}
                    </Text>
                  </View>
                  {grant.status === 'active' && (
                    <TouchableOpacity onPress={() => handleRevoke(grant.id)}>
                      <Ionicons name="close-circle" size={20} color={COLORS.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: { fontSize: FONT_SIZES['3xl'], fontWeight: 'bold', fontFamily: FONT_FAMILY.bold as string },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: FONT_SIZES.base, fontWeight: '600', fontFamily: FONT_FAMILY.semiBold as string, color: COLORS.textPrimary },
  infoDesc: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontFamily: FONT_FAMILY.base as string, marginTop: 4, lineHeight: 20 },
  formSection: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    ...SHADOWS.sm,
  },
  formTitle: { fontSize: FONT_SIZES.lg, fontWeight: 'bold', fontFamily: FONT_FAMILY.bold as string, marginBottom: 16 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: FONT_SIZES.sm, fontWeight: '600', fontFamily: FONT_FAMILY.semiBold as string, color: COLORS.textSecondary, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 14,
    height: 48,
  },
  input: { flex: 1, fontSize: FONT_SIZES.base, color: COLORS.textPrimary, fontFamily: FONT_FAMILY.base as string, marginLeft: 10 },
  scopesSection: { marginBottom: 16 },
  scopesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  scopeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
  },
  scopeText: { fontSize: FONT_SIZES.xs, fontWeight: '500' },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.full,
    marginTop: 8,
  },
  createBtnDisabled: { opacity: 0.7 },
  createBtnText: { color: COLORS.textInverse, fontWeight: '600', marginLeft: 8, fontSize: FONT_SIZES.base },
  listSection: { marginTop: 24, paddingHorizontal: 20 },
  listTitle: { fontSize: FONT_SIZES.lg, fontWeight: 'bold', fontFamily: FONT_FAMILY.bold as string, marginBottom: 12 },
  grantItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: 14,
    marginBottom: 8,
    ...SHADOWS.sm,
  },
  grantInfo: { flexDirection: 'row', alignItems: 'center' },
  grantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  grantDetails: { flex: 1 },
  grantName: { fontSize: FONT_SIZES.base, fontWeight: '600', fontFamily: FONT_FAMILY.semiBold as string, color: COLORS.textPrimary },
  grantEmail: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontFamily: FONT_FAMILY.base as string },
  grantActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  statusText: { fontSize: FONT_SIZES.xs, fontWeight: '600' },
  loader: { paddingVertical: 20, alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { fontSize: FONT_SIZES.base, fontWeight: '600', fontFamily: FONT_FAMILY.semiBold as string, color: COLORS.textPrimary, marginTop: 12 },
  emptySub: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontFamily: FONT_FAMILY.base as string, marginTop: 4 },
});
