/**
 * Root layout — Auth-aware navigation & Protection
 */
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, I18nManager } from 'react-native';
import { COLORS } from '@/theme';
import { AuthProvider, useAuth } from '@/lib/hooks/use-auth';
import { useSplashScreen } from '@/lib/hooks/use-splash-screen';
import { useDeepLinking } from '@/lib/hooks/use-deep-linking';
import { ChatFAB } from '@/components/chat/chat-fab';

// §Q8: App là tiếng Việt → ép toàn bộ giao diện sang LTR. Một số thiết bị có locale
// RTL (ví dụ fa/ar) sẽ tự động flip layout; force LTR ở đây để text không bị mirror.
I18nManager.forceRTL(false);
I18nManager.allowRTL(false);

// Content component - uses hooks inside AuthProvider
function LayoutContent() {
  const router = useRouter();
  const segments = useSegments();
  const { session, loading: authLoading } = useAuth();
  const { isSplashReady } = useSplashScreen();
  useDeepLinking();

  useEffect(() => {
    // Chỉ điều hướng khi font và auth đã sẵn sàng
    if (!isSplashReady || authLoading) return;

    const firstSegment = segments[0] || '';
    const inAuthGroup = firstSegment === 'auth' || firstSegment === 'launch';

    if (!session && !inAuthGroup) {
      // Người dùng chưa đăng nhập truy cập trang yêu cầu đăng nhập -> điều hướng về launch
      router.replace('/launch');
    } else if (session && inAuthGroup) {
      // Người dùng đã có session mà đang ở trang auth/launch -> vào thẳng dashboard
      router.replace('/dashboard');
    }
  }, [session, authLoading, isSplashReady, segments, router]);

  if (!isSplashReady || authLoading) {
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
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="launch" options={{ title: 'Bắt đầu' }} />
        <Stack.Screen name="auth/sign-in" options={{ title: 'Đăng nhập' }} />
        <Stack.Screen name="auth/sign-up" options={{ title: 'Đăng ký' }} />

        {/* Main app */}
        <Stack.Screen name="onboarding" options={{ title: 'Thiết lập hồ sơ' }} />
        <Stack.Screen name="dashboard" options={{ title: 'Trang chủ' }} />
        <Stack.Screen name="dashboard/steps" options={{ title: 'Đếm bước chân' }} />
        <Stack.Screen name="dashboard/sleep" options={{ title: 'Giấc ngủ' }} />
        <Stack.Screen name="dashboard/nutrition" options={{ title: 'Dinh dưỡng' }} />
        <Stack.Screen name="dashboard/cycle" options={{ title: 'Chu kỳ' }} />
        <Stack.Screen name="dashboard/water" options={{ title: 'Uống nước' }} />
        <Stack.Screen name="dashboard/shared" options={{ title: 'Chia sẻ' }} />
        <Stack.Screen name="health-data" options={{ title: 'Dữ liệu sức khỏe' }} />
        <Stack.Screen name="explore" options={{ title: 'Khám phá' }} />
        <Stack.Screen
          name="explore/[slug]"
          options={{
            title: 'Bài viết',
            // Cho phép thoát bằng gesture (swipe từ trái sang phải) ngay cả khi
            // nút back custom không nhận được touch (phòng trường hợp overlay che phủ).
            gestureEnabled: true,
            gestureDirection: 'horizontal',
          }}
        />
        <Stack.Screen name="share" options={{ title: 'Chia sẻ dữ liệu' }} />
        <Stack.Screen name="profile" options={{ title: 'Hồ sơ cá nhân' }} />
        <Stack.Screen name="settings/goals" options={{ title: 'Mục tiêu sức khỏe' }} />
        <Stack.Screen name="chat" options={{ title: 'Trợ lý sức khỏe', headerShown: false }} />
      </Stack>
      {/* Floating Action Button — Health Coach (§6.3) */}
      <ChatFAB />
    </>
  );
}

// RootLayout wraps with AuthProvider
export default function RootLayout() {
  return (
    <AuthProvider>
      <LayoutContent />
    </AuthProvider>
  );
}
