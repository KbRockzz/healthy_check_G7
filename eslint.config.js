// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // supabase/functions/* là code Deno (Edge Function) — không nằm trong
    // toolchain React Native; lint bằng deno lint khi deploy, bỏ qua eslint.
    ignores: ['dist/*', 'supabase/functions/**'],
  },
]);
