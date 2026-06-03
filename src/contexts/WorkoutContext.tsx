import React, { createContext, useContext, useReducer, useEffect, useState, useRef } from 'react';
import type { User } from 'firebase/auth';
import type { UserMetadata, WorkoutLog, SetLog, CycleStats } from '../types';
import {
  loadLocalState,
  saveLocalState,
  saveLocalMetadata,
  loadLocalCycleLogs,
  clearLocalState,
  INITIAL_METADATA,
} from '../services/storage';
import { getScheduleForProgram } from '../data/schedule';
import {
  signInWithGoogle,
  signOutUser,
  listenForAuthChanges,
  saveFirebaseMetadata,
  loadFirebaseMetadata,
  saveFirebaseCycle,
  loadFirebaseCycle,
} from '../services/firebase';

export interface ExtendedState extends UserMetadata {
  selectedCycle: number;
  selectedWeek: number;
  selectedDay: number;
  loading: boolean;
  logs: WorkoutLog[]; // Logs of the selected cycle (for backward compatibility)
  loadedCycles: { [cycle: number]: WorkoutLog[] };
  loadingCycles: { [cycle: number]: boolean };
}

type WorkoutAction =
  | {
      type: 'INITIALIZE_STATE';
      payload: {
        metadata: UserMetadata;
        logs: WorkoutLog[];
      };
    }
  | { type: 'START_LOAD_CYCLE'; payload: number }
  | { type: 'LOAD_CYCLE_SUCCESS'; payload: { cycleNum: number; logs: WorkoutLog[] } }
  | {
      type: 'COMPLETE_WORKOUT';
      payload: {
        workoutId: string;
        exercises: { [exerciseId: string]: SetLog[] };
        abRipperCompleted: boolean;
        comments: string;
      };
    }
  | { type: 'SKIP_DAY'; payload: { workoutId: string } }
  | { type: 'SET_SELECTED_DAY'; payload: { week: number; day: number; cycle?: number } }
  | { type: 'START_NEW_CYCLE' }
  | { type: 'LINK_GDRIVE'; payload: boolean }
  | {
      type: 'SYNC_GDRIVE_DATA';
      payload: {
        metadata: UserMetadata;
        activeCycleLogs: WorkoutLog[];
      };
    }
  | {
      type: 'SYNC_FIREBASE_DATA';
      payload: {
        metadata: UserMetadata;
        activeCycleLogs: WorkoutLog[];
      };
    }
  | { type: 'RESET_DATABASE' }
  | {
      type: 'FAST_FORWARD_TO_DAY';
      payload: { week: number; day: number };
    };

interface WorkoutContextType {
  state: ExtendedState;
  user: User | null;
  syncStatus: 'idle' | 'linking' | 'syncing' | 'synced' | 'error';
  errorMsg: string;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  completeWorkout: (
    exercises: { [exerciseId: string]: SetLog[] },
    abRipperCompleted: boolean,
    comments: string
  ) => void;
  skipDay: (workoutId: string) => void;
  setSelectedDay: (week: number, day: number, cycle?: number) => void;
  startNewCycle: () => void;
  linkGoogleDrive: (linked: boolean) => void;
  syncGoogleDriveData: (metadata: UserMetadata, activeCycleLogs: WorkoutLog[]) => void;
  resetDatabase: () => void;
  loadCycleLogs: (cycleNum: number) => Promise<void>;
  switchProgram: (programId: string) => Promise<void>;
  fastForwardToDay: (week: number, day: number) => void;
}

const INITIAL_STATE: ExtendedState = {
  version: 1,
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
  selectedCycle: 1,
  selectedWeek: 1,
  selectedDay: 1,
  loading: true,
  logs: [],
  loadedCycles: {},
  loadingCycles: {},
};

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

