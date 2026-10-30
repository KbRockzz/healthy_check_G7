/**
 * Root layout — Auth-aware navigation
 */
import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { COLORS } from '@/theme';
import { AuthProvider, useAuth } from '@/lib/hooks/use-auth';
import { useSplashScreen } from '@/lib/hooks/use-splash-screen';
import { useDeepLinking } from '@/lib/hooks/use-deep-linking';

// Content component - uses hooks inside AuthProvider
function LayoutContent() {
  const router = useRouter();
  const { session } = useAuth();
  const { isSplashReady } = useSplashScreen();
  useDeepLinking();

  useEffect(() => {
    if (!isSplashReady) return;
    if (!session) {
      router.replace('/launch');
    }
  }, [session, isSplashReady, router]);

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
        <Stack.Screen name="dashboard/water" options={{ title: 'Uống nước' }} />
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

// RootLayout just wraps with AuthProvider
export default function RootLayout() {
  return (
    <AuthProvider>
      <LayoutContent />
    </AuthProvider>
  );
}
