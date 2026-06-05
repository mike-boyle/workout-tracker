import { describe, it, expect } from 'vitest';
import { workoutReducer } from '../src/contexts/workoutReducer';
import {
  INITIAL_STATE,
  type ExtendedState,
  type WorkoutAction,
} from '../src/contexts/workoutTypes';
import type { WorkoutLog } from '../src/types';

describe('workoutReducer unit tests', () => {
  it('should handle INITIALIZE_STATE action', () => {
    const action = {
      type: 'INITIALIZE_STATE' as const,
      payload: {
        metadata: {
          version: 1,
          currentCycle: 2,
          currentWeek: 3,
          currentDay: 4,
          cycleStats: {},
          activeProgramId: 'p90x',
          programs: {
            p90x: {
              currentCycle: 2,
              currentWeek: 3,
              currentDay: 4,
              cycleStats: {},
            },
          },
        },
        logs: [] as WorkoutLog[],
      },
    };

    const nextState = workoutReducer(INITIAL_STATE, action);

    expect(nextState.currentCycle).toBe(2);
    expect(nextState.currentWeek).toBe(3);
    expect(nextState.currentDay).toBe(4);
    expect(nextState.selectedCycle).toBe(2);
    expect(nextState.selectedWeek).toBe(3);
    expect(nextState.selectedDay).toBe(4);
    expect(nextState.loading).toBe(false);
  });

  it('should handle START_LOAD_CYCLE action', () => {
    const action = {
      type: 'START_LOAD_CYCLE' as const,
      payload: 2,
    };

    const nextState = workoutReducer(INITIAL_STATE, action);
    expect(nextState.loadingCycles[2]).toBe(true);
  });

  it('should handle LOAD_CYCLE_SUCCESS action', () => {
    const mockLogs: WorkoutLog[] = [
      {
        id: 'cycle_1_week_1_day_1',
        cycle: 1,
        week: 1,
        day: 1,
        workoutId: 'chest',
        dateCompleted: '2026-06-05',
        skipped: false,
        exercises: {},
        abRipperCompleted: false,
        comments: '',
      },
    ];

    const state = {
      ...INITIAL_STATE,
      selectedCycle: 1,
    };

    const action = {
      type: 'LOAD_CYCLE_SUCCESS' as const,
      payload: {
        cycleNum: 1,
        logs: mockLogs,
      },
    };

    const nextState = workoutReducer(state, action);
    expect(nextState.loadedCycles[1]).toEqual(mockLogs);
    expect(nextState.loadingCycles[1]).toBe(false);
    expect(nextState.logs).toEqual(mockLogs);
  });

  it('should handle COMPLETE_WORKOUT action and advance day pointer', () => {
    const state: ExtendedState = {
      ...INITIAL_STATE,
      currentCycle: 1,
      currentWeek: 1,
      currentDay: 1,
      selectedCycle: 1,
      selectedWeek: 1,
      selectedDay: 1,
      loadedCycles: { 1: [] },
    };

    const action = {
      type: 'COMPLETE_WORKOUT' as const,
      payload: {
        workoutId: 'chest_and_back',
        exercises: { ex1: [{ reps: 10, weight: 100, assisted: false }] },
        abRipperCompleted: true,
        comments: 'Great workout',
      },
    };

    const nextState = workoutReducer(state, action);

    // active pointer advances from W1D1 -> W1D2
    expect(nextState.currentCycle).toBe(1);
    expect(nextState.currentWeek).toBe(1);
    expect(nextState.currentDay).toBe(2);
    expect(nextState.selectedWeek).toBe(1);
    expect(nextState.selectedDay).toBe(2);
    expect(nextState.logs.length).toBe(1);
    expect(nextState.logs[0].workoutId).toBe('chest_and_back');
    expect(nextState.logs[0].abRipperCompleted).toBe(true);
    expect(nextState.logs[0].comments).toBe('Great workout');
  });

  it('should handle SKIP_DAY action and advance day pointer', () => {
    const state: ExtendedState = {
      ...INITIAL_STATE,
      currentCycle: 1,
      currentWeek: 1,
      currentDay: 1,
      selectedCycle: 1,
      selectedWeek: 1,
      selectedDay: 1,
      loadedCycles: { 1: [] },
    };

    const action = {
      type: 'SKIP_DAY' as const,
      payload: {
        workoutId: 'chest_and_back',
      },
    };

    const nextState = workoutReducer(state, action);

    // active pointer advances W1D1 -> W1D2
    expect(nextState.currentCycle).toBe(1);
    expect(nextState.currentWeek).toBe(1);
    expect(nextState.currentDay).toBe(2);
    expect(nextState.logs.length).toBe(1);
    expect(nextState.logs[0].skipped).toBe(true);
  });

  it('should handle SET_SELECTED_DAY action', () => {
    const state: ExtendedState = {
      ...INITIAL_STATE,
      selectedCycle: 1,
      selectedWeek: 1,
      selectedDay: 1,
      loadedCycles: {
        2: [
          {
            id: 'log-c2',
            cycle: 2,
            week: 1,
            day: 1,
            workoutId: 'chest',
            dateCompleted: '2026-06-05',
            skipped: false,
            exercises: {},
            abRipperCompleted: false,
            comments: '',
          },
        ],
      },
    };

    const action = {
      type: 'SET_SELECTED_DAY' as const,
      payload: {
        week: 2,
        day: 3,
        cycle: 2,
      },
    };

    const nextState = workoutReducer(state, action);
    expect(nextState.selectedCycle).toBe(2);
    expect(nextState.selectedWeek).toBe(2);
    expect(nextState.selectedDay).toBe(3);
    expect(nextState.logs.length).toBe(1);
    expect(nextState.logs[0].id).toBe('log-c2');
  });

  it('should handle START_NEW_CYCLE action', () => {
    const state: ExtendedState = {
      ...INITIAL_STATE,
      currentCycle: 1,
      currentWeek: 12,
      currentDay: 7,
      selectedCycle: 1,
      selectedWeek: 12,
      selectedDay: 7,
      loadedCycles: { 1: [] },
    };

    const action = {
      type: 'START_NEW_CYCLE' as const,
    };

    const nextState = workoutReducer(state, action);
    expect(nextState.currentCycle).toBe(2);
    expect(nextState.currentWeek).toBe(1);
    expect(nextState.currentDay).toBe(1);
    expect(nextState.selectedCycle).toBe(2);
    expect(nextState.selectedWeek).toBe(1);
    expect(nextState.selectedDay).toBe(1);
    expect(nextState.logs).toEqual([]);
  });

  it('should handle SYNC_FIREBASE_DATA action', () => {
    const action = {
      type: 'SYNC_FIREBASE_DATA' as const,
      payload: {
        metadata: {
          version: 1,
          currentCycle: 3,
          currentWeek: 5,
          currentDay: 6,
          cycleStats: {},
          activeProgramId: 'p90x',
          cycleTimestamps: {},
          programs: {
            p90x: {
              currentCycle: 3,
              currentWeek: 5,
              currentDay: 6,
              cycleStats: {},
            },
          },
        },
        activeCycleLogs: [
          {
            id: 'c3-log',
            cycle: 3,
            week: 1,
            day: 1,
            workoutId: 'chest',
            dateCompleted: '2026-06-05',
            skipped: false,
            exercises: {},
            abRipperCompleted: false,
            comments: '',
          },
        ],
      },
    };

    const nextState = workoutReducer(INITIAL_STATE, action);
    expect(nextState.currentCycle).toBe(3);
    expect(nextState.currentWeek).toBe(5);
    expect(nextState.currentDay).toBe(6);
    expect(nextState.logs.length).toBe(1);
    expect(nextState.logs[0].id).toBe('c3-log');
  });

  it('should handle RESET_DATABASE action', () => {
    const state = {
      ...INITIAL_STATE,
      currentCycle: 3,
      currentWeek: 5,
      currentDay: 6,
    };

    const action = {
      type: 'RESET_DATABASE' as const,
    };

    const nextState = workoutReducer(state, action);
    expect(nextState.currentCycle).toBe(1);
    expect(nextState.currentWeek).toBe(1);
    expect(nextState.currentDay).toBe(1);
    expect(nextState.loading).toBe(false);
  });

  it('should handle FAST_FORWARD_TO_DAY action and create intermediate skips', () => {
    const mockLogDay6: WorkoutLog = {
      id: 'cycle_1_week_1_day_6',
      cycle: 1,
      week: 1,
      day: 6,
      workoutId: 'kenpo_x',
      dateCompleted: '2026-06-05',
      skipped: false,
      exercises: {},
      abRipperCompleted: false,
      comments: '',
    };

    const state: ExtendedState = {
      ...INITIAL_STATE,
      currentCycle: 1,
      currentWeek: 1,
      currentDay: 6,
      selectedCycle: 1,
      selectedWeek: 1,
      selectedDay: 6,
      loadedCycles: { 1: [mockLogDay6] },
      logs: [mockLogDay6],
    };

    const action = {
      type: 'FAST_FORWARD_TO_DAY' as const,
      payload: {
        week: 2,
        day: 2,
      },
    };

    const nextState = workoutReducer(state, action);
    expect(nextState.currentWeek).toBe(2);
    expect(nextState.currentDay).toBe(2);
    expect(nextState.logs.length).toBe(3); // mockLogDay6, intermediate skip for Day 7, and intermediate skip for Week 2 Day 1
    expect(nextState.logs[0]).toEqual(mockLogDay6);
    expect(nextState.logs[1].week).toBe(1);
    expect(nextState.logs[1].day).toBe(7);
    expect(nextState.logs[1].skipped).toBe(true);
    expect(nextState.logs[2].week).toBe(2);
    expect(nextState.logs[2].day).toBe(1);
    expect(nextState.logs[2].skipped).toBe(true);
  });

  it('should rollover to next week when skipping day 7', () => {
    const state: ExtendedState = {
      ...INITIAL_STATE,
      currentCycle: 1,
      currentWeek: 1,
      currentDay: 7,
      selectedCycle: 1,
      selectedWeek: 1,
      selectedDay: 7,
      loadedCycles: { 1: [] },
    };

    const action = {
      type: 'SKIP_DAY' as const,
      payload: {
        workoutId: 'rest',
      },
    };

    const nextState = workoutReducer(state, action);
    expect(nextState.currentWeek).toBe(2);
    expect(nextState.currentDay).toBe(1);
    expect(nextState.selectedWeek).toBe(2);
    expect(nextState.selectedDay).toBe(1);
  });

  it('should cap week and day at the end of the program when skipping day', () => {
    const state: ExtendedState = {
      ...INITIAL_STATE,
      currentCycle: 1,
      currentWeek: 13,
      currentDay: 7,
      selectedCycle: 1,
      selectedWeek: 13,
      selectedDay: 7,
      loadedCycles: { 1: [] },
    };

    const action = {
      type: 'SKIP_DAY' as const,
      payload: {
        workoutId: 'rest',
      },
    };

    const nextState = workoutReducer(state, action);
    expect(nextState.currentWeek).toBe(13);
    expect(nextState.currentDay).toBe(7);
    expect(nextState.selectedWeek).toBe(13);
    expect(nextState.selectedDay).toBe(7);
  });

  it('should rollover to next week when completing day 7', () => {
    const state: ExtendedState = {
      ...INITIAL_STATE,
      currentCycle: 1,
      currentWeek: 1,
      currentDay: 7,
      selectedCycle: 1,
      selectedWeek: 1,
      selectedDay: 7,
      loadedCycles: { 1: [] },
    };

    const action = {
      type: 'COMPLETE_WORKOUT' as const,
      payload: {
        workoutId: 'rest',
        exercises: {},
        abRipperCompleted: false,
        comments: 'Rest completed',
      },
    };

    const nextState = workoutReducer(state, action);
    expect(nextState.currentWeek).toBe(2);
    expect(nextState.currentDay).toBe(1);
    expect(nextState.selectedWeek).toBe(2);
    expect(nextState.selectedDay).toBe(1);
  });

  it('should cap week and day at the end of the program when completing day', () => {
    const state: ExtendedState = {
      ...INITIAL_STATE,
      currentCycle: 1,
      currentWeek: 13,
      currentDay: 7,
      selectedCycle: 1,
      selectedWeek: 13,
      selectedDay: 7,
      loadedCycles: { 1: [] },
    };

    const action = {
      type: 'COMPLETE_WORKOUT' as const,
      payload: {
        workoutId: 'rest',
        exercises: {},
        abRipperCompleted: false,
        comments: 'Final rest completed',
      },
    };

    const nextState = workoutReducer(state, action);
    expect(nextState.currentWeek).toBe(13);
    expect(nextState.currentDay).toBe(7);
    expect(nextState.selectedWeek).toBe(13);
    expect(nextState.selectedDay).toBe(7);
  });

  it('should handle SKIP_DAY when isCompletingActiveDay is false', () => {
    const state: ExtendedState = {
      ...INITIAL_STATE,
      currentCycle: 1,
      currentWeek: 1,
      currentDay: 2,
      selectedCycle: 1,
      selectedWeek: 1,
      selectedDay: 1,
      loadedCycles: { 1: [] },
    };

    const action = {
      type: 'SKIP_DAY' as const,
      payload: {
        workoutId: 'chest_and_back',
      },
    };

    const nextState = workoutReducer(state, action);

    expect(nextState.currentCycle).toBe(1);
    expect(nextState.currentWeek).toBe(1);
    expect(nextState.currentDay).toBe(2);
    expect(nextState.selectedWeek).toBe(1);
    expect(nextState.selectedDay).toBe(1);
    expect(nextState.loadedCycles[1].length).toBe(1);
    expect(nextState.loadedCycles[1][0].skipped).toBe(true);
  });

  it('should handle SET_SELECTED_DAY when changing cycle to an unloaded cycle', () => {
    const state: ExtendedState = {
      ...INITIAL_STATE,
      selectedCycle: 1,
      loadedCycles: { 1: [] },
    };

    const action = {
      type: 'SET_SELECTED_DAY' as const,
      payload: {
        week: 1,
        day: 1,
        cycle: 3,
      },
    };

    const nextState = workoutReducer(state, action);
    expect(nextState.selectedCycle).toBe(3);
    expect(nextState.logs).toEqual([]);
  });

  it('should handle FAST_FORWARD_TO_DAY when selectedCycle is not currentCycle', () => {
    const state: ExtendedState = {
      ...INITIAL_STATE,
      currentCycle: 1,
      currentWeek: 1,
      currentDay: 1,
      selectedCycle: 2,
      loadedCycles: { 1: [] },
      logs: [{ id: 'some-other-log' } as WorkoutLog],
    };

    const action = {
      type: 'FAST_FORWARD_TO_DAY' as const,
      payload: {
        week: 1,
        day: 3,
      },
    };

    const nextState = workoutReducer(state, action);
    expect(nextState.currentWeek).toBe(1);
    expect(nextState.currentDay).toBe(3);
    expect(nextState.logs.length).toBe(1);
    expect(nextState.logs[0].id).toBe('some-other-log');
  });

  it('should return current state for default case', () => {
    const nextState = workoutReducer(INITIAL_STATE, {
      type: 'INVALID_ACTION',
    } as unknown as WorkoutAction);
    expect(nextState).toEqual(INITIAL_STATE);
  });
});
