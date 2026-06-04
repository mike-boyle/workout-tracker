import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

export default defineConfig({
  ...baseConfig,
  testDir: './tests/visual',
  // Visual tests might have small subpixel or layout rendering differences,
  // we can specify a minor threshold/tolerance for screenshot comparisons.
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    },
  },
});
