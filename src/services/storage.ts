import type { UserState } from '../types';

const STORAGE_KEY = 'p90x_tracker_state';
const CURRENT_VERSION = 1;

export const INITIAL_STATE: UserState = {
  version: CURRENT_VERSION,
  currentCycle: 1,
  currentWeek: 1,
  currentDay: 1,
  logs: [],
  gdriveLinked: false,
};

/**
 * Perform storage schema migrations if needed
 */
export function migrateState(state: any): UserState {
  if (!state) {
    return { ...INITIAL_STATE };
  }

  // If no version exists, treat it as pre-versioned data or initial state
  const version = typeof state.version === 'number' ? state.version : 0;

  if (version === CURRENT_VERSION) {
    return state as UserState;
  }

  let migrated = { ...INITIAL_STATE, ...state };

  // Future migrations can be implemented here sequentially:
  // if (version < 2) { migrated = migrateToV2(migrated); }

  migrated.version = CURRENT_VERSION;
  return migrated as UserState;
}

/**
 * Load state from localStorage. Auto-migrates and falls back to INITIAL_STATE on errors.
 */
export function loadState(): UserState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...INITIAL_STATE };
    }
    const parsed = JSON.parse(raw);
    return migrateState(parsed);
  } catch (error) {
    console.error('Failed to load state from localStorage:', error);
    return { ...INITIAL_STATE };
  }
}

/**
 * Save state to localStorage
 */
export function saveState(state: UserState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save state to localStorage:', error);
  }
}

/**
 * Clear all data from localStorage
 */
export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear state from localStorage:', error);
  }
}

/**
 * Validate imported JSON schema to verify it is a valid backup
 */
export function validateBackup(data: any): data is UserState {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.currentCycle !== 'number') return false;
  if (typeof data.currentWeek !== 'number') return false;
  if (typeof data.currentDay !== 'number') return false;
  if (!Array.isArray(data.logs)) return false;
  return true;
}
