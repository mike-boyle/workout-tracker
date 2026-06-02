import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadLocalState,
  loadLocalCycleLogs,
  saveLocalState,
  clearLocalState,
  validateBackup,
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
          id: 'log_cycle_2',
          cycle: 2,
          week: 2,
          day: 2,
          workoutId: 'plyometrics',
          skipped: true,
          exercises: {},
        }
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
      completedCount: 1,
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
    expect(cycle1Logs.length).toBe(1);
    expect(cycle1Logs[0].id).toBe('log_cycle_1');
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
});
