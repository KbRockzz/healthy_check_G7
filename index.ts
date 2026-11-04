// §Q8: App là tiếng Việt → ép toàn bộ giao diện sang LTR. Một số thiết bị có locale
// RTL (ví dụ fa/ar) sẽ tự động flip layout; force LTR ở đây để text không bị mirror.
// MUST be first line — runs before any framework code loads.
import { I18nManager } from 'react-native';
I18nManager.forceRTL(false);
I18nManager.allowRTL(false);

// Entry point for Expo Router
import 'expo-router/entry';