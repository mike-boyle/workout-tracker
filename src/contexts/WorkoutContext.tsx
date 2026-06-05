import React, { createContext, useContext, useReducer, useEffect, useState, useRef } from 'react';
import type { User } from 'firebase/auth';
import type { UserMetadata, WorkoutLog, SetLog } from '../types';
import { assertDefined } from '../utils/assert';
import {
  loadLocalState,
  saveLocalState,
  saveLocalMetadata,
  loadLocalCycleLogs,
  clearLocalState,
  INITIAL_METADATA,
  ensureMetadataPrograms,
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
  logAnalyticsEvent,
} from '../services/firebase';
import { ENABLE_APP_CHECK } from '../config';
import {
  type ExtendedState,
  type WorkoutAction,
  type WorkoutContextType,
  INITIAL_STATE,
} from './workoutTypes';
import { workoutReducer } from './workoutReducer';

export type { ExtendedState, WorkoutAction, WorkoutContextType };

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export const WorkoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(workoutReducer, INITIAL_STATE);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'linking' | 'syncing' | 'synced' | 'error'>(
    'idle'
  );
  const [errorMsg, setErrorMsg] = useState('');
  const wasLoggedInRef = useRef(false);
  const hasPendingChangesRef = useRef(false);
  const syncedLogsRef = useRef<{ [cycle: number]: WorkoutLog[] }>({});

  // Load initial local state on mount
  useEffect(() => {
    loadLocalState()
      .then(({ metadata, logs }) => {
        syncedLogsRef.current = {
          [metadata.currentCycle]: logs,
        };
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
    syncedLogsRef.current = {};
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
        if (!wasLoggedInRef.current) {
          logAnalyticsEvent('login', { method: 'google' });
        }
        wasLoggedInRef.current = true;

        if (!ENABLE_APP_CHECK) {
          setSyncStatus('idle');
          return;
        }

        setSyncStatus('syncing');
        try {
          let cloudMetadata = await loadFirebaseMetadata(user.uid);
          if (cloudMetadata) {
            cloudMetadata = ensureMetadataPrograms(cloudMetadata);
            const activeLogs = await loadFirebaseCycle(
              user.uid,
              cloudMetadata.currentCycle,
              cloudMetadata.activeProgramId
            );
            await saveLocalState(
              cloudMetadata,
              cloudMetadata.currentCycle,
              activeLogs,
              cloudMetadata.activeProgramId
            );
            syncedLogsRef.current = {
              [cloudMetadata.currentCycle]: activeLogs,
            };
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
              cycleTimestamps: state.cycleTimestamps,
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
              state.activeProgramId
            );
            syncedLogsRef.current = {
              [state.currentCycle]: activeCycleLogs,
            };
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
          logAnalyticsEvent('logout');
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
      cycleTimestamps: state.cycleTimestamps,
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
    if (!ENABLE_APP_CHECK) return;
    if (state.loading || !firebaseUser || syncStatus !== 'synced') return;
    if (!hasPendingChangesRef.current) return;

    const metadataToPersist: UserMetadata = {
      version: state.version,
      currentCycle: state.currentCycle,
      currentWeek: state.currentWeek,
      currentDay: state.currentDay,
      cycleTimestamps: state.cycleTimestamps,
      cycleStats: state.cycleStats,
      activeProgramId: state.activeProgramId,
      programs: state.programs,
    };

    const debounceHandler = setTimeout(() => {
      const syncToFirebase = async () => {
        try {
          await saveFirebaseMetadata(firebaseUser.uid, metadataToPersist);
          // Sync changes for all loaded cycles that have differences
          for (const cycleStr of Object.keys(state.loadedCycles)) {
            const cycleNum = parseInt(cycleStr, 10);
            const currentLogs = state.loadedCycles[cycleNum];
            assertDefined(currentLogs, `Loaded cycle logs not found for cycle: ${cycleNum}`);

            let syncedLogs = syncedLogsRef.current[cycleNum];
            if (!syncedLogs) {
              syncedLogs = [];
            }
            const syncedMap = new Map(syncedLogs.map((l) => [l.id, l]));

            const changedLogs = currentLogs.filter((log) => {
              const syncedLog = syncedMap.get(log.id);
              if (!syncedLog) return true; // New log
              return (
                log.skipped !== syncedLog.skipped ||
                log.abRipperCompleted !== syncedLog.abRipperCompleted ||
                log.comments !== syncedLog.comments ||
                log.dateCompleted !== syncedLog.dateCompleted ||
                JSON.stringify(log.exercises) !== JSON.stringify(syncedLog.exercises)
              );
            });

            if (changedLogs.length > 0) {
              await saveFirebaseCycle(
                firebaseUser.uid,
                cycleNum,
                changedLogs,
                state.activeProgramId
              );
            }

            // Mark these as synced by setting syncedLogsRef to the full current logs array
            syncedLogsRef.current[cycleNum] = currentLogs;
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
      let cycleLogs = await loadLocalCycleLogs(cycleNum, state.activeProgramId);

      // 2. If Firebase is signed in, App Check is enabled, and we don't have it locally, fetch from Firestore
      if (cycleLogs.length === 0 && firebaseUser && ENABLE_APP_CHECK) {
        cycleLogs = await loadFirebaseCycle(firebaseUser.uid, cycleNum, state.activeProgramId);

        // Save locally for future offline runs
        const metadataToPersist: UserMetadata = {
          version: state.version,
          currentCycle: state.currentCycle,
          currentWeek: state.currentWeek,
          currentDay: state.currentDay,
          cycleTimestamps: state.cycleTimestamps,
          cycleStats: state.cycleStats,
          activeProgramId: state.activeProgramId,
          programs: state.programs,
        };
        await saveLocalState(metadataToPersist, cycleNum, cycleLogs, state.activeProgramId);
      }

      syncedLogsRef.current[cycleNum] = cycleLogs;
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
    const schedule = getScheduleForProgram(state.activeProgramId);
    const dayInfo = schedule.find(
      (d) => d.weekNumber === state.selectedWeek && d.dayOfWeek === state.selectedDay
    );
    assertDefined(
      dayInfo,
      `No schedule day found for week ${state.selectedWeek} day ${state.selectedDay}`
    );
    const workoutId = dayInfo.workoutId;

    logAnalyticsEvent('complete_workout', {
      workout_id: workoutId,
      week: state.selectedWeek,
      day: state.selectedDay,
      cycle: state.selectedCycle,
      ab_ripper_completed: abRipperCompleted,
      has_comments: comments.trim().length > 0,
      program_id: state.activeProgramId,
    });

    hasPendingChangesRef.current = true;
    dispatch({
      type: 'COMPLETE_WORKOUT',
      payload: { workoutId, exercises, abRipperCompleted, comments },
    });
  };

  const switchProgram = async (programId: string) => {
    logAnalyticsEvent('switch_program', {
      from_program: state.activeProgramId,
      to_program: programId,
    });

    hasPendingChangesRef.current = true;
    const metadataToPersist: UserMetadata = {
      version: state.version,
      currentCycle: state.currentCycle,
      currentWeek: state.currentWeek,
      currentDay: state.currentDay,
      cycleTimestamps: state.cycleTimestamps,
      cycleStats: state.cycleStats,
      activeProgramId: state.activeProgramId,
      programs: state.programs,
    };

    const currentActiveProg = state.activeProgramId;
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

    const targetProgState = metadata.programs[programId];
    assertDefined(targetProgState, `Program state not found for program: ${programId}`);
    metadata.currentCycle = targetProgState.currentCycle;
    metadata.currentWeek = targetProgState.currentWeek;
    metadata.currentDay = targetProgState.currentDay;
    metadata.cycleStats = targetProgState.cycleStats;

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
    logAnalyticsEvent('skip_day', {
      workout_id: workoutId,
      week: state.selectedWeek,
      day: state.selectedDay,
      cycle: state.selectedCycle,
      program_id: state.activeProgramId,
    });

    hasPendingChangesRef.current = true;
    dispatch({ type: 'SKIP_DAY', payload: { workoutId } });
  };

  const setSelectedDay = (week: number, day: number, cycle?: number) => {
    dispatch({ type: 'SET_SELECTED_DAY', payload: { week, day, cycle } });
  };

  const startNewCycle = () => {
    logAnalyticsEvent('start_new_cycle', {
      next_cycle: state.currentCycle + 1,
      program_id: state.activeProgramId,
    });

    hasPendingChangesRef.current = true;
    dispatch({ type: 'START_NEW_CYCLE' });
  };

  const fastForwardToDay = (week: number, day: number) => {
    logAnalyticsEvent('fast_forward_to_day', {
      from_week: state.currentWeek,
      from_day: state.currentDay,
      to_week: week,
      to_day: day,
      cycle: state.currentCycle,
      program_id: state.activeProgramId,
    });

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
