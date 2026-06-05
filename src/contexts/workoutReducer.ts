import { getScheduleForProgram, PROGRAMS } from '../data/schedule';
import type { WorkoutLog, CycleStats } from '../types';
import { INITIAL_STATE, type ExtendedState, type WorkoutAction } from './workoutTypes';
import { assertDefined } from '../utils/assert';

export function workoutReducer(state: ExtendedState, action: WorkoutAction): ExtendedState {
  switch (action.type) {
    case 'INITIALIZE_STATE': {
      const { metadata, logs } = action.payload;
      const activeProg = metadata.activeProgramId;
      const progState = metadata.programs[activeProg];
      assertDefined(progState, `Program state not found for program ID: ${activeProg}`);
      return {
        ...state,
        ...metadata,
        activeProgramId: activeProg,
        currentCycle: progState.currentCycle,
        currentWeek: progState.currentWeek,
        currentDay: progState.currentDay,
        cycleStats: progState.cycleStats,
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

      const currentCycleLogs = state.loadedCycles[state.selectedCycle];
      assertDefined(
        currentCycleLogs,
        `Logs for cycle ${state.selectedCycle} must be loaded before completing a workout`
      );
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

      const activeProgId = state.activeProgramId;
      const activeProgram = PROGRAMS[activeProgId];
      assertDefined(activeProgram, `Program definition not found for: ${activeProgId}`);
      const maxWeeks = activeProgram.totalWeeks;
      const daysPerWeek = activeProgram.daysPerWeek;

      if (isCompletingActiveDay) {
        nextDay = state.currentDay + 1;
        if (nextDay > daysPerWeek) {
          nextDay = 1;
          nextWeek += 1;
        }
        if (nextWeek > maxWeeks) {
          nextWeek = maxWeeks;
          nextDay = daysPerWeek;
        } else {
          nextSelWeek = nextWeek;
          nextSelDay = nextDay;
        }
      }

      const totalDays = activeProgram.totalDays;
      const nextStats: CycleStats = {
        completedCount: nextLogs.filter((l) => !l.skipped).length,
        skippedCount: nextLogs.filter((l) => l.skipped).length,
        totalDays,
      };

      const activeProg = state.activeProgramId;
      const activeProgState = state.programs[activeProg];
      assertDefined(activeProgState, `Program state not found for: ${activeProg}`);

      const updatedPrograms = Object.assign({}, state.programs, {
        [activeProg]: {
          currentCycle: state.currentCycle,
          currentWeek: nextWeek,
          currentDay: nextDay,
          cycleStats: Object.assign({}, activeProgState.cycleStats, {
            [state.selectedCycle]: nextStats,
          }),
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

      const currentCycleLogs = state.loadedCycles[state.selectedCycle];
      assertDefined(
        currentCycleLogs,
        `Logs for cycle ${state.selectedCycle} must be loaded before skipping a day`
      );
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

      const activeProgId = state.activeProgramId;
      const activeProgram = PROGRAMS[activeProgId];
      assertDefined(activeProgram, `Program definition not found for: ${activeProgId}`);
      const maxWeeks = activeProgram.totalWeeks;
      const daysPerWeek = activeProgram.daysPerWeek;

      if (isCompletingActiveDay) {
        nextDay = state.currentDay + 1;
        if (nextDay > daysPerWeek) {
          nextDay = 1;
          nextWeek += 1;
        }
        if (nextWeek > maxWeeks) {
          nextWeek = maxWeeks;
          nextDay = daysPerWeek;
        } else {
          nextSelWeek = nextWeek;
          nextSelDay = nextDay;
        }
      }

      const totalDays = activeProgram.totalDays;
      const nextStats: CycleStats = {
        completedCount: nextLogs.filter((l) => !l.skipped).length,
        skippedCount: nextLogs.filter((l) => l.skipped).length,
        totalDays,
      };

      const activeProg = state.activeProgramId;
      const activeProgState = state.programs[activeProg];
      assertDefined(activeProgState, `Program state not found for: ${activeProg}`);

      const updatedPrograms = Object.assign({}, state.programs, {
        [activeProg]: {
          currentCycle: state.currentCycle,
          currentWeek: nextWeek,
          currentDay: nextDay,
          cycleStats: Object.assign({}, activeProgState.cycleStats, {
            [state.selectedCycle]: nextStats,
          }),
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
      const activeProgId = state.activeProgramId;
      const activeProgram = PROGRAMS[activeProgId];
      assertDefined(activeProgram, `Program definition not found for: ${activeProgId}`);
      const totalDays = activeProgram.totalDays;
      const nextStats: CycleStats = {
        completedCount: 0,
        skippedCount: 0,
        totalDays,
      };
      const activeProg = state.activeProgramId;
      const activeProgState = state.programs[activeProg];
      assertDefined(activeProgState, `Program state not found for: ${activeProg}`);

      const updatedPrograms = Object.assign({}, state.programs, {
        [activeProg]: {
          currentCycle: nextCycle,
          currentWeek: 1,
          currentDay: 1,
          cycleStats: Object.assign({}, activeProgState.cycleStats, {
            [nextCycle]: nextStats,
          }),
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
      const currentCycleLogs = state.loadedCycles[state.currentCycle];
      assertDefined(
        currentCycleLogs,
        `Logs for active cycle ${state.currentCycle} must be loaded before fast-forwarding`
      );

      const activeProgId = state.activeProgramId;
      const activeProgram = PROGRAMS[activeProgId];
      assertDefined(activeProgram, `Program definition not found for: ${activeProgId}`);
      const daysPerWeek = activeProgram.daysPerWeek;

      const intermediateDays: { week: number; day: number }[] = [];
      let w = state.currentWeek;
      let d = state.currentDay;

      while (w < week || (w === week && d < day)) {
        intermediateDays.push({ week: w, day: d });
        d++;
        if (d > daysPerWeek) {
          d = 1;
          w++;
        }
      }

      const newSkipLogs: WorkoutLog[] = [];
      const schedule = getScheduleForProgram(activeProgId);
      for (const item of intermediateDays) {
        const hasLog = currentCycleLogs.some(
          (log) => log.week === item.week && log.day === item.day
        );
        if (!hasLog) {
          const dayInfo = schedule.find(
            (sd) => sd.weekNumber === item.week && sd.dayOfWeek === item.day
          );
          assertDefined(dayInfo, `No schedule day found for week ${item.week} day ${item.day}`);
          const workoutId = dayInfo.workoutId;
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
        totalDays: activeProgram.totalDays,
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