function workoutReducer(state: ExtendedState, action: WorkoutAction): ExtendedState {
  switch (action.type) {
    case 'INITIALIZE_STATE': {
      const { metadata, logs } = action.payload;
      const activeProg = metadata.activeProgramId || 'p90x';
      const progState = (metadata.programs && metadata.programs[activeProg]) || {
        currentCycle: metadata.currentCycle || 1,
        currentWeek: metadata.currentWeek || 1,
        currentDay: metadata.currentDay || 1,
        cycleStats: metadata.cycleStats || {},
      };
      return {
        ...state,
        ...metadata,
        activeProgramId: activeProg,
        currentCycle: progState.currentCycle,
        currentWeek: progState.currentWeek,
        currentDay: progState.currentDay,
        cycleStats: progState.cycleStats || {},
        selectedCycle: progState.currentCycle,
        selectedWeek: progState.currentWeek,
        selectedDay: progState.currentDay,
        loading: false,
        logs: logs,
        loadedCycles: {
          [progState.currentCycle]: logs,
        },
      };
    }

    case 'START_LOAD_CYCLE': {
      const cycleNum = action.payload;
      return {
        ...state,
        loadingCycles: {
          ...state.loadingCycles,
          [cycleNum]: true,
        },
      };
    }

    case 'LOAD_CYCLE_SUCCESS': {
      const { cycleNum, logs } = action.payload;
      const isSelected = cycleNum === state.selectedCycle;
      return {
        ...state,
        loadedCycles: {
          ...state.loadedCycles,
          [cycleNum]: logs,
        },
        loadingCycles: {
          ...state.loadingCycles,
          [cycleNum]: false,
        },
        logs: isSelected ? logs : state.logs,
      };
    }

    case 'COMPLETE_WORKOUT': {
      const { workoutId, exercises, abRipperCompleted, comments } = action.payload;
      const logId =
        'cycle_' +
        state.selectedCycle +
        '_week_' +
        state.selectedWeek +
        '_day_' +
        state.selectedDay;

      const newLog: WorkoutLog = {
        id: logId,
        cycle: state.selectedCycle,
        week: state.selectedWeek,
        day: state.selectedDay,
        workoutId,
        dateCompleted: new Date().toISOString(),
        skipped: false,
        exercises,
        abRipperCompleted,
        comments,
      };

      const currentCycleLogs = state.loadedCycles[state.selectedCycle] || [];
      const filteredLogs = currentCycleLogs.filter(
        (log) =>
          !(
            log.cycle === state.selectedCycle &&
            log.week === state.selectedWeek &&
            log.day === state.selectedDay
          )
      );

      const nextLogs = [...filteredLogs, newLog];

      const isCompletingActiveDay =
        state.selectedCycle === state.currentCycle &&
        state.selectedWeek === state.currentWeek &&
        state.selectedDay === state.currentDay;

      let nextWeek = state.currentWeek;
      let nextDay = state.currentDay;
      let nextSelWeek = state.selectedWeek;
      let nextSelDay = state.selectedDay;

      const maxWeeks = state.activeProgramId === 'test_workout' ? 1 : 13;
      if (isCompletingActiveDay) {
        nextDay = state.currentDay + 1;
        if (nextDay > 7) {
          nextDay = 1;
          nextWeek += 1;
        }
        if (nextWeek > maxWeeks) {
          nextWeek = maxWeeks;
          nextDay = 7;
        } else {
          nextSelWeek = nextWeek;
          nextSelDay = nextDay;
        }
      }

      const totalDays = state.activeProgramId === 'test_workout' ? 7 : 91;
      const nextStats: CycleStats = {
        completedCount: nextLogs.filter((l) => !l.skipped).length,
        skippedCount: nextLogs.filter((l) => l.skipped).length,
        totalDays,
      };

      const activeProg = state.activeProgramId || 'p90x';
      const updatedPrograms = Object.assign({}, state.programs, {
        [activeProg]: {
          currentCycle: state.currentCycle,
          currentWeek: nextWeek,
          currentDay: nextDay,
          cycleStats: Object.assign(
            {},
            (state.programs &&
              state.programs[activeProg] &&
              state.programs[activeProg].cycleStats) ||
              {},
            {
              [state.selectedCycle]: nextStats,
            }
          ),
        },
      });

      return {
        ...state,
        currentWeek: nextWeek,
        currentDay: nextDay,
        selectedWeek: nextSelWeek,
        selectedDay: nextSelDay,
        logs: nextLogs,
        loadedCycles: Object.assign({}, state.loadedCycles, {
          [state.selectedCycle]: nextLogs,
        }),
        cycleStats: Object.assign({}, state.cycleStats, {
          [state.selectedCycle]: nextStats,
        }),
        programs: updatedPrograms,
      };
    }

    case 'SKIP_DAY': {
      const { workoutId } = action.payload;
      const logId =
        'cycle_' +
        state.selectedCycle +
        '_week_' +
        state.selectedWeek +
        '_day_' +
        state.selectedDay;

      const skipLog: WorkoutLog = {
        id: logId,
        cycle: state.selectedCycle,
        week: state.selectedWeek,
        day: state.selectedDay,
        workoutId,
        dateCompleted: new Date().toISOString(),
        skipped: true,
        exercises: {},
        abRipperCompleted: false,
        comments: 'Skipped',
      };

      const currentCycleLogs = state.loadedCycles[state.selectedCycle] || [];
      const filteredLogs = currentCycleLogs.filter(
        (log) =>
          !(
            log.cycle === state.selectedCycle &&
            log.week === state.selectedWeek &&
            log.day === state.selectedDay
          )
      );

      const nextLogs = [...filteredLogs, skipLog];

      const isCompletingActiveDay =
        state.selectedCycle === state.currentCycle &&
        state.selectedWeek === state.currentWeek &&
        state.selectedDay === state.currentDay;

      let nextWeek = state.currentWeek;
      let nextDay = state.currentDay;
      let nextSelWeek = state.selectedWeek;
      let nextSelDay = state.selectedDay;

      const maxWeeks = state.activeProgramId === 'test_workout' ? 1 : 13;
      if (isCompletingActiveDay) {
        nextDay = state.currentDay + 1;
        if (nextDay > 7) {
          nextDay = 1;
          nextWeek += 1;
        }
        if (nextWeek > maxWeeks) {
          nextWeek = maxWeeks;
          nextDay = 7;
        } else {
          nextSelWeek = nextWeek;
          nextSelDay = nextDay;
        }
      }

      const totalDays = state.activeProgramId === 'test_workout' ? 7 : 91;
      const nextStats: CycleStats = {
        completedCount: nextLogs.filter((l) => !l.skipped).length,
        skippedCount: nextLogs.filter((l) => l.skipped).length,
        totalDays,
      };

      const activeProg = state.activeProgramId || 'p90x';
      const updatedPrograms = Object.assign({}, state.programs, {
        [activeProg]: {
          currentCycle: state.currentCycle,
          currentWeek: nextWeek,
          currentDay: nextDay,
          cycleStats: Object.assign(
            {},
            (state.programs &&
              state.programs[activeProg] &&
              state.programs[activeProg].cycleStats) ||
              {},
            {
              [state.selectedCycle]: nextStats,
            }
          ),
        },
      });

      return {
        ...state,
        currentWeek: nextWeek,
        currentDay: nextDay,
        selectedWeek: nextSelWeek,
        selectedDay: nextSelDay,
        logs: nextLogs,
        loadedCycles: Object.assign({}, state.loadedCycles, {
          [state.selectedCycle]: nextLogs,
        }),
        cycleStats: Object.assign({}, state.cycleStats, {
          [state.selectedCycle]: nextStats,
        }),
        programs: updatedPrograms,
      };
    }

    case 'SET_SELECTED_DAY': {
      const { week, day, cycle } = action.payload;
      const targetCycle = cycle !== undefined ? cycle : state.selectedCycle;
      const hasChangedCycle = targetCycle !== state.selectedCycle;
      const targetLogs = hasChangedCycle ? state.loadedCycles[targetCycle] || [] : state.logs;

      return {
        ...state,
        selectedWeek: week,
        selectedDay: day,
        selectedCycle: targetCycle,
        logs: targetLogs,
      };
    }

    case 'START_NEW_CYCLE': {
      const nextCycle = state.currentCycle + 1;
      const totalDays = state.activeProgramId === 'test_workout' ? 7 : 91;
      const nextStats: CycleStats = {
        completedCount: 0,
        skippedCount: 0,
        totalDays,
      };
      const activeProg = state.activeProgramId || 'p90x';
      const updatedPrograms = Object.assign({}, state.programs, {
        [activeProg]: {
          currentCycle: nextCycle,
          currentWeek: 1,
          currentDay: 1,
          cycleStats: Object.assign(
            {},
            (state.programs &&
              state.programs[activeProg] &&
              state.programs[activeProg].cycleStats) ||
              {},
            {
              [nextCycle]: nextStats,
            }
          ),
        },
      });
      return {
        ...state,
        currentCycle: nextCycle,
        currentWeek: 1,
        currentDay: 1,
        selectedCycle: nextCycle,
        selectedWeek: 1,
        selectedDay: 1,
        logs: [],
        loadedCycles: Object.assign({}, state.loadedCycles, {
          [nextCycle]: [],
        }),
        cycleStats: Object.assign({}, state.cycleStats, {
          [nextCycle]: nextStats,
        }),
        programs: updatedPrograms,
      };
    }

    case 'LINK_GDRIVE': {
      return {
        ...state,
        gdriveLinked: action.payload,
      };
    }

    case 'SYNC_GDRIVE_DATA': {
      const { metadata, activeCycleLogs } = action.payload;
      return {
        ...state,
        ...metadata,
        selectedCycle: metadata.currentCycle,
        selectedWeek: metadata.currentWeek,
        selectedDay: metadata.currentDay,
        logs: activeCycleLogs,
        loadedCycles: {
          ...state.loadedCycles,
          [metadata.currentCycle]: activeCycleLogs,
        },
        loading: false,
      };
    }

    case 'SYNC_FIREBASE_DATA': {
      const { metadata, activeCycleLogs } = action.payload;
      return {
        ...state,
        ...metadata,
        selectedCycle: metadata.currentCycle,
        selectedWeek: metadata.currentWeek,
        selectedDay: metadata.currentDay,
        logs: activeCycleLogs,
        loadedCycles: {
          ...state.loadedCycles,
          [metadata.currentCycle]: activeCycleLogs,
        },
        loading: false,
      };
    }

    case 'RESET_DATABASE': {
      return {
        ...INITIAL_STATE,
        selectedCycle: 1,
        selectedWeek: 1,
        selectedDay: 1,
        loading: false,
      };
    }

    case 'FAST_FORWARD_TO_DAY': {
      const { week, day } = action.payload;
      const currentCycleLogs = state.loadedCycles[state.currentCycle] || [];

      const intermediateDays: { week: number; day: number }[] = [];
      let w = state.currentWeek;
      let d = state.currentDay;

      while (w < week || (w === week && d < day)) {
        intermediateDays.push({ week: w, day: d });
        d++;
        if (d > 7) {
          d = 1;
          w++;
        }
      }

      const newSkipLogs: WorkoutLog[] = [];
      const schedule = getScheduleForProgram(state.activeProgramId || 'p90x');
      for (const item of intermediateDays) {
        const hasLog = currentCycleLogs.some(
          (log) => log.week === item.week && log.day === item.day
        );
        if (!hasLog) {
          const dayInfo = schedule.find(
            (sd) => sd.weekNumber === item.week && sd.dayOfWeek === item.day
          );
          const workoutId = dayInfo ? dayInfo.workoutId : 'rest';
          const logId = `cycle_${state.currentCycle}_week_${item.week}_day_${item.day}`;

          newSkipLogs.push({
            id: logId,
            cycle: state.currentCycle,
            week: item.week,
            day: item.day,
            workoutId,
            dateCompleted: new Date().toISOString(),
            skipped: true,
            exercises: {},
            abRipperCompleted: false,
            comments: 'Fast-forward skipped',
          });
        }
      }

      const nextLogs = [...currentCycleLogs, ...newSkipLogs];

      const nextStats: CycleStats = {
        completedCount: nextLogs.filter((l) => !l.skipped).length,
        skippedCount: nextLogs.filter((l) => l.skipped).length,
        totalDays: 91,
      };

      const isSelectedActiveCycle = state.selectedCycle === state.currentCycle;

      return {
        ...state,
        currentWeek: week,
        currentDay: day,
        selectedWeek: week,
        selectedDay: day,
        logs: isSelectedActiveCycle ? nextLogs : state.logs,
        loadedCycles: {
          ...state.loadedCycles,
          [state.currentCycle]: nextLogs,
        },
        cycleStats: {
          ...state.cycleStats,
          [state.currentCycle]: nextStats,
        },
      };
    }

    default:
      return state;
  }
}

