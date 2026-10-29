import { useState, useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';

// Giữ màn hình Splash khi đang tải tài nguyên
SplashScreen.preventAutoHideAsync();

const ROBOTO_FONTS = {
  'Roboto_400Regular': require('../../assets/fonts/Roboto-Regular.ttf'),
  'Roboto_700Bold': require('../../assets/fonts/Roboto-Bold.ttf'),
  'Roboto_500Medium': require('../../assets/fonts/Roboto-Medium.ttf'),
  'Roboto_600SemiBold': require('../../assets/fonts/Roboto-SemiBold.ttf'),
  'Roboto_300Light': require('../../assets/fonts/Roboto-Light.ttf'),
};

export function useSplashScreen() {
  const [isSplashReady, setIsSplashReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync(ROBOTO_FONTS);
      } catch (e) {
        console.warn('Failed to load fonts:', e);
      } finally {
        setIsSplashReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  return { isSplashReady };
}
