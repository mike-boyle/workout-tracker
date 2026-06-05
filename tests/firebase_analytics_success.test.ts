import { describe, it, expect, vi } from 'vitest';
import { getAnalytics, logEvent } from 'firebase/analytics';

vi.mock('../src/config', () => ({
  ENABLE_APP_CHECK: false,
  RECAPTCHA_SITE_KEY: '',
  FIREBASE_CONFIG: {},
}));

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  GoogleAuthProvider: class {},
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(() => ({})),
  logEvent: vi.fn(),
  isSupported: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('firebase/app-check', () => ({
  initializeAppCheck: vi.fn(),
  ReCaptchaV3Provider: class {},
}));

vi.mock('firebase/firestore/lite', () => ({
  getFirestore: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  writeBatch: vi.fn(),
  deleteField: vi.fn(),
}));

describe('Firebase Service Analytics Success', () => {
  it('should initialize analytics and log events successfully', async () => {
    vi.resetModules();
    // Import dynamically with a unique query param to bypass cache
    const { logAnalyticsEvent } = await import('../src/services/firebase?t=analytics_success');

    // Wait for the async isSupported promise to resolve and set analytics
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(getAnalytics).toHaveBeenCalled();

    // Now test logging event
    logAnalyticsEvent('test_event', { key: 'value' });
    expect(logEvent).toHaveBeenCalledWith(expect.any(Object), 'test_event', { key: 'value' });
  });

  it('should handle analytics event logging errors gracefully', async () => {
    vi.resetModules();
    const { logAnalyticsEvent } = await import('../src/services/firebase?t=analytics_success');

    // Wait for the async isSupported promise to resolve and set analytics
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Mock logEvent to throw
    vi.mocked(logEvent).mockImplementationOnce(() => {
      throw new Error('logEvent failed');
    });

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    logAnalyticsEvent('failed_event', { key: 'value' });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Failed to log analytics event "failed_event":',
      expect.any(Error)
    );
    consoleWarnSpy.mockRestore();
  });
});
