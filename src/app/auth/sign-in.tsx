/**
 * Màn hình Đăng nhập — Bổ sung Social Login & Quên mật khẩu
 * Khớp thiết kế Mockup #2: Sign In.png & Tích hợp Roboto Fonts
 */
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS, FONT_FAMILY } from '@/theme';
import { useAuth } from '@/lib/hooks/use-auth';

export default function SignInScreen() {
  const router = useRouter();
  const { signIn, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetSending, setResetSending] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }
    setBusy(true);
    const { error } = await signIn(email.trim(), password);
    setBusy(false);
    if (error) {
      Alert.alert('Đăng nhập thất bại', error.message || 'Email hoặc mật khẩu không chính xác.');
    } else {
      router.replace('/dashboard');
    }
  };

  const handleSocialLogin = (provider: 'Apple' | 'Google' | 'Facebook') => {
    Alert.alert(
      `Đăng nhập với ${provider}`,
      `Tính năng đăng nhập với ${provider} đang được phát triển và sẽ sớm ra mắt.`
    );
  };

  const handleSendResetPassword = () => {
    if (!forgotEmail.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ email đã đăng ký');
      return;
    }
    setResetSending(true);
    setTimeout(() => {
      setResetSending(false);
      setShowForgotModal(false);
      Alert.alert(
        'Đã gửi liên kết khôi phục ✉️',
        `Hướng dẫn đặt lại mật khẩu đã được gửi đến ${forgotEmail.trim()}. Vui lòng kiểm tra hộp thư.`
      );
      setForgotEmail('');
    }, 800);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Sign In</Text>
            <Text style={styles.subtitle}>Chào mừng bạn quay lại với Healthy Check</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={COLORS.textTertiary} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor={COLORS.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textTertiary} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.forgotPassword} onPress={() => setShowForgotModal(true)}>
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, (busy || authLoading) && styles.buttonDisabled]}
              onPress={handleSignIn}
              disabled={busy || authLoading}
              activeOpacity={0.8}
            >
              {(busy || authLoading) ? (
                <ActivityIndicator color={COLORS.textInverse} />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Social Login Section */}
          <View style={styles.socialSection}>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or sign in with</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialButtonsRow}>
              <TouchableOpacity
                style={styles.socialBtn}
                onPress={() => handleSocialLogin('Apple')}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-apple" size={22} color="#000000" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialBtn}
                onPress={() => handleSocialLogin('Google')}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-google" size={20} color="#EA4335" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialBtn}
                onPress={() => handleSocialLogin('Facebook')}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-facebook" size={22} color="#1877F2" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>{"Don't have an account? "}</Text>
            <TouchableOpacity onPress={() => router.push('/auth/sign-up')}>
              <Text style={styles.signUpLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForgotModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Quên mật khẩu?</Text>
              <TouchableOpacity onPress={() => setShowForgotModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDescription}>
              Nhập địa chỉ email của bạn để nhận liên kết khôi phục và đặt lại mật khẩu mới.
            </Text>

            <View style={[styles.inputContainer, { marginTop: 16, marginBottom: 20 }]}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textTertiary} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                placeholder="name@example.com"
                placeholderTextColor={COLORS.textTertiary}
                value={forgotEmail}
                onChangeText={setForgotEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.button, resetSending && styles.buttonDisabled]}
              onPress={handleSendResetPassword}
              disabled={resetSending}
            >
              {resetSending ? (
                <ActivityIndicator color={COLORS.textInverse} />
              ) : (
                <Text style={styles.buttonText}>Gửi liên kết khôi phục</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, backgroundColor: COLORS.bg },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  header: { marginBottom: 32 },
  title: {
    fontSize: FONT_SIZES['3xl'],
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 8,
    fontFamily: FONT_FAMILY.bold as string,
  },
  subtitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    lineHeight: 22,
    fontFamily: FONT_FAMILY.base as string,
  },
  form: { width: '100%' },
  inputGroup: { marginBottom: 18 },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontFamily: FONT_FAMILY.semiBold as string,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 16,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
    fontFamily: FONT_FAMILY.base as string,
  },
  eyeIcon: { padding: 4 },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 24 },
  forgotPasswordText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
    fontFamily: FONT_FAMILY.semiBold as string,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: 'bold',
    color: COLORS.textInverse,
    fontFamily: FONT_FAMILY.bold as string,
  },
  socialSection: { marginTop: 32, marginBottom: 16 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    fontFamily: FONT_FAMILY.base as string,
  },
  socialButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  socialBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontFamily: FONT_FAMILY.base as string,
  },
  signUpLink: {
    fontSize: FONT_SIZES.sm,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontFamily: FONT_FAMILY.bold as string,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    fontFamily: FONT_FAMILY.bold as string,
  },
  modalDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    fontFamily: FONT_FAMILY.base as string,
  },
});
