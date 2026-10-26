import { useState, useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';

// Giữ màn hình Splash khi đang tải tài nguyên
SplashScreen.preventAutoHideAsync();

export function useSplashScreen() {
  const [isSplashReady, setIsSplashReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Giả lập tải font/assets nếu cần
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn(e);
      } finally {
        setIsSplashReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  return { isSplashReady };
}
