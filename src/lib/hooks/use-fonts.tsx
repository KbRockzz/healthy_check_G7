/**
 * Font Provider — Load Roboto từ assets/fonts, áp dụng làm font mặc định toàn app
 */
import { useState, useEffect, createContext, useContext } from 'react';
import * as Font from 'expo-font';

const ROBOTO_FAMILIES = ['Roboto-Regular', 'Roboto-Bold', 'Roboto-Medium', 'Roboto-SemiBold', 'Roboto-Light'];

interface FontsContextType {
  fontsLoaded: boolean;
}

const FontsContext = createContext<FontsContextType>({ fontsLoaded: false });
export function useFonts() { return useContext(FontsContext); }

export function FontsProvider({ children }: { children: React.ReactNode }) {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      await Font.loadAsync({
        'Roboto-Regular':  require('../../../assets/fonts/Roboto-Regular.ttf'),
        'Roboto-Bold':    require('../../../assets/fonts/Roboto-Bold.ttf'),
        'Roboto-Medium':  require('../../../assets/fonts/Roboto-Medium.ttf'),
        'Roboto-SemiBold': require('../../../assets/fonts/Roboto-SemiBold.ttf'),
        'Roboto-Light':   require('../../../assets/fonts/Roboto-Light.ttf'),
      }).finally(() => setFontsLoaded(true));
    }
    load();
  }, []);

  return (
    <FontsContext.Provider value={{ fontsLoaded }}>
      {fontsLoaded ? children : null}
    </FontsContext.Provider>
  );
}
