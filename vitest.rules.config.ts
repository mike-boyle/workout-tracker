import { defineConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default defineConfig({
  ...viteConfig,
  test: {
    ...viteConfig.test,
    setupFiles: [], // Disable MSW and other global mocks for rules tests
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      'tests/e2e/**',
      'tests/visual/**',
    ],
  },
});
