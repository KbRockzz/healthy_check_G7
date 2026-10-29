/**
 * Root layout — Auth-aware navigation
 */
import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/lib/hooks/use-auth';
import { useSplashScreen } from '@/lib/hooks/use-splash-screen';
import { useDeepLinking } from '@/lib/hooks/use-deep-linking';
import { ActivityIndicator, View } from 'react-native';
import { COLORS } from '@/theme';
import { Roboto_400Regular, Roboto_700Bold, Roboto_500Medium, Roboto_600SemiBold } from '@expo-google-fonts/roboto';

export default function RootLayout() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const { isSplashReady } = useSplashScreen();
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load fonts when available
    const timer = setTimeout(() => {
      setFontsLoaded(true);
      setLoading(false);
    }, 1000); // Fallback timeout

    return () => clearTimeout(timer);
  }, []);

  // Redirect logic
  useEffect(() => {
    if (!isSplashReady || !fontsLoaded || loading) return;
    if (!session) {
      router.replace('/launch');
    }
  }, [session, isSplashReady, fontsLoaded, loading]);

  if (loading || !fontsLoaded || !isSplashReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}
