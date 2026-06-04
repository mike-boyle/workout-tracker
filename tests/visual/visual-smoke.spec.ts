import { test, expect } from '@playwright/test';
import { setupStrictNetworkIsolation } from '../e2e/network-isolation';

test.describe('Visual Smoke Tests', () => {
  setupStrictNetworkIsolation();

  test.beforeEach(async ({ page }) => {
    // Navigate to local site
    await page.goto('/');

    // Clear localStorage to ensure clean state
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    // Wait for the app to finish loading and loader to disappear
    await page.locator('.logo-section').waitFor({ state: 'visible' });
  });

  test('dashboard-view', async ({ page }) => {
    // Take snapshot of the dashboard layout
    await expect(page).toHaveScreenshot('dashboard-view.png');
  });

  test('settings-panel-view', async ({ page }) => {
    // Open settings panel
    const settingsBtn = page.getByRole('button', { name: 'Settings & Backups' });
    await settingsBtn.click();

    // Wait for settings panel to animate in and display content
    const settingsPanel = page.locator('.glass-panel', {
      hasText: 'Backup & Cloud Storage Settings',
    });
    await settingsPanel.waitFor({ state: 'visible' });

    // Take snapshot of the page with the settings panel open
    await expect(page).toHaveScreenshot('settings-panel-view.png');
  });

  test('history-view-empty', async ({ page }) => {
    // Switch to History tab
    await page.getByRole('button', { name: 'History' }).click();
    await page.waitForURL(/#\/history/);

    // Take snapshot of empty history view
    await expect(page).toHaveScreenshot('history-view-empty.png');
  });

  test('analytics-view-empty', async ({ page }) => {
    // Switch to Analytics tab
    await page.getByRole('button', { name: 'Analytics' }).click();
    await page.waitForURL(/#\/analytics/);

    // Take snapshot of empty analytics view
    await expect(page).toHaveScreenshot('analytics-view-empty.png');
  });
});
