/**
 * Màn hình Đăng ký — đã tích hợp Auth Context & Session Handling
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

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp, signIn } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSignUp = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      Alert.alert('Thông báo', 'Vui lòng điền đầy đủ thông tin.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Thông báo', 'Mật khẩu phải chứa ít nhất 6 ký tự.');
      return;
    }
    setBusy(true);
    const { error, session } = await signUp(email.trim(), password, fullName.trim());
    if (error) {
      setBusy(false);
      Alert.alert('Đăng ký thất bại', error.message || 'Không thể tạo tài khoản');
      return;
    }

    if (session) {
      setBusy(false);
      router.replace('/onboarding');
    } else {
      // Tự động đăng nhập
      const { error: signInErr } = await signIn(email.trim(), password);
      setBusy(false);
      if (!signInErr) {
        router.replace('/onboarding');
      } else {
        Alert.alert(
          'Đăng ký thành công! 🎉',
          'Tài khoản của bạn đã được tạo thành công. Vui lòng đăng nhập để bắt đầu.',
          [{ text: 'Đăng nhập ngay', onPress: () => router.replace('/auth/sign-in') }]
        );
      }
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Create Account ✨</Text>
            <Text style={styles.subtitle}>Bắt đầu hành trình chăm sóc sức khỏe ngay hôm nay</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Họ và tên</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color={COLORS.textTertiary} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập họ tên"
                  placeholderTextColor={COLORS.textTertiary}
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={COLORS.textTertiary} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập email"
                  placeholderTextColor={COLORS.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mật khẩu</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textTertiary} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
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

            <TouchableOpacity
              style={[styles.button, busy && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={busy}
              activeOpacity={0.8}
            >
              {busy ? <ActivityIndicator color={COLORS.textInverse} /> : <Text style={styles.buttonText}>Đăng ký</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Đã có tài khoản? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/sign-in')}>
              <Text style={styles.signInLink}>Đăng nhập</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, backgroundColor: COLORS.bg },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  backButton: { marginBottom: 16, width: 40, height: 40, justifyContent: 'center' },
  header: { marginBottom: 28 },
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
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    ...SHADOWS.md,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: 'bold',
    color: COLORS.textInverse,
    fontFamily: FONT_FAMILY.bold as string,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontFamily: FONT_FAMILY.base as string,
  },
  signInLink: {
    fontSize: FONT_SIZES.sm,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontFamily: FONT_FAMILY.bold as string,
  },
});
