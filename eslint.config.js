const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    rules: {
      // Keep these existing effect-driven loading patterns visible without
      // blocking lint until their owners can migrate them without UX changes.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    files: ['src/components/splash/AtrioSplash.tsx'],
    rules: {
      // React Native Animated.Value is intentionally read to build animation styles.
      'react-hooks/refs': 'warn',
    },
  },
  {
    files: ['supabase/functions/**/*.ts', 'tests/delivery/**/*.mjs'],
    rules: {
      // Deno npm: specifiers and test dependencies in the nested package are not
      // resolvable by ESLint's Node-based import resolver.
      'import/no-unresolved': 'off',
    },
  },
]);
