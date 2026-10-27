import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '@/theme';

/**
 * Màn hình Khởi động và Giới thiệu (Launch Screen) — Mockup #3
 *
 * Màn hình 1/10: Định vị thương hiệu, truyền tải thông điệp
 * "Let's start your health journey today with us!"
 */
export default function LaunchScreen() {
  const router = useRouter();

  const handleContinue = () => {
    // Điều hướng sang màn hình Đăng nhập
    router.push('/auth/sign-in');
  };

  return (
    <View style={styles.container}>
      {/* Ảnh banner người phụ nữ đang chạy bộ */}
      <View style={styles.imageContainer}>
        <Image
          source={require('../../assets/images/runner.png')}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.overlayCurve} />
      </View>

      {/* Vùng thông điệp bên dưới */}
      <View style={styles.contentContainer}>
        {/* Logo ứng dụng */}
        <View style={styles.logoBadge}>
          <Image
            source={require('../../assets/icons/logo-icon.png')}
            style={styles.logoIcon}
          />
        </View>

        {/* Tiêu đề chính */}
        <Text style={styles.title}>
          Let's start your{'\n'}
          health journey{'\n'}
          today with us!
        </Text>

        {/* Nút Continue */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  imageContainer: {
    height: '55%',
    width: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlayCurve: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...SHADOWS.md,
  },
  logoIcon: {
    width: 32,
    height: 32,
    tintColor: COLORS.primary,
  },
  title: {
    fontSize: FONT_SIZES['3xl'],
    fontWeight: 'bold',
    color: COLORS.textInverse,
    lineHeight: 40,
  },
  button: {
    width: '100%',
    backgroundColor: COLORS.bg,
    paddingVertical: 18,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  buttonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});
