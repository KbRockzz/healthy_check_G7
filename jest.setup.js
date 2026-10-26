// Jest setup — polyfill các API của React Native không có trong Node.js
import '@testing-library/jest-native/extend-expect';

// Polyfill TextEncoder / TextDecoder (cần cho @supabase/supabase-js)
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock expo-router
jest.mock('expo-router', () => require('expo-router/build/query-string'));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  platformConfig: { isDevice: true },
  default: {
    manifest: {
      slug: 'healthy-check-g7',
      version: '0.1.0',
      extra: {},
      updates: { url: '' },
    },
    env: {},
  },
}));

// Mock expo-linking
jest.mock('expo-linking', () => ({
  createURL: (path) => `https://healthy-check.app/${path}`,
  buildURL: (path) => `exp://healthy-check.app/${path}`,
}));

// Suppress console.error trong test để giảm noise
const originalConsoleError = console.error;
console.error = (...args) => {
  // Bỏ qua lỗi react-native-reanimated trong test (đã biết là ổn)
  if (
    typeof args[0] === 'string' &&
    args[0].includes?.('Animated.Value')
  ) {
    return;
  }
  originalConsoleError(...args);
};
