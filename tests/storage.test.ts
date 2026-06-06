import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadLocalState,
  loadLocalCycleLogs,
  saveLocalState,
  saveLocalMetadata,
  clearLocalState,
  validateBackup,
  INITIAL_METADATA,
  db,
  ensureMetadataPrograms,
} from '../src/services/storage';
import type { UserMetadata, WorkoutLog } from '../src/types';

describe('Storage Service (IndexedDB & segmented)', () => {
  let store: Record<string, unknown> = {};

  beforeEach(() => {
    store = {};
    localStorage.clear();
    vi.restoreAllMocks();

    // Mock the db calls using our in-memory store
    vi.spyOn(db, 'get').mockImplementation(async (key: string) => store[key] || null);
    vi.spyOn(db, 'set').mockImplementation(async (key: string, val: unknown) => {
      store[key] = val;
    });
    vi.spyOn(db, 'delete').mockImplementation(async (key: string) => {
      delete store[key];
    });
    vi.spyOn(db, 'clear').mockImplementation(async () => {
      store = {};
    });
  });

  it('should return INITIAL_METADATA and empty logs when storage is empty', async () => {
    const res = await loadLocalState();
    expect(res.metadata).toEqual(INITIAL_METADATA);
    expect(res.logs).toEqual([]);
  });

  it('should successfully save and load metadata and cycle logs', async () => {
    const mockMetadata: UserMetadata = {
      version: 1,
      currentCycle: 2,
      currentWeek: 4,
      currentDay: 2,
      cycleTimestamps: { 2: new Date().toISOString() },
      cycleStats: {
        2: { completedCount: 0, skippedCount: 0, totalDays: 91 },
      },
      activeProgramId: 'p90x',
      programs: {
        p90x: {
          currentCycle: 2,
          currentWeek: 4,
          currentDay: 2,
          cycleStats: {
            2: { completedCount: 0, skippedCount: 0, totalDays: 91 },
          },
        },
      },
    };
    const mockLogs: WorkoutLog[] = [
      {
        id: 'test_log_1',
        cycle: 2,
        week: 1,
        day: 1,
        workoutId: 'chest_and_back',
        dateCompleted: new Date().toISOString(),
        skipped: false,
        exercises: {},
        abRipperCompleted: true,
        comments: 'Felt great!',
      },
    ];

    await saveLocalState(mockMetadata, 2, mockLogs);

    const loaded = await loadLocalState(2);
    expect(loaded.metadata.currentCycle).toBe(2);
    expect(loaded.logs).toEqual(mockLogs);

    const loadedLogsDirectly = await loadLocalCycleLogs(2);
    expect(loadedLogsDirectly).toEqual(mockLogs);
  });

  it('should clear IndexedDB and localStorage on clearLocalState', async () => {
    const mockMetadata = { ...INITIAL_METADATA, currentCycle: 5 };
    await saveLocalState(mockMetadata, 5, []);

    expect((await loadLocalState(5)).metadata.currentCycle).toBe(5);

    await clearLocalState();

    const cleared = await loadLocalState();
    expect(cleared.metadata).toEqual(INITIAL_METADATA);
  });

  it('should backfill missing programs on loadLocalState', async () => {
    const incompleteMetadata: UserMetadata = {
      version: 1,
      currentCycle: 1,
      currentWeek: 1,
      currentDay: 1,
      cycleTimestamps: {},
      cycleStats: {},
      activeProgramId: 'p90x',
      programs: {
        p90x: {
          currentCycle: 1,
          currentWeek: 1,
          currentDay: 1,
          cycleStats: {},
        },
      } as unknown as UserMetadata['programs'],
    };

    await saveLocalMetadata(incompleteMetadata);

    const loaded = await loadLocalState();
    expect(loaded.metadata.programs.test_workout).toBeDefined();
    expect(loaded.metadata.programs.test_workout.currentCycle).toBe(1);
    expect(loaded.metadata.programs.test_workout.currentWeek).toBe(1);
    expect(loaded.metadata.programs.test_workout.currentDay).toBe(1);
  });

  it('should handle undefined/missing programs map in ensureMetadataPrograms', () => {
    const incomplete = {
      version: 1,
      currentCycle: 1,
      currentWeek: 1,
      currentDay: 1,
      cycleTimestamps: {},
      cycleStats: {},
      activeProgramId: 'p90x',
    } as unknown as UserMetadata;
    const sanitized = ensureMetadataPrograms(incomplete);
    expect(sanitized.programs).toBeDefined();
    expect(sanitized.programs.p90x).toBeDefined();
    expect(sanitized.programs.test_workout).toBeDefined();
  });

  it('should handle missing cycleStats and cycleTimestamps at root and inside program state in ensureMetadataPrograms', () => {
    const incomplete = {
      version: 1,
      currentCycle: 1,
      currentWeek: 1,
      currentDay: 1,
      activeProgramId: 'p90x',
      programs: {
        p90x: {
          currentCycle: 1,
          currentWeek: 1,
          currentDay: 1,
        },
      },
    } as unknown as UserMetadata;
    const sanitized = ensureMetadataPrograms(incomplete);
    expect(sanitized.cycleStats).toEqual({});
    expect(sanitized.cycleTimestamps).toEqual({});
    expect(sanitized.programs.p90x.cycleStats).toEqual({});
  });

  it('should handle missing cycleStats and cycleTimestamps in saveLocalState', async () => {
    const incompleteMetadata = {
      version: 1,
      currentCycle: 1,
      currentWeek: 1,
      currentDay: 1,
      activeProgramId: 'p90x',
      programs: {
        p90x: {
          currentCycle: 1,
          currentWeek: 1,
          currentDay: 1,
        },
      },
    } as unknown as UserMetadata;

    await saveLocalState(incompleteMetadata, 1, []);

    expect(incompleteMetadata.cycleStats).toBeDefined();
    expect(incompleteMetadata.cycleStats[1]).toBeDefined();
    expect(incompleteMetadata.cycleTimestamps).toBeDefined();
    expect(incompleteMetadata.cycleTimestamps[1]).toBeDefined();
    expect(incompleteMetadata.programs.p90x.cycleStats).toBeDefined();
    expect(incompleteMetadata.programs.p90x.cycleStats[1]).toBeDefined();
  });

  it('should validate valid backup data', () => {
    const validData = {
      version: 1,
      currentCycle: 1,
      currentWeek: 1,
      currentDay: 3,
    };
    expect(validateBackup(validData)).toBe(true);
  });

  it('should reject invalid backup data', () => {
    expect(validateBackup(null)).toBe(false);
    expect(validateBackup(undefined)).toBe(false);
    expect(validateBackup('string')).toBe(false);
    expect(validateBackup({ currentCycle: 'not-a-number' })).toBe(false);
  });

  it('should reject backup data with invalid non-numeric properties', () => {
    expect(validateBackup({ currentCycle: 1, currentWeek: 'not-a-number', currentDay: 1 })).toBe(
      false
    );
    expect(validateBackup({ currentCycle: 1, currentWeek: 1, currentDay: 'not-a-number' })).toBe(
      false
    );
  });

  it('should save metadata using saveLocalMetadata', async () => {
    const mockMetadata = { ...INITIAL_METADATA, currentCycle: 10 };
    await saveLocalMetadata(mockMetadata);
    expect(store['metadata']).toEqual(mockMetadata);
  });

  describe('WorkoutTrackerDB real implementation tests', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    const createMockIDBRequest = (
      success: boolean,
      resultValue?: unknown,
      upgradeNeeded: boolean = false,
      requestSuccess: boolean = true
    ) => {
      const req = {
        result: {
          objectStoreNames: {
            contains: () => !upgradeNeeded,
          } as unknown as DOMStringList,
          createObjectStore: vi.fn(),
          transaction: () =>
            ({
              objectStore: () =>
                ({
                  get: () => {
                    const getReq = {
                      result: resultValue,
                      error: new Error('Request error') as DOMException | null,
                      onsuccess: null as ((this: IDBRequest<unknown>, ev: Event) => unknown) | null,
                      onerror: null as ((this: IDBRequest<unknown>, ev: Event) => unknown) | null,
                    } as unknown as IDBRequest<unknown>;
                    setTimeout(() => {
                      if (requestSuccess) {
                        getReq.onsuccess?.({} as Event);
                      } else {
                        getReq.onerror?.({} as Event);
                      }
                    }, 0);
                    return getReq;
                  },
                  put: () => {
                    const putReq = {
                      error: new Error('Request error') as DOMException | null,
                      onsuccess: null as
                        | ((this: IDBRequest<IDBValidKey>, ev: Event) => unknown)
                        | null,
                      onerror: null as
                        | ((this: IDBRequest<IDBValidKey>, ev: Event) => unknown)
                        | null,
                    } as unknown as IDBRequest<IDBValidKey>;
                    setTimeout(() => {
                      if (requestSuccess) {
                        putReq.onsuccess?.({} as Event);
                      } else {
                        putReq.onerror?.({} as Event);
                      }
                    }, 0);
                    return putReq;
                  },
                  delete: () => {
                    const delReq = {
                      error: new Error('Request error') as DOMException | null,
                      onsuccess: null as
                        | ((this: IDBRequest<undefined>, ev: Event) => unknown)
                        | null,
                      onerror: null as ((this: IDBRequest<undefined>, ev: Event) => unknown) | null,
                    } as unknown as IDBRequest<undefined>;
                    setTimeout(() => {
                      if (requestSuccess) {
                        delReq.onsuccess?.({} as Event);
                      } else {
                        delReq.onerror?.({} as Event);
                      }
                    }, 0);
                    return delReq;
                  },
                  clear: () => {
                    const clearReq = {
                      error: new Error('Request error') as DOMException | null,
                      onsuccess: null as
                        | ((this: IDBRequest<undefined>, ev: Event) => unknown)
                        | null,
                      onerror: null as ((this: IDBRequest<undefined>, ev: Event) => unknown) | null,
                    } as unknown as IDBRequest<undefined>;
                    setTimeout(() => {
                      if (requestSuccess) {
                        clearReq.onsuccess?.({} as Event);
                      } else {
                        clearReq.onerror?.({} as Event);
                      }
                    }, 0);
                    return clearReq;
                  },
                }) as unknown as IDBObjectStore,
            }) as unknown as IDBTransaction,
        } as unknown as IDBDatabase,
        error: new Error('IDB error') as DOMException | null,
        onsuccess: null as ((this: IDBOpenDBRequest, ev: Event) => unknown) | null,
        onerror: null as ((this: IDBOpenDBRequest, ev: Event) => unknown) | null,
        onupgradeneeded: null as
          | ((this: IDBOpenDBRequest, ev: IDBVersionChangeEvent) => unknown)
          | null,
      } as unknown as IDBOpenDBRequest;

      setTimeout(() => {
        if (success) {
          if (upgradeNeeded && req.onupgradeneeded) {
            req.onupgradeneeded({} as IDBVersionChangeEvent);
          }
          req.onsuccess?.({} as Event);
        } else {
          req.onerror?.({} as Event);
        }
      }, 0);

      return req;
    };

    it('should successfully get a value using real WorkoutTrackerDB methods', async () => {
      const mockRequest = createMockIDBRequest(true, 'some_val');
      vi.stubGlobal('indexedDB', { open: () => mockRequest });

      const val = await db.get('test_key');
      expect(val).toBe('some_val');
    });

    it('should handle get error when openDB fails', async () => {
      const mockRequest = createMockIDBRequest(false);
      vi.stubGlobal('indexedDB', { open: () => mockRequest });

      const val = await db.get('test_key');
      expect(val).toBeNull();
    });

    it('should handle get request error', async () => {
      const mockRequest = createMockIDBRequest(true, null, false, false);
      vi.stubGlobal('indexedDB', { open: () => mockRequest });

      const val = await db.get('test_key');
      expect(val).toBeNull();
    });

    it('should successfully set a value', async () => {
      const mockRequest = createMockIDBRequest(true);
      vi.stubGlobal('indexedDB', { open: () => mockRequest });

      await expect(db.set('test_key', 'val')).resolves.not.toThrow();
    });

    it('should handle set error when openDB fails', async () => {
      const mockRequest = createMockIDBRequest(false);
      vi.stubGlobal('indexedDB', { open: () => mockRequest });

      await expect(db.set('test_key', 'val')).resolves.not.toThrow();
    });

    it('should handle set request error', async () => {
      const mockRequest = createMockIDBRequest(true, null, false, false);
      vi.stubGlobal('indexedDB', { open: () => mockRequest });

      await expect(db.set('test_key', 'val')).resolves.not.toThrow();
    });

    it('should successfully delete a value', async () => {
      const mockRequest = createMockIDBRequest(true);
      vi.stubGlobal('indexedDB', { open: () => mockRequest });

      await expect(db.delete('test_key')).resolves.not.toThrow();
    });

    it('should handle delete error when openDB fails', async () => {
      const mockRequest = createMockIDBRequest(false);
      vi.stubGlobal('indexedDB', { open: () => mockRequest });

      await expect(db.delete('test_key')).resolves.not.toThrow();
    });

    it('should handle delete request error', async () => {
      const mockRequest = createMockIDBRequest(true, null, false, false);
      vi.stubGlobal('indexedDB', { open: () => mockRequest });

      await expect(db.delete('test_key')).resolves.not.toThrow();
    });

    it('should successfully clear', async () => {
      const mockRequest = createMockIDBRequest(true);
      vi.stubGlobal('indexedDB', { open: () => mockRequest });

      await expect(db.clear()).resolves.not.toThrow();
    });

    it('should handle clear error when openDB fails', async () => {
      const mockRequest = createMockIDBRequest(false);
      vi.stubGlobal('indexedDB', { open: () => mockRequest });

      await expect(db.clear()).resolves.not.toThrow();
    });

    it('should handle clear request error', async () => {
      const mockRequest = createMockIDBRequest(true, null, false, false);
      vi.stubGlobal('indexedDB', { open: () => mockRequest });

      await expect(db.clear()).resolves.not.toThrow();
    });

    it('should call onupgradeneeded when upgrading', async () => {
      const mockRequest = createMockIDBRequest(true, null, true);
      vi.stubGlobal('indexedDB', { open: () => mockRequest });

      await db.get('upgrade_key');
      expect(mockRequest.result.createObjectStore).toHaveBeenCalledWith('keyValueStore');
    });

    it('should call onupgradeneeded when upgrading and keyValueStore already exists', async () => {
      const mockRequest = createMockIDBRequest(true, null, true);
      mockRequest.result.objectStoreNames.contains = () => true;
      vi.stubGlobal('indexedDB', { open: () => mockRequest });

      await db.get('upgrade_key');
      expect(mockRequest.result.createObjectStore).not.toHaveBeenCalled();
    });
  });
});
