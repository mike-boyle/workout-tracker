import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  saveFirebaseCycle,
  loadFirebaseCycle,
  signInWithGoogle,
  signOutUser,
  listenForAuthChanges,
  saveFirebaseMetadata,
  loadFirebaseMetadata,
  logAnalyticsEvent,
} from '../src/services/firebase';
import { getDoc, setDoc, getDocs, writeBatch } from 'firebase/firestore/lite';
import type { QuerySnapshot, DocumentSnapshot } from 'firebase/firestore/lite';
import type { WorkoutLog } from '../src/types';
import { signInWithPopup, signOut, onAuthStateChanged, type UserCredential } from 'firebase/auth';

// Unmock the firebase service so we test the actual implementation
vi.unmock('../src/services/firebase');

// Mock Firebase Config and Analytics/AppCheck dependencies
vi.mock('../src/config', () => ({
  FIREBASE_CONFIG: {},
  ENABLE_APP_CHECK: false,
  RECAPTCHA_SITE_KEY: '',
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
  initializeAppCheck: vi.fn(),
  ReCaptchaV3Provider: class {},
}));

// Mock firestore functions
vi.mock('firebase/firestore/lite', () => {
  const mockBatch = {
    set: vi.fn(),
    update: vi.fn(),
    commit: vi.fn(() => Promise.resolve()),
  };
  return {
    getFirestore: vi.fn(),
    doc: vi.fn((parent, ...paths) => {
      const parentPath =
        parent && typeof parent === 'object' && 'path' in parent
          ? (parent as { path: string }).path
          : '';
      const docPath = paths.join('/');
      return { path: parentPath ? `${parentPath}/${docPath}` : docPath };
    }),
    collection: vi.fn((parent, ...paths) => {
      const parentPath =
        parent && typeof parent === 'object' && 'path' in parent
          ? (parent as { path: string }).path
          : '';
      const colPath = paths.join('/');
      return { path: parentPath ? `${parentPath}/${colPath}` : colPath };
    }),
    getDoc: vi.fn(),
    setDoc: vi.fn(() => Promise.resolve()),
    getDocs: vi.fn(),
    serverTimestamp: vi.fn(() => 'mocked-timestamp'),
    writeBatch: vi.fn(() => mockBatch),
    deleteField: vi.fn(() => 'mocked-delete-field'),
  };
});

