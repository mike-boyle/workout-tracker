import type { UserMetadata, WorkoutLog, CycleStats } from '../types';
import { PROGRAMS } from '../data/schedule';

const CURRENT_VERSION = 1;

export const INITIAL_METADATA: UserMetadata = {
  version: CURRENT_VERSION,
  currentCycle: 1,
  currentWeek: 1,
  currentDay: 1,
  gdriveLinked: false,
  metadataFileId: undefined,
  cycleFileIds: {},
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

/**
 * Migrates old localStorage data to the new segmented IndexedDB format.
 */
export async function migrateLocalStorageToIndexedDB(): Promise<boolean> {
  try {
    const raw = localStorage.getItem('workout_tracker_state');
    if (!raw) return false;

    const state = JSON.parse(raw);
    if (!state || typeof state !== 'object') return false;

    // Migrate metadata
    const metadata: UserMetadata = {
      version: typeof state.version === 'number' ? state.version : CURRENT_VERSION,
      currentCycle: typeof state.currentCycle === 'number' ? state.currentCycle : 1,
      currentWeek: typeof state.currentWeek === 'number' ? state.currentWeek : 1,
      currentDay: typeof state.currentDay === 'number' ? state.currentDay : 1,
      gdriveLinked: !!state.gdriveLinked,
      metadataFileId: localStorage.getItem('workout_tracker_gdrive_file_id') || undefined,
      cycleFileIds: {},
      cycleTimestamps: {},
      cycleStats: {},
    };

    // Clean up GDrive old file ID from localStorage
    localStorage.removeItem('workout_tracker_gdrive_file_id');

    // Group logs by cycle
    const logs = Array.isArray(state.logs) ? state.logs : [];
    const logsByCycle: { [cycle: number]: WorkoutLog[] } = {};

    logs.forEach((log: WorkoutLog) => {
      const cycle = typeof log.cycle === 'number' ? log.cycle : 1;
      if (!logsByCycle[cycle]) {
        logsByCycle[cycle] = [];
      }
      logsByCycle[cycle].push(log);
    });

    // Save cycle logs to IndexedDB and compute stats
    const statsMap: { [cycle: number]: CycleStats } = {};
    for (const cycleStr of Object.keys(logsByCycle)) {
      const cycleNum = parseInt(cycleStr, 10);
      const cycleLogs = logsByCycle[cycleNum];

      // Save logs
      await db.set(`cycle_${cycleNum}_logs`, cycleLogs);

      // Compute stats
      const completedCount = cycleLogs.filter((l) => !l.skipped).length;
      const skippedCount = cycleLogs.filter((l) => l.skipped).length;
      const prog = PROGRAMS.p90x;
      statsMap[cycleNum] = {
        completedCount,
        skippedCount,
        totalDays: prog.totalDays,
      };

      // Set timestamp
      metadata.cycleTimestamps![cycleNum] = new Date().toISOString();
    }

    metadata.cycleStats = statsMap;

    // Save metadata to IndexedDB
    await db.set('metadata', metadata);

    // Delete old localStorage key
    localStorage.removeItem('workout_tracker_state');
    console.log('Successfully migrated localStorage state to IndexedDB.');
    return true;
  } catch (error) {
    console.error('Failed to migrate localStorage to IndexedDB:', error);
    return false;
  }
}

/**
 * Loads metadata and active/specified cycle logs.
 * Performs localStorage migration if necessary.
 */
export async function loadLocalState(selectedCycle?: number): Promise<{
  metadata: UserMetadata;
  logs: WorkoutLog[];
}> {
  // Try migration first
  await migrateLocalStorageToIndexedDB();

  let metadata = await db.get<UserMetadata>('metadata');
  if (!metadata) {
    metadata = { ...INITIAL_METADATA };
    await db.set('metadata', metadata);
  }

  // Ensure activeProgramId and programs are present
  if (!metadata.activeProgramId) {
    metadata.activeProgramId = 'p90x';
  }
  if (!metadata.programs) {
    metadata.programs = {
      p90x: {
        currentCycle: metadata.currentCycle || 1,
        currentWeek: metadata.currentWeek || 1,
        currentDay: metadata.currentDay || 1,
        cycleStats: metadata.cycleStats || {},
      },
    };
    await db.set('metadata', metadata);
  }

  const progId = metadata.activeProgramId;
  const progState = metadata.programs[progId] || {
    currentCycle: metadata.currentCycle || 1,
    currentWeek: metadata.currentWeek || 1,
    currentDay: metadata.currentDay || 1,
    cycleStats: metadata.cycleStats || {},
  };
  const cycleToLoad = selectedCycle || progState.currentCycle;

  // Load logs: program-prefixed key with legacy fallback
  const newKey = progId + '_cycle_' + cycleToLoad + '_logs';
  let logs = await db.get<WorkoutLog[]>(newKey);
  if (!logs) {
    const legacyKey = 'cycle_' + cycleToLoad + '_logs';
    const legacyLogs = await db.get<WorkoutLog[]>(legacyKey);
    if (legacyLogs) {
      logs = legacyLogs;
      await db.set(newKey, logs);
    } else {
      logs = [];
    }
  }

  return { metadata, logs };
}

/**
 * Loads a specific cycle's logs from IndexedDB.
 */
export async function loadLocalCycleLogs(
  cycleNum: number,
  activeProgramId: string = 'p90x'
): Promise<WorkoutLog[]> {
  const newKey = activeProgramId + '_cycle_' + cycleNum + '_logs';
  let logs = await db.get<WorkoutLog[]>(newKey);
  if (!logs) {
    const legacyKey = 'cycle_' + cycleNum + '_logs';
    const legacyLogs = await db.get<WorkoutLog[]>(legacyKey);
    if (legacyLogs) {
      logs = legacyLogs;
      await db.set(newKey, logs);
    } else {
      logs = [];
    }
  }
  return logs;
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
  const prog = PROGRAMS[activeProgramId] || PROGRAMS.p90x;
  const totalDays = prog.totalDays;

  if (!metadata.programs) {
    metadata.programs = {};
  }
  if (!metadata.programs[activeProgramId]) {
    metadata.programs[activeProgramId] = {
      currentCycle: metadata.currentCycle || 1,
      currentWeek: metadata.currentWeek || 1,
      currentDay: metadata.currentDay || 1,
      cycleStats: {},
    };
  }

  if (!metadata.programs[activeProgramId].cycleStats) {
    metadata.programs[activeProgramId].cycleStats = {};
  }
  metadata.programs[activeProgramId].cycleStats[cycleNum] = {
    completedCount,
    skippedCount,
    totalDays,
  };

  if (!metadata.cycleStats) metadata.cycleStats = {};
  metadata.cycleStats[cycleNum] = {
    completedCount,
    skippedCount,
    totalDays,
  };

  if (!metadata.cycleTimestamps) metadata.cycleTimestamps = {};
  metadata.cycleTimestamps[cycleNum] = new Date().toISOString();

  // Save logs and metadata to IndexedDB
  const newKey = activeProgramId + '_cycle_' + cycleNum + '_logs';
  await db.set(newKey, cycleLogs);
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
