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
        metadata: {
          ...metadata,
          currentCycle: progState.currentCycle,
          currentWeek: progState.currentWeek,
          currentDay: progState.currentDay,
          cycleStats: progState.cycleStats,
        },
        loadedCycles: {
          [progState.currentCycle]: logs,
        },
        ui: {
          selectedCycle: progState.currentCycle,
          selectedWeek: progState.currentWeek,
          selectedDay: progState.currentDay,
          loading: false,
          loadingCycles: state.ui.loadingCycles,
        },
        logs: logs,
      };
    }

    case 'START_LOAD_CYCLE': {
      const cycleNum = action.payload;
      return {
        ...state,
        ui: {
          ...state.ui,
          loadingCycles: {
            ...state.ui.loadingCycles,
            [cycleNum]: true,
          },
        },
      };
    }

    case 'LOAD_CYCLE_SUCCESS': {
      const { cycleNum, logs } = action.payload;
      const isSelected = cycleNum === state.ui.selectedCycle;
      return {
        ...state,
        loadedCycles: {
          ...state.loadedCycles,
          [cycleNum]: logs,
        },
        ui: {
          ...state.ui,
          loadingCycles: {
            ...state.ui.loadingCycles,
            [cycleNum]: false,
          },
        },
        logs: isSelected ? logs : state.logs,
      };
    }

    case 'COMPLETE_WORKOUT': {
      const { workoutId, exercises, abRipperCompleted, comments } = action.payload;
      const logId =
        'cycle_' +
        state.ui.selectedCycle +
        '_week_' +
        state.ui.selectedWeek +
        '_day_' +
        state.ui.selectedDay;

      const newLog: WorkoutLog = {
        id: logId,
        cycle: state.ui.selectedCycle,
        week: state.ui.selectedWeek,
        day: state.ui.selectedDay,
        workoutId,
        dateCompleted: new Date().toISOString(),
        skipped: false,
        exercises,
        abRipperCompleted,
        comments,
      };

      const currentCycleLogs = state.loadedCycles[state.ui.selectedCycle];
      assertDefined(
        currentCycleLogs,
        `Logs for cycle ${state.ui.selectedCycle} must be loaded before completing a workout`
      );
      const filteredLogs = currentCycleLogs.filter(
        (log) =>
          !(
            log.cycle === state.ui.selectedCycle &&
            log.week === state.ui.selectedWeek &&
            log.day === state.ui.selectedDay
          )
      );

      const nextLogs = [...filteredLogs, newLog];

      const isCompletingActiveDay =
        state.ui.selectedCycle === state.metadata.currentCycle &&
        state.ui.selectedWeek === state.metadata.currentWeek &&
        state.ui.selectedDay === state.metadata.currentDay;

      let nextWeek = state.metadata.currentWeek;
      let nextDay = state.metadata.currentDay;
      let nextSelWeek = state.ui.selectedWeek;
      let nextSelDay = state.ui.selectedDay;

      const activeProgId = state.metadata.activeProgramId;
      const activeProgram = PROGRAMS[activeProgId];
      assertDefined(activeProgram, `Program definition not found for: ${activeProgId}`);
      const maxWeeks = activeProgram.totalWeeks;
      const daysPerWeek = activeProgram.daysPerWeek;

      if (isCompletingActiveDay) {
        nextDay = state.metadata.currentDay + 1;
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

      const activeProg = state.metadata.activeProgramId;
      const activeProgState = state.metadata.programs[activeProg];
      assertDefined(activeProgState, `Program state not found for: ${activeProg}`);

      const updatedPrograms = Object.assign({}, state.metadata.programs, {
        [activeProg]: {
          currentCycle: state.metadata.currentCycle,
          currentWeek: nextWeek,
          currentDay: nextDay,
          cycleStats: Object.assign({}, activeProgState.cycleStats, {
            [state.ui.selectedCycle]: nextStats,
          }),
        },
      });

      return {
        metadata: {
          ...state.metadata,
          currentWeek: nextWeek,
          currentDay: nextDay,
          cycleStats: Object.assign({}, state.metadata.cycleStats, {
            [state.ui.selectedCycle]: nextStats,
          }),
          programs: updatedPrograms,
        },
        loadedCycles: Object.assign({}, state.loadedCycles, {
          [state.ui.selectedCycle]: nextLogs,
        }),
        ui: {
          ...state.ui,
          selectedWeek: nextSelWeek,
          selectedDay: nextSelDay,
        },
        logs: nextLogs,
      };
    }

    case 'SKIP_DAY': {
      const { workoutId } = action.payload;
      const logId =
        'cycle_' +
        state.ui.selectedCycle +
        '_week_' +
        state.ui.selectedWeek +
        '_day_' +
        state.ui.selectedDay;

      const skipLog: WorkoutLog = {
        id: logId,
        cycle: state.ui.selectedCycle,
        week: state.ui.selectedWeek,
        day: state.ui.selectedDay,
        workoutId,
        dateCompleted: new Date().toISOString(),
        skipped: true,
        exercises: {},
        abRipperCompleted: false,
        comments: 'Skipped',
      };

      const currentCycleLogs = state.loadedCycles[state.ui.selectedCycle];
      assertDefined(
        currentCycleLogs,
        `Logs for cycle ${state.ui.selectedCycle} must be loaded before skipping a day`
      );
      const filteredLogs = currentCycleLogs.filter(
        (log) =>
          !(
            log.cycle === state.ui.selectedCycle &&
            log.week === state.ui.selectedWeek &&
            log.day === state.ui.selectedDay
          )
      );

      const nextLogs = [...filteredLogs, skipLog];

      const isCompletingActiveDay =
        state.ui.selectedCycle === state.metadata.currentCycle &&
        state.ui.selectedWeek === state.metadata.currentWeek &&
        state.ui.selectedDay === state.metadata.currentDay;

      let nextWeek = state.metadata.currentWeek;
      let nextDay = state.metadata.currentDay;
      let nextSelWeek = state.ui.selectedWeek;
      let nextSelDay = state.ui.selectedDay;

      const activeProgId = state.metadata.activeProgramId;
      const activeProgram = PROGRAMS[activeProgId];
      assertDefined(activeProgram, `Program definition not found for: ${activeProgId}`);
      const maxWeeks = activeProgram.totalWeeks;
      const daysPerWeek = activeProgram.daysPerWeek;

      if (isCompletingActiveDay) {
        nextDay = state.metadata.currentDay + 1;
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

      const activeProg = state.metadata.activeProgramId;
      const activeProgState = state.metadata.programs[activeProg];
      assertDefined(activeProgState, `Program state not found for: ${activeProg}`);

      const updatedPrograms = Object.assign({}, state.metadata.programs, {
        [activeProg]: {
          currentCycle: state.metadata.currentCycle,
          currentWeek: nextWeek,
          currentDay: nextDay,
          cycleStats: Object.assign({}, activeProgState.cycleStats, {
            [state.ui.selectedCycle]: nextStats,
          }),
        },
      });

      return {
        metadata: {
          ...state.metadata,
          currentWeek: nextWeek,
          currentDay: nextDay,
          cycleStats: Object.assign({}, state.metadata.cycleStats, {
            [state.ui.selectedCycle]: nextStats,
          }),
          programs: updatedPrograms,
        },
        loadedCycles: Object.assign({}, state.loadedCycles, {
          [state.ui.selectedCycle]: nextLogs,
        }),
        ui: {
          ...state.ui,
          selectedWeek: nextSelWeek,
          selectedDay: nextSelDay,
        },
        logs: nextLogs,
      };
    }

    case 'SET_SELECTED_DAY': {
      const { week, day, cycle } = action.payload;
      const targetCycle = cycle !== undefined ? cycle : state.ui.selectedCycle;
      const hasChangedCycle = targetCycle !== state.ui.selectedCycle;
      const targetLogs = hasChangedCycle ? state.loadedCycles[targetCycle] || [] : state.logs;

      return {
        ...state,
        ui: {
          ...state.ui,
          selectedWeek: week,
          selectedDay: day,
          selectedCycle: targetCycle,
        },
        logs: targetLogs,
      };
    }

    case 'START_NEW_CYCLE': {
      const nextCycle = state.metadata.currentCycle + 1;
      const activeProgId = state.metadata.activeProgramId;
      const activeProgram = PROGRAMS[activeProgId];
      assertDefined(activeProgram, `Program definition not found for: ${activeProgId}`);
      const totalDays = activeProgram.totalDays;
      const nextStats: CycleStats = {
        completedCount: 0,
        skippedCount: 0,
        totalDays,
      };
      const activeProg = state.metadata.activeProgramId;
      const activeProgState = state.metadata.programs[activeProg];
      assertDefined(activeProgState, `Program state not found for: ${activeProg}`);

      const updatedPrograms = Object.assign({}, state.metadata.programs, {
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
        metadata: {
          ...state.metadata,
          currentCycle: nextCycle,
          currentWeek: 1,
          currentDay: 1,
          cycleStats: Object.assign({}, state.metadata.cycleStats, {
            [nextCycle]: nextStats,
          }),
          programs: updatedPrograms,
        },
        loadedCycles: Object.assign({}, state.loadedCycles, {
          [nextCycle]: [],
        }),
        ui: {
          ...state.ui,
          selectedCycle: nextCycle,
          selectedWeek: 1,
          selectedDay: 1,
        },
        logs: [],
      };
    }

    case 'SYNC_FIREBASE_DATA': {
      const { metadata, activeCycleLogs } = action.payload;
      return {
        metadata,
        loadedCycles: {
          ...state.loadedCycles,
          [metadata.currentCycle]: activeCycleLogs,
        },
        ui: {
          selectedCycle: metadata.currentCycle,
          selectedWeek: metadata.currentWeek,
          selectedDay: metadata.currentDay,
          loading: false,
          loadingCycles: state.ui.loadingCycles,
        },
        logs: activeCycleLogs,
      };
    }

    case 'RESET_DATABASE': {
      return {
        metadata: INITIAL_STATE.metadata,
        loadedCycles: INITIAL_STATE.loadedCycles,
        ui: {
          ...INITIAL_STATE.ui,
          loading: false,
        },
        logs: [],
      };
    }

    case 'FAST_FORWARD_TO_DAY': {
      const { week, day } = action.payload;
      const currentCycleLogs = state.loadedCycles[state.metadata.currentCycle];
      assertDefined(
        currentCycleLogs,
        `Logs for active cycle ${state.metadata.currentCycle} must be loaded before fast-forwarding`
      );

      const activeProgId = state.metadata.activeProgramId;
      const activeProgram = PROGRAMS[activeProgId];
      assertDefined(activeProgram, `Program definition not found for: ${activeProgId}`);
      const daysPerWeek = activeProgram.daysPerWeek;

      const intermediateDays: { week: number; day: number }[] = [];
      let w = state.metadata.currentWeek;
      let d = state.metadata.currentDay;

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
          const logId = `cycle_${state.metadata.currentCycle}_week_${item.week}_day_${item.day}`;

          newSkipLogs.push({
            id: logId,
            cycle: state.metadata.currentCycle,
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

      const isSelectedActiveCycle = state.ui.selectedCycle === state.metadata.currentCycle;

      return {
        metadata: {
          ...state.metadata,
          currentWeek: week,
          currentDay: day,
          cycleStats: Object.assign({}, state.metadata.cycleStats, {
            [state.metadata.currentCycle]: nextStats,
          }),
        },
        loadedCycles: Object.assign({}, state.loadedCycles, {
          [state.metadata.currentCycle]: nextLogs,
        }),
        ui: {
          ...state.ui,
          selectedWeek: week,
          selectedDay: day,
        },
        logs: isSelectedActiveCycle ? nextLogs : state.logs,
      };
    }

    default:
      return state;
  }
}