describe('Firebase Service - Cycles storage and migration', () => {
  const mockBatch = writeBatch();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should save logs to subcollection via writeBatch', async () => {
    const logs: WorkoutLog[] = [
      {
        id: 'log1',
        cycle: 1,
        week: 1,
        day: 1,
        workoutId: 'chest',
        dateCompleted: '2026-06-03',
        skipped: false,
        exercises: {},
        abRipperCompleted: false,
        comments: '',
      },
    ];

    await saveFirebaseCycle('user123', 1, logs, 'p90x');

    // 1. Verify parent doc timestamp updated
    expect(setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user123/cycles/p90x_cycle_1' }),
      { lastUpdated: 'mocked-timestamp' },
      { merge: true }
    );

    // 2. Verify writeBatch used to save the individual log doc
    expect(writeBatch).toHaveBeenCalled();
    expect(mockBatch.set).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user123/cycles/p90x_cycle_1/logs/log1' }),
      logs[0]
    );
    expect(mockBatch.commit).toHaveBeenCalled();
  });

  it('should not write logs if logs array is empty', async () => {
    await saveFirebaseCycle('user123', 1, [], 'p90x');
    expect(setDoc).toHaveBeenCalled();
    expect(writeBatch).not.toHaveBeenCalled();
  });

  it('should load sorted logs from subcollection when not empty', async () => {
    const docs = [
      {
        data: () => ({
          id: 'log-w2d1',
          cycle: 1,
          week: 2,
          day: 1,
        }),
      },
      {
        data: () => ({
          id: 'log-w1d2',
          cycle: 1,
          week: 1,
          day: 2,
        }),
      },
      {
        data: () => ({
          id: 'log-w1d1',
          cycle: 1,
          week: 1,
          day: 1,
        }),
      },
    ];

    vi.mocked(getDocs).mockResolvedValueOnce({
      empty: false,
      forEach: (callback: (d: unknown) => void) => docs.forEach(callback),
    } as unknown as QuerySnapshot);

    const logs = await loadFirebaseCycle('user123', 1, 'p90x');

    expect(getDocs).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user123/cycles/p90x_cycle_1/logs' })
    );

    // Check sorted order: w1d1 should be first, then w1d2, then w2d1
    expect(logs.length).toBe(3);
    expect(logs[0].id).toBe('log-w1d1');
    expect(logs[1].id).toBe('log-w1d2');
    expect(logs[2].id).toBe('log-w2d1');
  });

  it('should return empty array if subcollection is empty', async () => {
    vi.mocked(getDocs).mockResolvedValueOnce({
      empty: true,
      forEach: () => {},
    } as unknown as QuerySnapshot);

    const logs = await loadFirebaseCycle('user123', 1, 'p90x');
    expect(logs).toEqual([]);
  });

  it('should call signInWithPopup on signInWithGoogle', async () => {
    vi.mocked(signInWithPopup).mockResolvedValueOnce({} as unknown as UserCredential);
    await signInWithGoogle();
    expect(signInWithPopup).toHaveBeenCalled();
  });

  it('should call signOut on signOutUser', async () => {
    vi.mocked(signOut).mockResolvedValueOnce();
    await signOutUser();
    expect(signOut).toHaveBeenCalled();
  });

  it('should call onAuthStateChanged on listenForAuthChanges', () => {
    const cb = vi.fn();
    listenForAuthChanges(cb);
    expect(onAuthStateChanged).toHaveBeenCalledWith(undefined, cb);
  });

  it('should call setDoc to save user metadata settings', async () => {
    const metadata: UserMetadata = {
      version: 1,
      currentCycle: 1,
      currentWeek: 1,
      currentDay: 1,
      cycleTimestamps: { 1: '2026-06-05T10:00:00.000Z' },
      cycleStats: {
        1: { completedCount: 0, skippedCount: 0, totalDays: 91 },
      },
      activeProgramId: 'p90x',
      programs: {
        p90x: {
          currentCycle: 1,
          currentWeek: 1,
          currentDay: 1,
          cycleStats: {
            1: { completedCount: 0, skippedCount: 0, totalDays: 91 },
          },
        },
      },
    };
    await saveFirebaseMetadata('user123', metadata);
    expect(setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user123/metadata/settings' }),
      expect.objectContaining({
        version: 1,
        currentCycle: 1,
        currentWeek: 1,
        currentDay: 1,
        lastUpdated: 'mocked-timestamp',
      })
    );
  });

  it('should load metadata if settings doc exists', async () => {
    const metadata: UserMetadata = {
      version: 1,
      currentCycle: 1,
      currentWeek: 1,
      currentDay: 1,
      cycleTimestamps: { 1: '2026-06-05T10:00:00.000Z' },
      cycleStats: {
        1: { completedCount: 0, skippedCount: 0, totalDays: 91 },
      },
      activeProgramId: 'p90x',
      programs: {
        p90x: {
          currentCycle: 1,
          currentWeek: 1,
          currentDay: 1,
          cycleStats: {
            1: { completedCount: 0, skippedCount: 0, totalDays: 91 },
          },
        },
      },
    };
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => metadata,
    } as unknown as DocumentSnapshot);
    const result = await loadFirebaseMetadata('user123');
    expect(getDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user123/metadata/settings' })
    );
    expect(result).toEqual(metadata);
  });

  it('should return null if settings doc does not exist', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => false,
    } as unknown as DocumentSnapshot);
    const result = await loadFirebaseMetadata('user123');
    expect(result).toBeNull();
  });

  it('should not log analytics event if analytics is not supported/initialized', () => {
    logAnalyticsEvent('test_event', { param: 'value' });
    // Should not throw, should execute cleanly
  });
});
