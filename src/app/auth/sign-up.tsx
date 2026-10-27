/**
 * Màn hình Đăng ký — đã tích hợp Auth Context
 */
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '@/theme';
import { useAuth } from '@/lib/hooks/use-auth';

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
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
    const { error } = await signUp(email.trim(), password, fullName.trim());
    setBusy(false);
    if (error) {
      Alert.alert('Đăng ký thất bại', error.message);
    } else {
      Alert.alert(
        'Đăng ký thành công 🎉',
        'Vui lòng kiểm tra email để xác nhận tài khoản.',
        [{ text: 'OK', onPress: () => router.replace('/auth/sign-in') }]
      );
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
                <TextInput style={styles.input} placeholder="Nhập họ tên" placeholderTextColor={COLORS.textTertiary} value={fullName} onChangeText={setFullName} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={COLORS.textTertiary} style={{ marginRight: 8 }} />
                <TextInput style={styles.input} placeholder="Nhập email" placeholderTextColor={COLORS.textTertiary} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mật khẩu</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textTertiary} style={{ marginRight: 8 }} />
                <TextInput style={styles.input} placeholder="Nhập mật khẩu" placeholderTextColor={COLORS.textTertiary} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={[styles.button, busy && styles.buttonDisabled]} onPress={handleSignUp} disabled={busy} activeOpacity={0.8}>
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
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40, justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  header: { marginBottom: 30 },
  title: { fontSize: FONT_SIZES['3xl'], fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  form: { marginBottom: 30 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, paddingHorizontal: 16, height: 52 },
  input: { flex: 1, fontSize: FONT_SIZES.base, color: COLORS.textPrimary },
  eyeIcon: { padding: 8 },
  button: { backgroundColor: COLORS.primary, height: 52, borderRadius: BORDER_RADIUS.full, alignItems: 'center', justifyContent: 'center', marginTop: 10, ...SHADOWS.md },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { fontSize: FONT_SIZES.base, fontWeight: '600', color: COLORS.textInverse },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  signInLink: { fontSize: FONT_SIZES.sm, fontWeight: 'bold', color: COLORS.primary },
});
