import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadLocalState,
  loadLocalCycleLogs,
  saveLocalState,
  saveLocalMetadata,
  clearLocalState,
  validateBackup,
  migrateLocalStorageToIndexedDB,
  INITIAL_METADATA,
  db,
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
      gdriveLinked: true,
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

  it('should migrate old unified localStorage state to IndexedDB', async () => {
    const legacyState = {
      version: 1,
      currentCycle: 2,
      currentWeek: 3,
      currentDay: 1,
      gdriveLinked: true,
      logs: [
        {
          id: 'log_cycle_1',
          cycle: 1,
          week: 1,
          day: 1,
          workoutId: 'chest_and_back',
          skipped: false,
          exercises: {},
        },
        {
          id: 'log_cycle_1_2',
          cycle: 1,
          week: 1,
          day: 2,
          workoutId: 'plyometrics',
          skipped: false,
          exercises: {},
        },
        {
          id: 'log_cycle_2',
          cycle: 2,
          week: 2,
          day: 2,
          workoutId: 'plyometrics',
          skipped: true,
          exercises: {},
        },
      ],
    };

    localStorage.setItem('workout_tracker_state', JSON.stringify(legacyState));
    localStorage.setItem('workout_tracker_gdrive_file_id', 'remote_metadata_file_123');

    // Run migration via loadLocalState
    const res = await loadLocalState(2);

    expect(localStorage.getItem('workout_tracker_state')).toBeNull();
    expect(localStorage.getItem('workout_tracker_gdrive_file_id')).toBeNull();

    // Metadata check
    expect(res.metadata.currentCycle).toBe(2);
    expect(res.metadata.gdriveLinked).toBe(true);
    expect(res.metadata.metadataFileId).toBe('remote_metadata_file_123');

    // Check cycle stats calculation during migration
    expect(res.metadata.cycleStats?.[1]).toEqual({
      completedCount: 2,
      skippedCount: 0,
      totalDays: 91,
    });
    expect(res.metadata.cycleStats?.[2]).toEqual({
      completedCount: 0,
      skippedCount: 1,
      totalDays: 91,
    });

    // Check loaded logs for active cycle
    expect(res.logs.length).toBe(1);
    expect(res.logs[0].id).toBe('log_cycle_2');

    // Verify cycle 1 logs are also saved to store
    const cycle1Logs = await loadLocalCycleLogs(1);
    expect(cycle1Logs.length).toBe(2);
    expect(cycle1Logs[0].id).toBe('log_cycle_1');
    expect(cycle1Logs[1].id).toBe('log_cycle_1_2');
  });

  it('should validate valid backup data', () => {
    const validData = {
      version: 1,
      currentCycle: 1,
      currentWeek: 1,
      currentDay: 3,
      gdriveLinked: false,
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

  it('should return false if JSON.parse fails during migration', async () => {
    localStorage.setItem('workout_tracker_state', 'invalid-json{');
    const result = await migrateLocalStorageToIndexedDB();
    expect(result).toBe(false);
  });

  it('should initialize activeProgramId and programs if not present in loaded metadata', async () => {
    const incompleteMetadata = {
      version: 1,
      currentCycle: 2,
      currentWeek: 3,
      currentDay: 1,
      gdriveLinked: false,
    };
    store['metadata'] = incompleteMetadata;

    const res = await loadLocalState();
    expect(res.metadata.activeProgramId).toBe('p90x');
    expect(res.metadata.programs?.p90x.currentCycle).toBe(2);
  });

  it('should fallback to legacy cycle logs if program-specific logs do not exist', async () => {
    const mockMetadata = {
      version: 1,
      currentCycle: 2,
      activeProgramId: 'p90x',
      programs: {
        p90x: { currentCycle: 2, currentWeek: 1, currentDay: 1, cycleStats: {} },
      },
    };
    store['metadata'] = mockMetadata;
    const legacyLogs = [
      {
        id: 'legacy_log_1',
        cycle: 2,
        week: 1,
        day: 1,
        workoutId: 'plyometrics',
        skipped: false,
        exercises: {},
      },
    ];
    store['cycle_2_logs'] = legacyLogs;

    const res = await loadLocalState();
    expect(res.logs).toEqual(legacyLogs);
    expect(store['p90x_cycle_2_logs']).toEqual(legacyLogs);
  });

  it('should fallback to legacy cycle logs in loadLocalCycleLogs', async () => {
    const legacyLogs = [
      {
        id: 'legacy_log_1',
        cycle: 3,
        week: 1,
        day: 1,
        workoutId: 'plyometrics',
        skipped: false,
        exercises: {},
      },
    ];
    store['cycle_3_logs'] = legacyLogs;

    const logs = await loadLocalCycleLogs(3);
    expect(logs).toEqual(legacyLogs);
    expect(store['p90x_cycle_3_logs']).toEqual(legacyLogs);
  });

  it('should return empty logs if neither new logs nor legacy logs exist in loadLocalState', async () => {
    const mockMetadata = {
      version: 1,
      currentCycle: 2,
      activeProgramId: 'p90x',
      programs: {
        p90x: { currentCycle: 2, currentWeek: 1, currentDay: 1, cycleStats: {} },
      },
    };
    store['metadata'] = mockMetadata;

    const res = await loadLocalState();
    expect(res.logs).toEqual([]);
  });

  it('should return empty logs if neither new logs nor legacy logs exist in loadLocalCycleLogs', async () => {
    const logs = await loadLocalCycleLogs(4);
    expect(logs).toEqual([]);
  });

  it('should initialize missing metadata fields on saveLocalState', async () => {
    const incompleteMetadata: UserMetadata = {
      version: 1,
      currentCycle: 2,
      currentWeek: 3,
      currentDay: 1,
      gdriveLinked: false,
    };

    await saveLocalState(incompleteMetadata, 2, [], 'p90x');
    expect(incompleteMetadata.programs).toBeDefined();
    expect(incompleteMetadata.programs!.p90x).toBeDefined();
    expect(incompleteMetadata.cycleStats).toBeDefined();
    expect(incompleteMetadata.cycleStats![2]).toBeDefined();
    expect(incompleteMetadata.cycleTimestamps).toBeDefined();
    expect(incompleteMetadata.cycleTimestamps![2]).toBeDefined();
  });

  it('should initialize cycleStats on saveLocalState if program exists but cycleStats is undefined', async () => {
    const incompleteMetadata: UserMetadata = {
      version: 1,
      currentCycle: 2,
      currentWeek: 3,
      currentDay: 1,
      gdriveLinked: false,
      programs: {
        p90x: {
          currentCycle: 2,
          currentWeek: 1,
          currentDay: 1,
          cycleStats: undefined as unknown as {
            [cycle: number]: { completedCount: number; skippedCount: number; totalDays: number };
          },
        },
      },
    };

    await saveLocalState(incompleteMetadata, 2, [], 'p90x');
    expect(incompleteMetadata.programs!.p90x.cycleStats).toBeDefined();
    expect(incompleteMetadata.programs!.p90x.cycleStats[2]).toBeDefined();
  });

  it('should set totalDays to 7 on saveLocalState for test_workout program', async () => {
    const metadata = { ...INITIAL_METADATA };
    await saveLocalState(metadata, 1, [], 'test_workout');
    expect(metadata.cycleStats?.[1].totalDays).toBe(7);
  });

  it('should fallback to p90x on saveLocalState when program id is invalid', async () => {
    const metadata = { ...INITIAL_METADATA };
    await saveLocalState(metadata, 1, [], 'invalid_program');
    expect(metadata.cycleStats?.[1].totalDays).toBe(91);
  });

  it('should fallback to default values in saveLocalState when metadata values are missing', async () => {
    const incompleteMetadata = {
      version: 1,
      currentCycle: undefined,
      currentWeek: undefined,
      currentDay: undefined,
      gdriveLinked: false,
    } as unknown as UserMetadata;

    await saveLocalState(incompleteMetadata, 2, [], 'p90x');
    expect(incompleteMetadata.programs!.p90x.currentCycle).toBe(1);
    expect(incompleteMetadata.programs!.p90x.currentWeek).toBe(1);
    expect(incompleteMetadata.programs!.p90x.currentDay).toBe(1);
  });

  it('should fallback to default values in migrateLocalStorageToIndexedDB if properties are missing', async () => {
    const legacyState = {
      gdriveLinked: false,
      logs: [],
    };
    localStorage.setItem('workout_tracker_state', JSON.stringify(legacyState));

    const result = await migrateLocalStorageToIndexedDB();
    expect(result).toBe(true);

    const res = await loadLocalState(1);
    expect(res.metadata.version).toBe(1);
    expect(res.metadata.currentCycle).toBe(1);
    expect(res.metadata.currentWeek).toBe(1);
    expect(res.metadata.currentDay).toBe(1);
  });

  it('should fallback to cycle 1 for logs without cycle during migration', async () => {
    const legacyState = {
      version: 1,
      currentCycle: 1,
      currentWeek: 1,
      currentDay: 1,
      logs: [
        {
          id: 'log_no_cycle',
          week: 1,
          day: 1,
          workoutId: 'chest_and_back',
          skipped: false,
          exercises: {},
        },
      ],
    };
    localStorage.setItem('workout_tracker_state', JSON.stringify(legacyState));

    await migrateLocalStorageToIndexedDB();

    const logs = await loadLocalCycleLogs(1);
    expect(logs).toHaveLength(1);
    expect(logs[0].id).toBe('log_no_cycle');
  });

  it('should migrate successfully even if logs is not an array during migration', async () => {
    const legacyState = {
      version: 1,
      currentCycle: 1,
      currentWeek: 1,
      currentDay: 1,
      logs: 'not-an-array',
    };
    localStorage.setItem('workout_tracker_state', JSON.stringify(legacyState));
    const result = await migrateLocalStorageToIndexedDB();
    expect(result).toBe(true);
  });

  it('should return false if raw state is null in migrateLocalStorageToIndexedDB', async () => {
    const result = await migrateLocalStorageToIndexedDB();
    expect(result).toBe(false);
  });

  it('should return false if state is not an object in migrateLocalStorageToIndexedDB', async () => {
    localStorage.setItem('workout_tracker_state', '123');
    const result = await migrateLocalStorageToIndexedDB();
    expect(result).toBe(false);
  });

  it('should save metadata using saveLocalMetadata', async () => {
    const mockMetadata = { ...INITIAL_METADATA, currentCycle: 10 };
    await saveLocalMetadata(mockMetadata);
    expect(store['metadata']).toEqual(mockMetadata);
  });

  it('should fallback to default values in loadLocalState if metadata values are missing/empty', async () => {
    const incompleteMetadata = {
      version: 1,
      currentCycle: undefined,
      currentWeek: undefined,
      currentDay: undefined,
      gdriveLinked: false,
    } as unknown as UserMetadata;
    store['metadata'] = incompleteMetadata;

    const res = await loadLocalState();
    expect(res.metadata.activeProgramId).toBe('p90x');
    expect(res.metadata.programs?.p90x.currentCycle).toBe(1);
    expect(res.metadata.programs?.p90x.currentWeek).toBe(1);
    expect(res.metadata.programs?.p90x.currentDay).toBe(1);
  });

  it('should fallback to default values in loadLocalState when program id is not in programs', async () => {
    const incompleteMetadata = {
      version: 1,
      currentCycle: undefined,
      currentWeek: undefined,
      currentDay: undefined,
      activeProgramId: undefined, // test fallback activeProgramId
      programs: {
        other_program: { currentCycle: 1, currentWeek: 1, currentDay: 1, cycleStats: {} },
      },
      cycleStats: undefined,
    } as unknown as UserMetadata;
    store['metadata'] = incompleteMetadata;

    const res = await loadLocalState();
    expect(res.metadata.activeProgramId).toBe('p90x');
    expect(res.metadata.programs?.other_program.currentCycle).toBe(1);
    expect(res.metadata.programs?.p90x).toBeUndefined();
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
