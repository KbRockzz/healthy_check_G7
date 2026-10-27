/**
 * Root layout — Auth-aware navigation
 * - Chưa đăng nhập: Launch → Sign In / Sign Up
 * - Đã đăng nhập: Dashboard → các màn hình con
 */
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/lib/hooks/use-auth';
import { useSplashScreen } from '@/lib/hooks/use-splash-screen';

function AuthWrapper() {
  const { isSplashReady } = useSplashScreen();
  const { session } = useAuth();

  if (!isSplashReady) return null;

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
        <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
        <Stack.Screen name="dashboard/steps" options={{ title: 'Steps' }} />
        <Stack.Screen name="dashboard/sleep" options={{ title: 'Sleep' }} />
        <Stack.Screen name="dashboard/nutrition" options={{ title: 'Nutrition' }} />
        <Stack.Screen name="dashboard/cycle" options={{ title: 'Cycle' }} />
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
