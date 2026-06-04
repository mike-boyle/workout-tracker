import { test, expect } from '@playwright/test';

/**
 * Configures strict network request interception for Playwright E2E tests.
 *
 * - Allows local requests to communication with the Vite dev server (localhost/127.0.0.1)
 * - Mocks expected external services (Google Analytics, Google Tag Manager, Firebase)
 * - Allows static asset loading from Google Fonts
 * - Aborts and fails the test if any other external request occurs.
 */
export function setupStrictNetworkIsolation(): void {
  let unhandledRequests: string[] = [];

  test.beforeEach(async ({ page }) => {
    unhandledRequests = [];
    await page.route('**/*', (route) => {
      const url = route.request().url();
      const parsed = new URL(url);

      // 1. Allow local dev server
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        route.continue();
        return;
      }

      // 2. Mock expected external services (Google Analytics and Firebase)
      if (url.includes('firebaseinstallations.googleapis.com') || url.includes('/installations')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            refreshToken: 'mock-refresh-token',
            authToken: {
              token: 'mock-auth-token',
              expiresIn: '604800s',
            },
            fid: 'mock-fid',
          }),
        });
        return;
      }

      const isFirebaseOrAnalytics =
        url.includes('google-analytics') ||
        url.includes('analytics.google') ||
        url.includes('googleapis.com') ||
        url.includes('firebase') ||
        url.includes('googletagmanager.com');

      if (isFirebaseOrAnalytics) {
        route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        return;
      }

      // 3. Allow Google Fonts
      if (parsed.hostname === 'fonts.googleapis.com' || parsed.hostname === 'fonts.gstatic.com') {
        route.continue();
        return;
      }

      // 4. Any other external request is a violation
      console.error(`[E2E Violation] Unhandled external network request to: ${url}`);
      unhandledRequests.push(url);
      route.abort('failed');
    });
  });

  test.afterEach(() => {
    expect(unhandledRequests).toEqual([]);
  });
}
