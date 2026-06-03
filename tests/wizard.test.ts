import { describe, it, expect } from 'vitest';
import { generateWizardSteps } from '../src/utils/wizard';

describe('generateWizardSteps', () => {
  describe('chest_and_back', () => {
    it('should generate steps for chest_and_back with exactly 12 exercises', () => {
      const exercises = Array.from({ length: 12 }, (_, i) => `ex_${i}`);
      const steps = generateWizardSteps('chest_and_back', exercises);

      // 12 for set 0 + 12 for set 1 = 24 steps
      expect(steps).toHaveLength(24);

      // Check first set order (0 to 11)
      for (let i = 0; i < 12; i++) {
        expect(steps[i]).toEqual({ exerciseId: `ex_${i}`, setIndex: 0 });
      }

      // Check second set order (swapped in groups of 4)
      // Group 1: 0, 1, 2, 3 -> swapped: 1, 0, 3, 2
      expect(steps[12]).toEqual({ exerciseId: 'ex_1', setIndex: 1 });
      expect(steps[13]).toEqual({ exerciseId: 'ex_0', setIndex: 1 });
      expect(steps[14]).toEqual({ exerciseId: 'ex_3', setIndex: 1 });
      expect(steps[15]).toEqual({ exerciseId: 'ex_2', setIndex: 1 });
    });

    it('should handle chest_and_back with fewer than 12 exercises (to cover branches)', () => {
      const exercises = ['ex_0', 'ex_1', 'ex_2'];
      const steps = generateWizardSteps('chest_and_back', exercises);

      // First set: 3 steps
      // Second set: baseIdx=0 (0,1,2,3) -> idx1=1 (valid), idx0=0 (valid), idx3=3 (invalid), idx2=2 (valid)
      // baseIdx=4 (4,5,6,7) -> all invalid
      // Total should be 3 + 3 = 6 steps
      expect(steps).toHaveLength(6);
      expect(steps[3]).toEqual({ exerciseId: 'ex_1', setIndex: 1 });
      expect(steps[4]).toEqual({ exerciseId: 'ex_0', setIndex: 1 });
      expect(steps[5]).toEqual({ exerciseId: 'ex_2', setIndex: 1 });
    });
  });

  describe('shoulders_and_arms', () => {
    it('should generate steps for shoulders_and_arms with exactly 15 exercises', () => {
      const exercises = Array.from({ length: 15 }, (_, i) => `ex_${i}`);
      const steps = generateWizardSteps('shoulders_and_arms', exercises);

      // 15 for set 0 + 15 for set 1 = 30 steps
      expect(steps).toHaveLength(30);

      // Round 0 (baseIdx=0):
      // Set 1: ex_0, ex_1, ex_2 (setIndex: 0)
      // Set 2: ex_0, ex_1, ex_2 (setIndex: 1)
      expect(steps[0]).toEqual({ exerciseId: 'ex_0', setIndex: 0 });
      expect(steps[1]).toEqual({ exerciseId: 'ex_1', setIndex: 0 });
      expect(steps[2]).toEqual({ exerciseId: 'ex_2', setIndex: 0 });
      expect(steps[3]).toEqual({ exerciseId: 'ex_0', setIndex: 1 });
      expect(steps[4]).toEqual({ exerciseId: 'ex_1', setIndex: 1 });
      expect(steps[5]).toEqual({ exerciseId: 'ex_2', setIndex: 1 });
    });

    it('should handle shoulders_and_arms with fewer than 15 exercises (to cover branches)', () => {
      const exercises = ['ex_0', 'ex_1']; // Only 2 exercises
      const steps = generateWizardSteps('shoulders_and_arms', exercises);

      // Round 0: idx=0 (valid), idx=1 (valid), idx=2 (invalid) for both set 0 and set 1.
      // Other rounds: all invalid
      // Total: 4 steps
      expect(steps).toHaveLength(4);
      expect(steps[0]).toEqual({ exerciseId: 'ex_0', setIndex: 0 });
      expect(steps[1]).toEqual({ exerciseId: 'ex_1', setIndex: 0 });
      expect(steps[2]).toEqual({ exerciseId: 'ex_0', setIndex: 1 });
      expect(steps[3]).toEqual({ exerciseId: 'ex_1', setIndex: 1 });
    });
  });

  describe('other resistance workouts', () => {
    it('should generate straight set 0 steps for any other workout ID', () => {
      const exercises = ['ex_0', 'ex_1', 'ex_2'];
      const steps = generateWizardSteps('legs_and_back', exercises);

      expect(steps).toHaveLength(3);
      expect(steps[0]).toEqual({ exerciseId: 'ex_0', setIndex: 0 });
      expect(steps[1]).toEqual({ exerciseId: 'ex_1', setIndex: 0 });
      expect(steps[2]).toEqual({ exerciseId: 'ex_2', setIndex: 0 });
    });
  });
});
