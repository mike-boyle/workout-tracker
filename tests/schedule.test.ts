import { describe, it, expect } from 'vitest';
import {
  getScheduleForProgram,
  exercises,
  workouts,
  p90xClassicSchedule,
  testWorkoutSchedule,
  PROGRAMS,
} from '../src/data/schedule';

describe('Schedule Data Utilities', () => {
  it('should return correct schedule for programs', () => {
    const testSched = getScheduleForProgram('test_workout');
    expect(testSched).toBe(testWorkoutSchedule);
    expect(testSched).toHaveLength(7);

    const classicSched = getScheduleForProgram('p90x');
    expect(classicSched).toBe(p90xClassicSchedule);
    expect(classicSched).toHaveLength(91);

    const defaultSched = getScheduleForProgram('unknown');
    expect(defaultSched).toBe(p90xClassicSchedule);
  });

  it('should have standard program configurations', () => {
    expect(PROGRAMS.p90x).toBeDefined();
    expect(PROGRAMS.p90x.totalDays).toBe(91);
    expect(PROGRAMS.test_workout).toBeDefined();
    expect(PROGRAMS.test_workout.totalDays).toBe(7);
  });

  it('should have exercises and workouts listed correctly', () => {
    expect(exercises.length).toBeGreaterThan(0);
    expect(workouts.length).toBeGreaterThan(0);
  });
});
