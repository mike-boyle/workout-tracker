export interface ExerciseInfo {
  id: string; // e.g. "standard_pushup"
  name: string; // e.g. "Standard Push-ups"
  type: 'bodyweight' | 'weighted';
  setCount: number; // 1 or 2 (number of sets to log)
}

export interface WorkoutInfo {
  id: string; // e.g. "chest_and_back"
  name: string; // e.g. "Chest & Back"
  type: 'resistance' | 'cardio' | 'stretch';
  exercises: string[]; // array of ExerciseInfo IDs
  abRipper: boolean; // whether Ab Ripper X is appended to this day
}

export interface ScheduleDay {
  dayNumber: number; // 1-91
  weekNumber: number; // 1-13
  dayOfWeek: number; // 1-7
  workoutId: string; // references WorkoutInfo.id, or "rest"
}

// Log schemas
export interface SetLog {
  reps: number;
  weight: number;
  assisted: boolean; // if bodyweight: true if assisted (e.g. bands/chair), if weighted: true if using extra weight (e.g. vest)
}

export interface WorkoutLog {
  id: string; // e.g. "cycle_1_week_1_day_1"
  cycle: number; // 1, 2, ...
  week: number; // 1-13
  day: number; // 1-7
  workoutId: string; // e.g. "chest_and_back" or "rest"
  dateCompleted: string; // ISO string
  skipped: boolean; // if marked as skipped
  exercises: {
    [exerciseId: string]: SetLog[]; // logs for each set (length matches ExerciseInfo.setCount)
  };
  abRipperCompleted: boolean;
  comments: string;
}

export interface CycleStats {
  completedCount: number;
  skippedCount: number;
  totalDays: number;
}

export interface UserMetadata {
  version: number;
  currentCycle: number;
  currentWeek: number; // 1-13
  currentDay: number; // 1-7
  gdriveLinked: boolean;
  metadataFileId?: string;
  cycleFileIds?: { [cycle: number]: string };
  cycleTimestamps?: { [cycle: number]: string };
  cycleStats?: { [cycle: number]: CycleStats };
  activeProgramId?: string;
  programs?: {
    [programId: string]: {
      currentCycle: number;
      currentWeek: number;
      currentDay: number;
      cycleStats?: { [cycle: number]: CycleStats };
    };
  };
}

export interface UserState {
  version: number;
  currentCycle: number;
  currentWeek: number; // 1-13
  currentDay: number; // 1-7
  logs: WorkoutLog[];
  gdriveLinked: boolean;
}
