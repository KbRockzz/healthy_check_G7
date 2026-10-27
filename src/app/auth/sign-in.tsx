import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '@/theme';
import { supabase } from '@/lib/supabase';

/**
 * Màn hình Đăng nhập (Sign In Screen) — Mockup #1
 *
 * Màn hình 2/10: Xác thực danh tính bằng Email/Mật khẩu + Đăng nhập mạng xã hội
 */
export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Đăng nhập bằng Email/Mật khẩu
  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        Alert.alert('Đăng nhập thất bại', error.message || 'Email hoặc mật khẩu không chính xác.');
        return;
      }

      if (data.session) {
        // Chuyển sang màn hình Home Dashboard
        router.replace('/dashboard');
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Có lỗi xảy ra, vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  // Đăng nhập bằng bên thứ 3 (OAuth)
  const handleSocialSignIn = async (provider: 'google' | 'facebook' | 'apple') => {
    Alert.alert('Thông báo', `Tính năng đăng nhập qua ${provider.toUpperCase()} sẽ được kích hoạt trên môi trường build thực tế.`);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* Tiêu đề chào mừng */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome back 👋</Text>
          </View>

          {/* Form nhập liệu */}
          <View style={styles.form}>
            {/* Trường Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter email"
                  placeholderTextColor={COLORS.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Trường Mật khẩu */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Enter password"
                  placeholderTextColor={COLORS.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Quên mật khẩu */}
            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => Alert.alert('Khôi phục mật khẩu', 'Vui lòng kiểm tra email hướng dẫn đặt lại mật khẩu.')}
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Nút Sign In */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignIn}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.textInverse} />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Đăng nhập qua mạng xã hội */}
          <View style={styles.socialSection}>
            <Text style={styles.socialText}>OR LOG IN WITH</Text>
            <View style={styles.socialButtons}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleSocialSignIn('google')}
              >
                <Ionicons name="logo-google" size={24} color="#EA4335" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleSocialSignIn('facebook')}
              >
                <Ionicons name="logo-facebook" size={24} color="#1877F2" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleSocialSignIn('apple')}
              >
                <Ionicons name="logo-apple" size={24} color="#000000" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Chuyển sang Đăng ký */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/sign-up')}>
              <Text style={styles.signUpLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: FONT_SIZES['3xl'],
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  form: {
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 16,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
  },
  eyeIcon: {
    padding: 8,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  button: {
    backgroundColor: COLORS.primary,
    height: 52,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textInverse,
  },
  socialSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  socialText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 20,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 20,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  signUpLink: {
    fontSize: FONT_SIZES.sm,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
});
