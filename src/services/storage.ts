import type { UserMetadata, WorkoutLog } from '../types';
import { PROGRAMS } from '../data/schedule';
import { assertDefined } from '../utils/assert';

const CURRENT_VERSION = 1;

export const INITIAL_METADATA: UserMetadata = {
  version: CURRENT_VERSION,
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
    test_workout: {
      currentCycle: 1,
      currentWeek: 1,
      currentDay: 1,
      cycleStats: {},
    },
  },
};

class WorkoutTrackerDB {
  private dbName = 'WorkoutTrackerDB';
  private version = 1;

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('keyValueStore')) {
          db.createObjectStore('keyValueStore');
        }
      };
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const db = await this.openDB();
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction('keyValueStore', 'readonly');
        const store = transaction.objectStore('keyValueStore');
        const request = store.get(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve((request.result as T) || null);
      });
    } catch (e) {
      console.error('IndexedDB get error:', e);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      const db = await this.openDB();
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction('keyValueStore', 'readwrite');
        const store = transaction.objectStore('keyValueStore');
        const request = store.put(value, key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (e) {
      console.error('IndexedDB set error:', e);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const db = await this.openDB();
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction('keyValueStore', 'readwrite');
        const store = transaction.objectStore('keyValueStore');
        const request = store.delete(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (e) {
      console.error('IndexedDB delete error:', e);
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.openDB();
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction('keyValueStore', 'readwrite');
        const store = transaction.objectStore('keyValueStore');
        const request = store.clear();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (e) {
      console.error('IndexedDB clear error:', e);
    }
  }
}

export const db = new WorkoutTrackerDB();

export function ensureMetadataPrograms(metadata: UserMetadata): UserMetadata {
  let programs = metadata.programs;
  let changed = false;

  if (!programs) {
    programs = {};
    changed = true;
  }

  const newPrograms = { ...programs };
  for (const progId of Object.keys(PROGRAMS)) {
    if (!newPrograms[progId]) {
      newPrograms[progId] = {
        currentCycle: 1,
        currentWeek: 1,
        currentDay: 1,
        cycleStats: {},
      };
      changed = true;
    }
  }

  if (changed) {
    return {
      ...metadata,
      programs: newPrograms,
    };
  }

  return metadata;
}

/**
 * Loads metadata and active/specified cycle logs.
 */
export async function loadLocalState(selectedCycle?: number): Promise<{
  metadata: UserMetadata;
  logs: WorkoutLog[];
}> {
  let metadata = await db.get<UserMetadata>('metadata');
  if (!metadata) {
    metadata = { ...INITIAL_METADATA };
    await db.set('metadata', metadata);
  }

  // Ensure all programs are initialized in the loaded metadata
  const updatedMetadata = ensureMetadataPrograms(metadata);
  if (updatedMetadata !== metadata) {
    metadata = updatedMetadata;
    await db.set('metadata', metadata);
  }

  const progId = metadata.activeProgramId;
  const progState = metadata.programs[progId];
  assertDefined(progState, `Program state not found for program ID: ${progId}`);
  const cycleToLoad = selectedCycle || progState.currentCycle;

  const key = progId + '_cycle_' + cycleToLoad + '_logs';
  const logs = (await db.get<WorkoutLog[]>(key)) || [];

  return { metadata, logs };
}

/**
 * Loads a specific cycle's logs from IndexedDB.
 */
export async function loadLocalCycleLogs(
  cycleNum: number,
  activeProgramId: string = 'p90x'
): Promise<WorkoutLog[]> {
  const key = activeProgramId + '_cycle_' + cycleNum + '_logs';
  return (await db.get<WorkoutLog[]>(key)) || [];
}

/**
 * Saves local state: metadata and logs for a specific cycle.
 */
export async function saveLocalState(
  metadata: UserMetadata,
  cycleNum: number,
  cycleLogs: WorkoutLog[],
  activeProgramId: string = 'p90x'
): Promise<void> {
  const completedCount = cycleLogs.filter((l) => !l.skipped).length;
  const skippedCount = cycleLogs.filter((l) => l.skipped).length;
  const prog = PROGRAMS[activeProgramId];
  assertDefined(prog, `Program definition not found for: ${activeProgramId}`);
  const totalDays = prog.totalDays;

  const progState = metadata.programs[activeProgramId];
  assertDefined(progState, `Program state not found for: ${activeProgramId}`);
  progState.cycleStats[cycleNum] = {
    completedCount,
    skippedCount,
    totalDays,
  };

  metadata.cycleStats[cycleNum] = {
    completedCount,
    skippedCount,
    totalDays,
  };

  metadata.cycleTimestamps[cycleNum] = new Date().toISOString();

  // Save logs and metadata to IndexedDB
  const key = activeProgramId + '_cycle_' + cycleNum + '_logs';
  await db.set(key, cycleLogs);
  await db.set('metadata', metadata);
}

export async function saveLocalMetadata(metadata: UserMetadata): Promise<void> {
  await db.set('metadata', metadata);
}

/**
 * Clear all data from local database
 */
export async function clearLocalState(): Promise<void> {
  await db.clear();
  localStorage.removeItem('workout_tracker_state');
  localStorage.removeItem('workout_tracker_gdrive_file_id');
  localStorage.removeItem('workout_tracker_gdrive_access_token');
  localStorage.removeItem('workout_tracker_gdrive_token_expires_at');
}

/**
 * Validate imported backup (adapted for new UserMetadata structure)
 */
export function validateBackup(data: unknown): data is UserMetadata {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (typeof d.currentCycle !== 'number') return false;
  if (typeof d.currentWeek !== 'number') return false;
  if (typeof d.currentDay !== 'number') return false;
  return true;
}
