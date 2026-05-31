import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { UserState, WorkoutLog, SetLog } from '../types';
import { loadState, saveState, INITIAL_STATE } from '../services/storage';
import { p90xClassicSchedule } from '../data/schedule';

interface ExtendedState extends UserState {
  selectedCycle: number;
  selectedWeek: number;
  selectedDay: number;
}

type WorkoutAction =
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
        logs: WorkoutLog[];
        currentCycle: number;
        currentWeek: number;
        currentDay: number;
      };
    }
  | { type: 'RESET_DATABASE' };

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
    logs: WorkoutLog[],
    currentCycle: number,
    currentWeek: number,
    currentDay: number
  ) => void;
  resetDatabase: () => void;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

function workoutReducer(state: ExtendedState, action: WorkoutAction): ExtendedState {
  switch (action.type) {
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

      // Filter out any existing log for this exact day in this cycle to allow editing
      const filteredLogs = state.logs.filter(
        (log) =>
          !(
            log.cycle === state.selectedCycle &&
            log.week === state.selectedWeek &&
            log.day === state.selectedDay
          )
      );

      const nextLogs = [...filteredLogs, newLog];

      // Advance active pointer ONLY if completing the current active day
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
        // Cap program pointer at Week 13 Day 7 (Day 91)
        if (nextWeek > 13) {
          nextWeek = 13;
          nextDay = 7;
        } else {
          // If we advanced, synchronize selected day to the new active day
          nextSelWeek = nextWeek;
          nextSelDay = nextDay;
        }
      }

      return {
        ...state,
        currentWeek: nextWeek,
        currentDay: nextDay,
        selectedWeek: nextSelWeek,
        selectedDay: nextSelDay,
        logs: nextLogs,
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

      const filteredLogs = state.logs.filter(
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

      return {
        ...state,
        currentWeek: nextWeek,
        currentDay: nextDay,
        selectedWeek: nextSelWeek,
        selectedDay: nextSelDay,
        logs: nextLogs,
      };
    }

    case 'SET_SELECTED_DAY': {
      const { week, day, cycle } = action.payload;
      return {
        ...state,
        selectedWeek: week,
        selectedDay: day,
        selectedCycle: cycle !== undefined ? cycle : state.selectedCycle,
      };
    }

    case 'START_NEW_CYCLE': {
      const nextCycle = state.currentCycle + 1;
      return {
        ...state,
        currentCycle: nextCycle,
        currentWeek: 1,
        currentDay: 1,
        selectedCycle: nextCycle,
        selectedWeek: 1,
        selectedDay: 1,
      };
    }

    case 'LINK_GDRIVE': {
      return {
        ...state,
        gdriveLinked: action.payload,
      };
    }

    case 'SYNC_GDRIVE_DATA': {
      const { logs, currentCycle, currentWeek, currentDay } = action.payload;

      // Merge remote logs with local logs, deduplicating by ID
      const logMap = new Map<string, WorkoutLog>();
      state.logs.forEach((log) => logMap.set(log.id, log));
      logs.forEach((log) => logMap.set(log.id, log));

      const mergedLogs = Array.from(logMap.values());

      // Advance program pointer to whichever is furthest: local or remote
      const localProgress = state.currentCycle * 1000 + state.currentWeek * 10 + state.currentDay;
      const remoteProgress = currentCycle * 1000 + currentWeek * 10 + currentDay;
      const isRemoteFurthest = remoteProgress > localProgress;

      const nextCycle = isRemoteFurthest ? currentCycle : state.currentCycle;
      const nextWeek = isRemoteFurthest ? currentWeek : state.currentWeek;
      const nextDay = isRemoteFurthest ? currentDay : state.currentDay;

      return {
        ...state,
        currentCycle: nextCycle,
        currentWeek: nextWeek,
        currentDay: nextDay,
        selectedCycle: nextCycle,
        selectedWeek: nextWeek,
        selectedDay: nextDay,
        logs: mergedLogs,
        gdriveLinked: true,
      };
    }

    case 'RESET_DATABASE': {
      return {
        ...INITIAL_STATE,
        selectedCycle: 1,
        selectedWeek: 1,
        selectedDay: 1,
      };
    }

    default:
      return state;
  }
}

export const WorkoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(workoutReducer, INITIAL_STATE, () => {
    const local = loadState();
    return {
      ...local,
      selectedCycle: local.currentCycle,
      selectedWeek: local.currentWeek,
      selectedDay: local.currentDay,
    };
  });

  // Automatically save state to localStorage whenever it changes
  useEffect(() => {
    const { selectedCycle, selectedWeek, selectedDay, ...persistedState } = state;
    saveState(persistedState);
  }, [state]);

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
    logs: WorkoutLog[],
    currentCycle: number,
    currentWeek: number,
    currentDay: number
  ) => {
    dispatch({
      type: 'SYNC_GDRIVE_DATA',
      payload: { logs, currentCycle, currentWeek, currentDay },
    });
  };

  const resetDatabase = () => {
    dispatch({ type: 'RESET_DATABASE' });
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