export const WorkoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(workoutReducer, INITIAL_STATE);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'linking' | 'syncing' | 'synced' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const wasLoggedInRef = useRef(false);
  const hasPendingChangesRef = useRef(false);

  // Load initial local state on mount
  useEffect(() => {
    loadLocalState()
      .then(({ metadata, logs }) => {
        dispatch({ type: 'INITIALIZE_STATE', payload: { metadata, logs } });
      })
      .catch((err) => {
        console.error('Failed to load initial local state:', err);
        dispatch({
          type: 'INITIALIZE_STATE',
          payload: { metadata: INITIAL_METADATA, logs: [] },
        });
      });
  }, []);

  const login = async () => {
    setSyncStatus('linking');
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Google login failed:', err);
      setSyncStatus('error');
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const logout = async () => {
    setSyncStatus('syncing');
    try {
      await signOutUser();
    } catch (err) {
      console.error('Sign out failed:', err);
      setSyncStatus('error');
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  // Reset database helper
  const resetDatabase = () => {
    hasPendingChangesRef.current = true;
    clearLocalState()
      .then(() => {
        dispatch({ type: 'RESET_DATABASE' });
      })
      .catch((err) => {
        console.error('Failed to clear database:', err);
        dispatch({ type: 'RESET_DATABASE' });
      });
  };

  // Listen for auth changes and pull/push data
  useEffect(() => {
    const unsubscribe = listenForAuthChanges(async (user) => {
      setFirebaseUser(user);
      if (user) {
        wasLoggedInRef.current = true;
        setSyncStatus('syncing');
        try {
          const cloudMetadata = await loadFirebaseMetadata(user.uid);
          if (cloudMetadata) {
            const activeLogs = await loadFirebaseCycle(
              user.uid,
              cloudMetadata.currentCycle,
              cloudMetadata.activeProgramId || 'p90x'
            );
            await saveLocalState(
              cloudMetadata,
              cloudMetadata.currentCycle,
              activeLogs,
              cloudMetadata.activeProgramId || 'p90x'
            );
            dispatch({
              type: 'SYNC_FIREBASE_DATA',
              payload: { metadata: cloudMetadata, activeCycleLogs: activeLogs },
            });
            setSyncStatus('synced');
          } else {
            // New Firebase user: migrate local state to Firestore
            const currentMetadata: UserMetadata = {
              version: state.version,
              currentCycle: state.currentCycle,
              currentWeek: state.currentWeek,
              currentDay: state.currentDay,
              gdriveLinked: false,
              cycleStats: state.cycleStats,
              activeProgramId: state.activeProgramId,
              programs: state.programs,
            };
            await saveFirebaseMetadata(user.uid, currentMetadata);
            const activeCycleLogs = state.loadedCycles[state.currentCycle] || [];
            await saveFirebaseCycle(
              user.uid,
              state.currentCycle,
              activeCycleLogs,
              state.activeProgramId || 'p90x'
            );
            setSyncStatus('synced');
          }
        } catch (err) {
          console.error('Initial cloud sync failed:', err);
          setSyncStatus('error');
          setErrorMsg(err instanceof Error ? err.message : String(err));
        }
      } else {
        setSyncStatus('idle');
        if (wasLoggedInRef.current) {
          wasLoggedInRef.current = false;
          resetDatabase();
        }
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  // Save changes to local database (metadata + selected cycle logs)
  useEffect(() => {
    if (state.loading) return;

    const metadataToPersist: UserMetadata = {
      version: state.version,
      currentCycle: state.currentCycle,
      currentWeek: state.currentWeek,
      currentDay: state.currentDay,
      gdriveLinked: false, // Turn off GDrive linking as we are now on Firebase
      cycleStats: state.cycleStats,
      activeProgramId: state.activeProgramId,
      programs: state.programs,
    };

    saveLocalMetadata(metadataToPersist).catch((err) =>
      console.error('Failed to save metadata:', err)
    );

    const selectedCycleLogs = state.loadedCycles[state.selectedCycle];
    if (selectedCycleLogs) {
      saveLocalState(
        metadataToPersist,
        state.selectedCycle,
        selectedCycleLogs,
        state.activeProgramId
      ).catch((err) =>
        console.error('Failed to save cycle ' + state.selectedCycle + ' logs:', err)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Separately tracking state fields to persist changes; full state object triggers infinite renders
  }, [
    state.currentCycle,
    state.currentWeek,
    state.currentDay,
    state.cycleStats,
    state.selectedCycle,
    state.loadedCycles,
    state.loading,
    state.activeProgramId,
  ]);

  // Save changes to Firestore if authenticated and sync is active
  useEffect(() => {
    if (state.loading || !firebaseUser || syncStatus !== 'synced') return;
    if (!hasPendingChangesRef.current) return;

    const metadataToPersist: UserMetadata = {
      version: state.version,
      currentCycle: state.currentCycle,
      currentWeek: state.currentWeek,
      currentDay: state.currentDay,
      gdriveLinked: false,
      cycleStats: state.cycleStats,
      activeProgramId: state.activeProgramId,
      programs: state.programs,
    };

    const debounceHandler = setTimeout(() => {
      const syncToFirebase = async () => {
        try {
          await saveFirebaseMetadata(firebaseUser.uid, metadataToPersist);
          const selectedCycleLogs = state.loadedCycles[state.selectedCycle];
          if (selectedCycleLogs) {
            await saveFirebaseCycle(
              firebaseUser.uid,
              state.selectedCycle,
              selectedCycleLogs,
              state.activeProgramId || 'p90x'
            );
          }
          // Successfully synced, clear the flag
          hasPendingChangesRef.current = false;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          // If we hit permission-denied (which is the rate limit error from rules),
          // retry in 60 seconds silently in the background
          if (errMsg.includes('permission-denied') || errMsg.includes('insufficient permissions')) {
            console.warn('Sync rate limit hit. Retrying in 60 seconds...', err);
            setTimeout(syncToFirebase, 60000);
          } else {
            console.error('Firebase auto-sync failed:', err);
            setSyncStatus('error');
            setErrorMsg(errMsg);
          }
        }
      };

      syncToFirebase();
    }, 2000); // 2 second debounce

    return () => clearTimeout(debounceHandler);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Selective dependency array to prevent infinite rendering loop
  }, [
    state.currentCycle,
    state.currentWeek,
    state.currentDay,
    state.cycleStats,
    state.selectedCycle,
    state.loadedCycles,
    state.loading,
    state.activeProgramId,
    firebaseUser,
    syncStatus,
  ]);

  const loadCycleLogs = async (cycleNum: number) => {
    if (state.loadedCycles[cycleNum] !== undefined || state.loadingCycles[cycleNum]) {
      return;
    }

    dispatch({ type: 'START_LOAD_CYCLE', payload: cycleNum });

    try {
      // 1. Try local IndexedDB
      let cycleLogs = await loadLocalCycleLogs(cycleNum, state.activeProgramId || 'p90x');

      // 2. If Firebase is signed in and we don't have it locally, fetch from Firestore
      if (cycleLogs.length === 0 && firebaseUser) {
        cycleLogs = await loadFirebaseCycle(
          firebaseUser.uid,
          cycleNum,
          state.activeProgramId || 'p90x'
        );
        
        // Save locally for future offline runs
        const metadataToPersist: UserMetadata = {
          version: state.version,
          currentCycle: state.currentCycle,
          currentWeek: state.currentWeek,
          currentDay: state.currentDay,
          gdriveLinked: false,
          cycleStats: state.cycleStats,
          activeProgramId: state.activeProgramId,
          programs: state.programs,
        };
        await saveLocalState(metadataToPersist, cycleNum, cycleLogs, state.activeProgramId);
      }

      dispatch({ type: 'LOAD_CYCLE_SUCCESS', payload: { cycleNum, logs: cycleLogs } });
    } catch (error) {
      console.error('Failed to load logs for cycle ' + cycleNum + ':', error);
      dispatch({ type: 'LOAD_CYCLE_SUCCESS', payload: { cycleNum, logs: [] } });
    }
  };

  const completeWorkout = (
    exercises: { [exerciseId: string]: SetLog[] },
    abRipperCompleted: boolean,
    comments: string
  ) => {
    const schedule = getScheduleForProgram(state.activeProgramId || 'p90x');
    const dayInfo = schedule.find(
      (d) => d.weekNumber === state.selectedWeek && d.dayOfWeek === state.selectedDay
    );
    const workoutId = dayInfo ? dayInfo.workoutId : 'rest';

    hasPendingChangesRef.current = true;
    dispatch({
      type: 'COMPLETE_WORKOUT',
      payload: { workoutId, exercises, abRipperCompleted, comments },
    });
  };

  const switchProgram = async (programId: string) => {
    hasPendingChangesRef.current = true;
    const metadataToPersist: UserMetadata = {
      version: state.version,
      currentCycle: state.currentCycle,
      currentWeek: state.currentWeek,
      currentDay: state.currentDay,
      gdriveLinked: false,
      cycleStats: state.cycleStats,
      activeProgramId: state.activeProgramId,
      programs: state.programs,
    };

    const currentActiveProg = state.activeProgramId || 'p90x';
    const selectedCycleLogs = state.loadedCycles[state.selectedCycle];
    if (selectedCycleLogs) {
      await saveLocalState(
        metadataToPersist,
        state.selectedCycle,
        selectedCycleLogs,
        currentActiveProg
      );
    } else {
      await saveLocalMetadata(metadataToPersist);
    }

    const metadata = await loadLocalState().then((res) => res.metadata);
    metadata.activeProgramId = programId;
    if (!metadata.programs) {
      metadata.programs = {};
    }
    if (!metadata.programs[programId]) {
      metadata.programs[programId] = {
        currentCycle: 1,
        currentWeek: 1,
        currentDay: 1,
        cycleStats: {},
      };
    }

    const targetProgState = metadata.programs[programId];
    metadata.currentCycle = targetProgState.currentCycle;
    metadata.currentWeek = targetProgState.currentWeek;
    metadata.currentDay = targetProgState.currentDay;
    metadata.cycleStats = targetProgState.cycleStats || {};

    await saveLocalMetadata(metadata);

    const targetLogs = await loadLocalCycleLogs(targetProgState.currentCycle, programId);

    dispatch({
      type: 'INITIALIZE_STATE',
      payload: {
        metadata,
        logs: targetLogs,
      },
    });
  };

  const skipDay = (workoutId: string) => {
    hasPendingChangesRef.current = true;
    dispatch({ type: 'SKIP_DAY', payload: { workoutId } });
  };

  const setSelectedDay = (week: number, day: number, cycle?: number) => {
    dispatch({ type: 'SET_SELECTED_DAY', payload: { week, day, cycle } });
  };

  const startNewCycle = () => {
    hasPendingChangesRef.current = true;
    dispatch({ type: 'START_NEW_CYCLE' });
  };

  // Kept for backward compatibility interface matching
  const linkGoogleDrive = (linked: boolean) => {
    console.log('Google Drive linking deprecated. Using Firebase.', linked);
  };

  const syncGoogleDriveData = (metadata: UserMetadata, activeCycleLogs: WorkoutLog[]) => {
    dispatch({
      type: 'SYNC_GDRIVE_DATA',
      payload: { metadata, activeCycleLogs },
    });
  };

  const fastForwardToDay = (week: number, day: number) => {
    hasPendingChangesRef.current = true;
    dispatch({ type: 'FAST_FORWARD_TO_DAY', payload: { week, day } });
  };

  return (
    <WorkoutContext.Provider
      value={{
        state,
        user: firebaseUser,
        syncStatus,
        errorMsg,
        login,
        logout,
        completeWorkout,
        skipDay,
        setSelectedDay,
        startNewCycle,
        linkGoogleDrive,
        syncGoogleDriveData,
        resetDatabase,
        loadCycleLogs,
        switchProgram,
        fastForwardToDay,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components -- Exporting hook next to provider is standard React context pattern
export const useWorkout = () => {
  const context = useContext(WorkoutContext);
  if (context === undefined) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
};
