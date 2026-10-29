/**
 * Root layout — Auth-aware navigation
 * - Chưa đăng nhập: Launch → Sign In / Sign Up
 * - Đã đăng nhập: Dashboard (vào thẳng)
 * - Onboarding chỉ hiển thị khi user bấm chỉnh sửa và profile chưa hoàn thiện
 */
import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/lib/hooks/use-auth';
import { useSplashScreen } from '@/lib/hooks/use-splash-screen';
import { useDeepLinking } from '@/lib/hooks/use-deep-linking';
import { ActivityIndicator, View } from 'react-native';
import { COLORS } from '@/theme';

function AuthWrapper() {
  const { isSplashReady } = useSplashScreen();
  const { session, profile } = useAuth();
  const router = useRouter();

  // Handle deep linking for auth callbacks
  useDeepLinking();

  // Redirect logic - chỉ chuyển hướng khi chưa đăng nhập
  useEffect(() => {
    if (!isSplashReady) return;

    if (!session) {
      // Chưa đăng nhập
      router.replace('/launch');
    }
    // Đã đăng nhập thì để vào dashboard mặc định (không强制 onboarding)
  }, [session, isSplashReady]);

  if (!isSplashReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {/* Auth flow */}
        <Stack.Screen name="launch" options={{ title: 'Launch' }} />
        <Stack.Screen name="auth/sign-in" options={{ title: 'Sign In' }} />
        <Stack.Screen name="auth/sign-up" options={{ title: 'Sign Up' }} />

        {/* Main app */}
        <Stack.Screen name="onboarding" options={{ title: 'Onboarding' }} />
        <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
        <Stack.Screen name="dashboard/steps" options={{ title: 'Steps' }} />
        <Stack.Screen name="dashboard/sleep" options={{ title: 'Sleep' }} />
        <Stack.Screen name="dashboard/nutrition" options={{ title: 'Nutrition' }} />
        <Stack.Screen name="dashboard/cycle" options={{ title: 'Cycle' }} />
        <Stack.Screen name="dashboard/water" options={{ title: 'Nước' }} />
        <Stack.Screen name="dashboard/heart-rate" options={{ title: 'Nhịp tim' }} />
        <Stack.Screen name="health-data" options={{ title: 'Health Data' }} />
        <Stack.Screen name="explore" options={{ title: 'Explore' }} />
        <Stack.Screen name="explore/[slug]" options={{ title: 'Bài viết' }} />
        <Stack.Screen name="share" options={{ title: 'Sharing' }} />
        <Stack.Screen name="profile" options={{ title: 'Profile' }} />
        <Stack.Screen name="settings/goals" options={{ title: 'Goals' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthWrapper />
    </AuthProvider>
  );
}
