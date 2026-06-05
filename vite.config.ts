/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? '/workout-tracker/' : '/',
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 5173,
    strictPort: !!process.env.PORT,
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
              return 'vendor-charts';
            }
            return 'vendor-core';
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      'tests/e2e/**',
      'tests/visual/**',
      'tests/firestore.rules.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        'src/services/firebase.ts', // firebase.ts: Direct Firebase SDK calls. Fully mocked in tests to maintain local network isolation.
        'src/components/WorkoutSession.tsx', // WorkoutSession.tsx: Complex wizard view. Verified via E2E/visual smoke tests.
        'src/contexts/WorkoutContext.tsx', // WorkoutContext.tsx: Contains global state and async sync effects. Core logic is covered, but full integration relies on E2E.
        'src/components/ui/index.ts', // ui/index.ts: Barrel export file containing no logic.
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
