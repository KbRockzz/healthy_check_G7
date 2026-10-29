/**
 * Font Provider — Load Roboto từ @expo-google-fonts/roboto
 * Áp dụng làm font mặc định toàn app
 */
import { useState, useEffect, createContext, useContext } from 'react';
import { useFonts } from '@expo-google-fonts/roboto/useFonts';
import {
  Roboto_400Regular,
  Roboto_700Bold,
  Roboto_500Medium,
  Roboto_600SemiBold,
  Roboto_300Light,
} from '@expo-google-fonts/roboto';

interface FontsContextType {
  fontsLoaded: boolean;
}

const FontsContext = createContext<FontsContextType>({ fontsLoaded: false });
export function useFontsContext() { return useContext(FontsContext); }

export function FontsProvider({ children }: { children: React.ReactNode }) {
  const [fontsLoaded] = useFonts({
    Roboto_400Regular,
    Roboto_700Bold,
    Roboto_500Medium,
    Roboto_600SemiBold,
    Roboto_300Light,
  });

  return (
    <FontsContext.Provider value={{ fontsLoaded }}>
      {fontsLoaded ? children : null}
    </FontsContext.Provider>
  );
}
