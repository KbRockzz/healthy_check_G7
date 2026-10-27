import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, BORDER_RADIUS } from '@/theme';
import BottomTabBar from '@/components/bottom-tab-bar';

/**
 * Màn hình Thiết lập chia sẻ thông tin sức khỏe (Share Health Information Screen) — Mockup #2
 *
 * Màn hình 10/10: Cấu hình chia sẻ dữ liệu y tế, quản lý danh sách người được cấp quyền.
 */
export default function ShareScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Sharing</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <Ionicons name="heart-circle-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Keep your health in check</Text>
              <Text style={styles.cardDesc}>Keep loved ones informed about your condition.</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <Ionicons name="shield-checkmark-outline" size={24} color={COLORS.accent} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Protect your privacy</Text>
              <Text style={styles.cardDesc}>Share key conclusions. Stop anytime.</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <Ionicons name="notifications-outline" size={24} color="#3B82F6" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Notifications</Text>
              <Text style={styles.cardDesc}>Get notified of updates to shared dashboards.</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-outline" size={20} color={COLORS.textInverse} style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>Start sharing</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingButton}>
          <Ionicons name="settings-outline" size={20} color={COLORS.textPrimary} style={{ marginRight: 8 }} />
          <Text style={styles.settingButtonText}>Setting</Text>
        </TouchableOpacity>
      </View>

      <BottomTabBar currentRoute="/share" onTabPress={(route) => router.push(route as any)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: FONT_SIZES['3xl'],
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 30,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: COLORS.textInverse,
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
  },
  settingButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    height: 56,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingButtonText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
  },
});