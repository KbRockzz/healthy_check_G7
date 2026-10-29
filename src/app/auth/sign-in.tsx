/**
 * Màn hình Đăng nhập — đã tích hợp Auth Context
 */
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
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
      // Đăng nhập thành công - chuyển đến dashboard
      router.replace('/dashboard');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome back 👋</Text>
            <Text style={styles.subtitle}>Đăng nhập để tiếp tục hành trình sức khỏe</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={COLORS.textTertiary} style={{ marginRight: 8 }} />
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textTertiary} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter password"
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

            <TouchableOpacity style={styles.forgotPassword}>
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

          <View style={styles.footer}>
            <Text style={styles.footerText}>Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/sign-up')}>
              <Text style={styles.signUpLink}>Đăng ký ngay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40, justifyContent: 'space-between' },
  header: { marginBottom: 40 },
  title: { fontSize: FONT_SIZES['3xl'], fontWeight: 'bold', fontFamily: FONT_FAMILY.bold as string, color: COLORS.textPrimary },
  subtitle: { fontSize: FONT_SIZES.base, color: COLORS.textSecondary, fontFamily: FONT_FAMILY.base as string, marginTop: 8 },
  form: { marginBottom: 30 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: FONT_SIZES.sm, fontWeight: '600', fontFamily: FONT_FAMILY.semiBold as string, color: COLORS.textPrimary, marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, paddingHorizontal: 16, height: 52 },
  input: { flex: 1, fontSize: FONT_SIZES.base, color: COLORS.textPrimary, fontFamily: FONT_FAMILY.base as string },
  eyeIcon: { padding: 8 },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 24 },
  forgotPasswordText: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: '500' },
  button: { backgroundColor: COLORS.primary, height: 52, borderRadius: BORDER_RADIUS.full, alignItems: 'center', justifyContent: 'center', ...SHADOWS.md },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { fontSize: FONT_SIZES.base, fontWeight: '600', fontFamily: FONT_FAMILY.semiBold as string, color: COLORS.textInverse },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontFamily: FONT_FAMILY.base as string },
  signUpLink: { fontSize: FONT_SIZES.sm, fontWeight: 'bold', color: COLORS.primary },
});
