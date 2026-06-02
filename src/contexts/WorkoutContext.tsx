import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { UserMetadata, WorkoutLog, SetLog, CycleStats } from '../types';
import {
  loadLocalState,
  saveLocalState,
  saveLocalMetadata,
  loadLocalCycleLogs,
  clearLocalState,
  INITIAL_METADATA,
} from '../services/storage';
import { p90xClassicSchedule } from '../data/schedule';

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
  | { type: 'RESET_DATABASE' }
  | {
      type: 'FAST_FORWARD_TO_DAY';
      payload: { week: number; day: number };
    };

interface WorkoutContextType {
  state: ExtendedState;
  completeWorkout: (
    exercises: { [exerciseId: string]: SetLog[] },
    abRipperCompleted: boolean,
    comments: string
  ) => void;
  skipDay: (workoutId: string) => void;
  setSelectedDay: (week: number, day: number, cycle?: number) => void;
  startNewCycle: () => void;
  linkGoogleDrive: (linked: boolean) => void;
  syncGoogleDriveData: (
    metadata: UserMetadata,
    activeCycleLogs: WorkoutLog[]
  ) => void;
  resetDatabase: () => void;
  loadCycleLogs: (cycleNum: number) => Promise<void>;
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
      return {
        ...state,
        ...metadata,
        selectedCycle: metadata.currentCycle,
        selectedWeek: metadata.currentWeek,
        selectedDay: metadata.currentDay,
        loading: false,
        logs: logs,
        loadedCycles: {
          ...state.loadedCycles,
          [metadata.currentCycle]: logs,
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
      const logId = `cycle_${state.selectedCycle}_week_${state.selectedWeek}_day_${state.selectedDay}`;

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

      if (isCompletingActiveDay) {
        nextDay = state.currentDay + 1;
        if (nextDay > 7) {
          nextDay = 1;
          nextWeek += 1;
        }
        if (nextWeek > 13) {
          nextWeek = 13;
          nextDay = 7;
        } else {
          nextSelWeek = nextWeek;
          nextSelDay = nextDay;
        }
      }

      const nextStats: CycleStats = {
        completedCount: nextLogs.filter((l) => !l.skipped).length,
        skippedCount: nextLogs.filter((l) => l.skipped).length,
        totalDays: 91,
      };

      return {
        ...state,
        currentWeek: nextWeek,
        currentDay: nextDay,
        selectedWeek: nextSelWeek,
        selectedDay: nextSelDay,
        logs: nextLogs,
        loadedCycles: {
          ...state.loadedCycles,
          [state.selectedCycle]: nextLogs,
        },
        cycleStats: {
          ...state.cycleStats,
          [state.selectedCycle]: nextStats,
        },
      };
    }

    case 'SKIP_DAY': {
      const { workoutId } = action.payload;
      const logId = `cycle_${state.selectedCycle}_week_${state.selectedWeek}_day_${state.selectedDay}`;

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

      if (isCompletingActiveDay) {
        nextDay = state.currentDay + 1;
        if (nextDay > 7) {
          nextDay = 1;
          nextWeek += 1;
        }
        if (nextWeek > 13) {
          nextWeek = 13;
          nextDay = 7;
        } else {
          nextSelWeek = nextWeek;
          nextSelDay = nextDay;
        }
      }

      const nextStats: CycleStats = {
        completedCount: nextLogs.filter((l) => !l.skipped).length,
        skippedCount: nextLogs.filter((l) => l.skipped).length,
        totalDays: 91,
      };

      return {
        ...state,
        currentWeek: nextWeek,
        currentDay: nextDay,
        selectedWeek: nextSelWeek,
        selectedDay: nextSelDay,
        logs: nextLogs,
        loadedCycles: {
          ...state.loadedCycles,
          [state.selectedCycle]: nextLogs,
        },
        cycleStats: {
          ...state.cycleStats,
          [state.selectedCycle]: nextStats,
        },
      };
    }

    case 'SET_SELECTED_DAY': {
      const { week, day, cycle } = action.payload;
      const targetCycle = cycle !== undefined ? cycle : state.selectedCycle;
      const hasChangedCycle = targetCycle !== state.selectedCycle;
      const targetLogs = hasChangedCycle ? (state.loadedCycles[targetCycle] || []) : state.logs;

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
      const nextStats: CycleStats = {
        completedCount: 0,
        skippedCount: 0,
        totalDays: 91,
      };
      return {
        ...state,
        currentCycle: nextCycle,
        currentWeek: 1,
        currentDay: 1,
        selectedCycle: nextCycle,
        selectedWeek: 1,
        selectedDay: 1,
        logs: [],
        loadedCycles: {
          ...state.loadedCycles,
          [nextCycle]: [],
        },
        cycleStats: {
          ...state.cycleStats,
          [nextCycle]: nextStats,
        },
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
      for (const item of intermediateDays) {
        const hasLog = currentCycleLogs.some(
          (log) => log.week === item.week && log.day === item.day
        );
        if (!hasLog) {
          const dayInfo = p90xClassicSchedule.find(
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

  // Save changes to local database (metadata + selected cycle logs)
  useEffect(() => {
    if (state.loading) return;

    const {
      selectedCycle,
      selectedWeek,
      selectedDay,
      loading,
      logs,
      loadedCycles,
      loadingCycles,
      ...metadataToPersist
    } = state;

    saveLocalMetadata(metadataToPersist).catch((err) =>
      console.error('Failed to save metadata:', err)
    );

    const selectedCycleLogs = loadedCycles[state.selectedCycle];
    if (selectedCycleLogs) {
      saveLocalState(metadataToPersist, state.selectedCycle, selectedCycleLogs).catch((err) =>
        console.error(`Failed to save cycle ${state.selectedCycle} logs:`, err)
      );
    }
  }, [
    state.currentCycle,
    state.currentWeek,
    state.currentDay,
    state.gdriveLinked,
    state.metadataFileId,
    state.cycleFileIds,
    state.cycleTimestamps,
    state.cycleStats,
    state.selectedCycle,
    state.loadedCycles,
    state.loading,
  ]);

  const loadCycleLogs = async (cycleNum: number) => {
    // If already loaded or currently loading, skip
    if (state.loadedCycles[cycleNum] !== undefined || state.loadingCycles[cycleNum]) {
      return;
    }

    dispatch({ type: 'START_LOAD_CYCLE', payload: cycleNum });

    try {
      // 1. Try local IndexedDB
      let cycleLogs = await loadLocalCycleLogs(cycleNum);

      // 2. If GDrive is linked and we don't have it locally, fetch from GDrive
      const fileId = state.cycleFileIds?.[cycleNum];
      if (cycleLogs.length === 0 && state.gdriveLinked && fileId) {
        const { downloadCycleLogs } = await import('../services/gdrive');
        cycleLogs = await downloadCycleLogs(fileId);
        // Save locally for future runs
        const {
          selectedCycle,
          selectedWeek,
          selectedDay,
          loading,
          logs,
          loadedCycles,
          loadingCycles,
          ...metadataToPersist
        } = state;
        await saveLocalState(metadataToPersist, cycleNum, cycleLogs);
      }

      dispatch({ type: 'LOAD_CYCLE_SUCCESS', payload: { cycleNum, logs: cycleLogs } });
    } catch (error) {
      console.error(`Failed to load logs for cycle ${cycleNum}:`, error);
      dispatch({ type: 'LOAD_CYCLE_SUCCESS', payload: { cycleNum, logs: [] } });
    }
  };

  const completeWorkout = (
    exercises: { [exerciseId: string]: SetLog[] },
    abRipperCompleted: boolean,
    comments: string
  ) => {
    const dayInfo = p90xClassicSchedule.find(
      (d) => d.weekNumber === state.selectedWeek && d.dayOfWeek === state.selectedDay
    );
    const workoutId = dayInfo ? dayInfo.workoutId : 'rest';

    dispatch({
      type: 'COMPLETE_WORKOUT',
      payload: { workoutId, exercises, abRipperCompleted, comments },
    });
  };

  const skipDay = (workoutId: string) => {
    dispatch({ type: 'SKIP_DAY', payload: { workoutId } });
  };

  const setSelectedDay = (week: number, day: number, cycle?: number) => {
    dispatch({ type: 'SET_SELECTED_DAY', payload: { week, day, cycle } });
  };

  const startNewCycle = () => {
    dispatch({ type: 'START_NEW_CYCLE' });
  };

  const linkGoogleDrive = (linked: boolean) => {
    dispatch({ type: 'LINK_GDRIVE', payload: linked });
  };

  const syncGoogleDriveData = (
    metadata: UserMetadata,
    activeCycleLogs: WorkoutLog[]
  ) => {
    dispatch({
      type: 'SYNC_GDRIVE_DATA',
      payload: { metadata, activeCycleLogs },
    });
  };

  const resetDatabase = () => {
    clearLocalState()
      .then(() => {
        dispatch({ type: 'RESET_DATABASE' });
      })
      .catch((err) => {
        console.error('Failed to clear database:', err);
        dispatch({ type: 'RESET_DATABASE' });
      });
  };

  const fastForwardToDay = (week: number, day: number) => {
    dispatch({ type: 'FAST_FORWARD_TO_DAY', payload: { week, day } });
  };

  return (
    <WorkoutContext.Provider
      value={{
        state,
        completeWorkout,
        skipDay,
        setSelectedDay,
        startNewCycle,
        linkGoogleDrive,
        syncGoogleDriveData,
        resetDatabase,
        loadCycleLogs,
        fastForwardToDay,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
};

export const useWorkout = () => {
  const context = useContext(WorkoutContext);
  if (context === undefined) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
};
