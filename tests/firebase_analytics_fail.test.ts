import { describe, it, expect, vi } from 'vitest';

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
  getAnalytics: vi.fn(),
  logEvent: vi.fn(),
  isSupported: vi.fn(() => Promise.reject(new Error('Analytics support check failed'))),
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

describe('Firebase Service Analytics Failure', () => {
  it('should handle analytics initialization failure', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    vi.resetModules();
    // Import dynamically with a unique query param to bypass cache
    await import('../src/services/firebase?t=analytics_fail');

    // Wait for the async isSupported promise to reject and trigger catch
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Firebase Analytics not supported or failed to initialize:',
      expect.any(Error)
    );
    consoleWarnSpy.mockRestore();
  });
});
