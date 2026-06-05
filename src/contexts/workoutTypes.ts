import type { User } from 'firebase/auth';
import type { UserMetadata, WorkoutLog, SetLog } from '../types';

export interface ExtendedState extends UserMetadata {
  selectedCycle: number;
  selectedWeek: number;
  selectedDay: number;
  loading: boolean;
  logs: WorkoutLog[]; // Logs of the selected cycle (for backward compatibility)
  loadedCycles: { [cycle: number]: WorkoutLog[] };
  loadingCycles: { [cycle: number]: boolean };
}

export type WorkoutAction =
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

export interface WorkoutContextType {
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

  resetDatabase: () => void;
  loadCycleLogs: (cycleNum: number) => Promise<void>;
  switchProgram: (programId: string) => Promise<void>;
  fastForwardToDay: (week: number, day: number) => void;
}

export const INITIAL_STATE: ExtendedState = {
  version: 1,
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
  selectedCycle: 1,
  selectedWeek: 1,
  selectedDay: 1,
  loading: true,
  logs: [],
  loadedCycles: {},
  loadingCycles: {},
};
