/**
 * Font Provider — Load Roboto từ local assets/fonts
 * Áp dụng làm font mặc định toàn app
 */
import { createContext, useContext } from 'react';
import * as Font from 'expo-font';

interface FontsContextType {
  fontsLoaded: boolean;
}

const FontsContext = createContext<FontsContextType>({ fontsLoaded: false });
export function useFontsContext() { return useContext(FontsContext); }

const ROBOTO_FONTS = {
  'Roboto_400Regular': require('../../assets/fonts/Roboto-Regular.ttf'),
  'Roboto_700Bold': require('../../assets/fonts/Roboto-Bold.ttf'),
  'Roboto_500Medium': require('../../assets/fonts/Roboto-Medium.ttf'),
  'Roboto_600SemiBold': require('../../assets/fonts/Roboto-SemiBold.ttf'),
  'Roboto_300Light': require('../../assets/fonts/Roboto-Light.ttf'),
};

export function FontsProvider({ children, fontsLoaded }: { children: React.ReactNode; fontsLoaded: boolean }) {
  // fontsLoaded is determined by useSplashScreen; this provider just shares it
  return (
    <FontsContext.Provider value={{ fontsLoaded }}>
      {fontsLoaded ? children : null}
    </FontsContext.Provider>
  );
}

export const ROBOTO_FONT_MAP = ROBOTO_FONTS;
