import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSplashScreen } from '@/src/lib/hooks/use-splash-screen';

/**
 * Root layout — chứa Stack navigation và StatusBar
 *
 * Cấu trúc routes:
 *  - /                    → Launch/Onboarding (màn hình đầu tiên)
 *  - /auth/sign-in        → Đăng nhập
 *  - /dashboard           → Overview sức khỏe
 *  - /dashboard/steps     → Step Tracker chi tiết
 *  - /dashboard/sleep     → Sleep Tracker chi tiết
 *  - /dashboard/nutrition → Nutrition Tracker
 *  - /dashboard/cycle     → Cycle Tracker
 *  - /health-data         → All Health Data
 *  - /explore             → Khám phá bài viết y tế
 *  - /share               → Chia sẻ thông tin sức khỏe
 *  - /profile             → Hồ sơ cá nhân
 */
export default function RootLayout() {
  const { isSplashReady } = useSplashScreen();

  if (!isSplashReady) {
    return null;
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
        {/* Auth screens */}
        <Stack.Screen name="launch" options={{ title: 'Launch Screen' }} />
        <Stack.Screen name="auth/sign-in" options={{ title: 'Đăng nhập' }} />
        <Stack.Screen name="auth/sign-up" options={{ title: 'Đăng ký' }} />

        {/* Main app */}
        <Stack.Screen name="dashboard" options={{ title: 'Tổng quan' }} />
        <Stack.Screen name="dashboard/steps" options={{ title: 'Bước chân' }} />
        <Stack.Screen name="dashboard/sleep" options={{ title: 'Giấc ngủ' }} />
        <Stack.Screen name="dashboard/nutrition" options={{ title: 'Dinh dưỡng' }} />
        <Stack.Screen name="dashboard/cycle" options={{ title: 'Chu kỳ' }} />
        <Stack.Screen name="health-data" options={{ title: 'Dữ liệu sức khỏe' }} />
        <Stack.Screen name="explore" options={{ title: 'Khám phá' }} />
        <Stack.Screen name="explore/[slug]" options={{ title: 'Bài viết' }} />
        <Stack.Screen name="share" options={{ title: 'Chia sẻ' }} />
        <Stack.Screen name="profile" options={{ title: 'Hồ sơ' }} />
      </Stack>
    </>
  );
}
