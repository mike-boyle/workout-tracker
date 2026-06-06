import { describe, it, expect, vi } from 'vitest';
import { initializeAppCheck } from 'firebase/app-check';

// Set up config before import to trigger App Check block
vi.mock('../src/config', () => ({
  ENABLE_APP_CHECK: true,
  RECAPTCHA_SITE_KEY: 'test-site-key',
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
  isSupported: vi.fn(() => Promise.resolve(false)),
}));

vi.mock('firebase/app-check', () => ({
  initializeAppCheck: vi.fn(() => {
    throw new Error('App Check init failed');
  }),
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

describe('Firebase Service App Check Initialization Failure', () => {
  it('should catch App Check initialization errors and warn', async () => {
    vi.resetModules();
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Import dynamically with a unique query param to bypass cache
    await import('../src/services/firebase?t=appcheck');

    expect(initializeAppCheck).toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Firebase App Check failed to initialize:',
      expect.any(Error)
    );
    consoleWarnSpy.mockRestore();
  });

  it('should set debug token in window if in DEV mode', async () => {
    vi.resetModules();
    vi.stubEnv('DEV', true);

    const mockAppCheck = await import('firebase/app-check');
    vi.mocked(mockAppCheck.initializeAppCheck).mockImplementationOnce(
      () => ({}) as unknown as ReturnType<typeof mockAppCheck.initializeAppCheck>
    );

    await import('../src/services/firebase?t=appcheck_dev');

    expect(
      (window as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: boolean })
        .FIREBASE_APPCHECK_DEBUG_TOKEN
    ).toBe(true);

    vi.unstubAllEnvs();
  });
});
