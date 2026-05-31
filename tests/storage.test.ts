import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadState,
  saveState,
  clearState,
  validateBackup,
  migrateState,
  INITIAL_STATE,
} from '../src/services/storage';
import { UserState } from '../src/types';

describe('Storage Service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should return INITIAL_STATE when localStorage is empty', () => {
    const state = loadState();
    expect(state).toEqual(INITIAL_STATE);
  });

  it('should successfully save and load the state', () => {
    const mockState: UserState = {
      version: 1,
      currentCycle: 2,
      currentWeek: 4,
      currentDay: 2,
      logs: [
        {
          id: 'test_log_1',
          cycle: 1,
          week: 1,
          day: 1,
          workoutId: 'chest_and_back',
          dateCompleted: new Date().toISOString(),
          skipped: false,
          exercises: {
            cb_standard_pushup: [{ reps: 15, weight: 0, assisted: false }],
          },
          abRipperCompleted: true,
          comments: 'Felt great!',
        },
      ],
      gdriveLinked: true,
    };

    saveState(mockState);
    const loaded = loadState();
    expect(loaded).toEqual(mockState);
  });

  it('should handle corrupted JSON by falling back to INITIAL_STATE', () => {
    localStorage.setItem('p90x_tracker_state', '{ corrupted_json: ');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const state = loadState();
    expect(state).toEqual(INITIAL_STATE);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should clear state from localStorage', () => {
    const mockState: UserState = { ...INITIAL_STATE, currentCycle: 5 };
    saveState(mockState);
    expect(loadState().currentCycle).toBe(5);

    clearState();
    expect(loadState()).toEqual(INITIAL_STATE);
  });

  it('should migrate unversioned or legacy state to current version', () => {
    const legacyState = {
      currentCycle: 2,
      currentWeek: 3,
      currentDay: 1,
      logs: [],
    };

    const migrated = migrateState(legacyState);
    expect(migrated.version).toBe(1);
    expect(migrated.currentCycle).toBe(2);
    expect(migrated.gdriveLinked).toBe(false); // Default property filled in
  });

  it('should validate valid backup data', () => {
    const validData = {
      version: 1,
      currentCycle: 1,
      currentWeek: 1,
      currentDay: 3,
      logs: [],
      gdriveLinked: false,
    };
    expect(validateBackup(validData)).toBe(true);
  });

  it('should reject invalid backup data', () => {
    expect(validateBackup(null)).toBe(false);
    expect(validateBackup(undefined)).toBe(false);
    expect(validateBackup('string')).toBe(false);
    expect(validateBackup({ currentCycle: 'not-a-number' })).toBe(false);
    expect(
      validateBackup({ currentCycle: 1, currentWeek: 1, currentDay: 1, logs: 'not-an-array' })
    ).toBe(false);
  });
});
