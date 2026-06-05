import { describe, it, expect, vi } from 'vitest';
import { connectFirestoreEmulator } from 'firebase/firestore/lite';
import { connectAuthEmulator } from 'firebase/auth';

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
  connectAuthEmulator: vi.fn(),
}));

vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(),
  logEvent: vi.fn(),
  isSupported: vi.fn(() => Promise.resolve(false)),
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
  connectFirestoreEmulator: vi.fn(),
}));

describe('Firebase Emulator Connection', () => {
  it('should connect emulators successfully', async () => {
    // Set environment flag to true
    import.meta.env.VITE_USE_FIREBASE_EMULATOR = 'true';

    vi.resetModules();
    await import('../src/services/firebase?t=emulator_success');

    expect(connectFirestoreEmulator).toHaveBeenCalled();
    expect(connectAuthEmulator).toHaveBeenCalled();

    // Reset environment flag
    import.meta.env.VITE_USE_FIREBASE_EMULATOR = undefined;
  });

  it('should catch emulator connection errors and log a warning', async () => {
    // Set environment flag to true
    import.meta.env.VITE_USE_FIREBASE_EMULATOR = 'true';

    // Mock connectFirestoreEmulator to throw
    vi.mocked(connectFirestoreEmulator).mockImplementationOnce(() => {
      throw new Error('Emulator already connected');
    });

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    vi.resetModules();
    await import('../src/services/firebase?t=emulator_fail');

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Firebase Emulators failed to connect or are already connected:',
      expect.any(Error)
    );

    consoleWarnSpy.mockRestore();
    import.meta.env.VITE_USE_FIREBASE_EMULATOR = undefined;
  });
});
