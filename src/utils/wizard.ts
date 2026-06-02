export interface WizardStep {
  exerciseId: string;
  setIndex: number;
}

export function generateWizardSteps(workoutId: string, exercises: string[]): WizardStep[] {
  const steps: WizardStep[] = [];

  if (workoutId === 'chest_and_back') {
    // Set 1: Step through all 12 exercises in the default order.
    for (let i = 0; i < exercises.length; i++) {
      steps.push({ exerciseId: exercises[i], setIndex: 0 });
    }

    // Set 2: Repeat the 12 exercises, but swap exercises in each group of 4 (first/second swapped, third/fourth swapped)
    for (let g = 0; g < 3; g++) {
      const baseIdx = g * 4;
      const idx0 = baseIdx + 0;
      const idx1 = baseIdx + 1;
      const idx2 = baseIdx + 2;
      const idx3 = baseIdx + 3;

      if (idx1 < exercises.length) {
        steps.push({ exerciseId: exercises[idx1], setIndex: 1 });
      }
      if (idx0 < exercises.length) {
        steps.push({ exerciseId: exercises[idx0], setIndex: 1 });
      }
      if (idx3 < exercises.length) {
        steps.push({ exerciseId: exercises[idx3], setIndex: 1 });
      }
      if (idx2 < exercises.length) {
        steps.push({ exerciseId: exercises[idx2], setIndex: 1 });
      }
    }
  } else if (workoutId === 'shoulders_and_arms') {
    // Group by rounds of 3. There are 15 exercises (5 rounds total).
    // For round r (0 to 4):
    // First, do Set 1 for the 3 exercises in that round: 3*r, 3*r+1, 3*r+2.
    // Then, do Set 2 for the same 3 exercises: 3*r, 3*r+1, 3*r+2.
    for (let r = 0; r < 5; r++) {
      const baseIdx = r * 3;

      // Set 1 for the 3 exercises
      for (let offset = 0; offset < 3; offset++) {
        const idx = baseIdx + offset;
        if (idx < exercises.length) {
          steps.push({ exerciseId: exercises[idx], setIndex: 0 });
        }
      }

      // Set 2 for the same 3 exercises
      for (let offset = 0; offset < 3; offset++) {
        const idx = baseIdx + offset;
        if (idx < exercises.length) {
          steps.push({ exerciseId: exercises[idx], setIndex: 1 });
        }
      }
    }
  } else {
    // Other resistance workouts:
    // Just step through Set 1 in order (all setCount is 1)
    for (let i = 0; i < exercises.length; i++) {
      steps.push({ exerciseId: exercises[i], setIndex: 0 });
    }
  }

  return steps;
}
