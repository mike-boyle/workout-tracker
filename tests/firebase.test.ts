import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveFirebaseCycle, loadFirebaseCycle } from '../src/services/firebase';
import { getDoc, setDoc, getDocs, writeBatch } from 'firebase/firestore/lite';
import type { QuerySnapshot, DocumentSnapshot } from 'firebase/firestore/lite';
import type { WorkoutLog } from '../src/types';

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

  it('should load sorted logs from subcollection when not empty', async () => {
    const docs = [
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

    // Check sorted order: w1d1 should be first
    expect(logs.length).toBe(2);
    expect(logs[0].id).toBe('log-w1d1');
    expect(logs[1].id).toBe('log-w1d2');
  });

  it('should fallback to legacy document and migrate data to subcollection', async () => {
    // 1. Subcollection is empty
    vi.mocked(getDocs).mockResolvedValueOnce({
      empty: true,
      forEach: () => {},
    } as unknown as QuerySnapshot);

    // 2. Legacy doc snapshot exists and contains a logs array
    const legacyLogs = [{ id: 'legacy-log', cycle: 1, week: 1, day: 1 }];
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ logs: legacyLogs }),
    } as unknown as DocumentSnapshot);

    const logs = await loadFirebaseCycle('user123', 1, 'p90x');

    // Verify fallback lookup on parent doc
    expect(getDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user123/cycles/p90x_cycle_1' })
    );

    // Verify migration writes the logs in batch to subcollection
    expect(mockBatch.set).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user123/cycles/p90x_cycle_1/logs/legacy-log' }),
      legacyLogs[0]
    );

    // Verify it cleans up legacy logs array from parent doc
    expect(mockBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user123/cycles/p90x_cycle_1' }),
      { logs: 'mocked-delete-field' }
    );
    expect(mockBatch.commit).toHaveBeenCalled();

    // Returns migrated logs
    expect(logs).toEqual(legacyLogs);
  });

  it('should return empty array if both subcollection and legacy doc are empty', async () => {
    vi.mocked(getDocs).mockResolvedValueOnce({
      empty: true,
    } as unknown as QuerySnapshot);
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => false,
    } as unknown as DocumentSnapshot);

    const logs = await loadFirebaseCycle('user123', 1, 'p90x');
    expect(logs).toEqual([]);
  });
});
