import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExerciseCard } from '../src/components/session/ExerciseCard';
import { ResistanceSheetView } from '../src/components/session/ResistanceSheetView';
import { ResistanceWizardView } from '../src/components/session/ResistanceWizardView';
import type { WorkoutInfo, SetLog } from '../src/types';

describe('ExerciseCard Component', () => {
  const mockExInfoWeighted = {
    id: 'wtd-ex-1',
    name: 'Weighted Pull-Up',
    type: 'weighted' as const,
    setCount: 2,
  };

  const mockExInfoBodyweight = {
    id: 'bw-ex-1',
    name: 'Standard Push-Up',
    type: 'bodyweight' as const,
    setCount: 2,
  };

  const defaultSets: SetLog[] = [
    { reps: 10, weight: 15, assisted: false },
    { reps: 8, weight: 15, assisted: true },
  ];

  it('renders weighted exercise info and handles input changes', () => {
    const handleInputChange = vi.fn();
    const getPreviousLog = vi.fn(() => null);

    render(
      <ExerciseCard
        exInfo={mockExInfoWeighted}
        idx={0}
        sets={defaultSets}
        handleInputChange={handleInputChange}
        getPreviousLog={getPreviousLog}
      />
    );

    expect(screen.getByText('1. Weighted Pull-Up')).toBeInTheDocument();
    expect(screen.getByText('weighted')).toBeInTheDocument();

    // Change weight
    const weightInputs = screen.getAllByPlaceholderText('0');
    fireEvent.change(weightInputs[0], { target: { value: '20' } });
    expect(handleInputChange).toHaveBeenCalledWith('wtd-ex-1', 0, 'weight', '20');

    // Change reps
    fireEvent.change(weightInputs[1], { target: { value: '12' } });
    expect(handleInputChange).toHaveBeenCalledWith('wtd-ex-1', 0, 'reps', '12');

    // Toggle assisted/weighted checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    expect(handleInputChange).toHaveBeenCalledWith('wtd-ex-1', 0, 'assisted', true);
  });

  it('renders bodyweight exercise info and handles input changes', () => {
    const handleInputChange = vi.fn();
    const getPreviousLog = vi.fn(() => ({ reps: 15, weight: 0, assisted: true }));

    render(
      <ExerciseCard
        exInfo={mockExInfoBodyweight}
        idx={1}
        sets={defaultSets}
        handleInputChange={handleInputChange}
        getPreviousLog={getPreviousLog}
      />
    );

    expect(screen.getByText('2. Standard Push-Up')).toBeInTheDocument();
    expect(screen.getByText('bodyweight')).toBeInTheDocument();
    expect(screen.getAllByText('15 reps (Asst)')[0]).toBeInTheDocument(); // use getAllByText since it's rendered for both sets

    // Toggle assisted checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    expect(handleInputChange).toHaveBeenCalledWith('bw-ex-1', 0, 'assisted', true);
  });

  it('renders previous logs in different configurations', () => {
    const handleInputChange = vi.fn();

    // Test cases for getPreviousLog returning various formats
    const getPreviousLog = vi
      .fn()
      .mockReturnValueOnce({ reps: 10, weight: 25, assisted: false }) // first set wtd
      .mockReturnValueOnce({ reps: 8, weight: 0, assisted: true }) // second set bodyweight assisted
      .mockReturnValueOnce({ reps: 12, weight: 10, assisted: true }) // wtd assisted
      .mockReturnValue(null); // default

    const sets = [
      { reps: 0, weight: 0, assisted: false },
      { reps: 0, weight: 0, assisted: false },
      { reps: 0, weight: 0, assisted: false },
      { reps: 0, weight: 0, assisted: false },
    ];

    render(
      <ExerciseCard
        exInfo={mockExInfoWeighted}
        idx={0}
        sets={sets}
        handleInputChange={handleInputChange}
        getPreviousLog={getPreviousLog}
      />
    );

    expect(screen.getByText('25 lbs x 10 reps')).toBeInTheDocument();
    expect(screen.getByText('8 reps (Wtd)')).toBeInTheDocument();
    expect(screen.getByText('10 lbs x 12 reps (Wtd)')).toBeInTheDocument();
  });
});

describe('ResistanceSheetView Component', () => {
  const mockWorkoutDef: WorkoutInfo = {
    id: 'chest_and_back',
    name: 'Chest & Back',
    type: 'resistance',
    exercises: ['cb_standard_pushup', 'non-existent-exercise'],
  };

  it('renders ExerciseCards for exercises in workout definition and skips invalid ones', () => {
    const handleInputChange = vi.fn();
    const getPreviousLog = vi.fn(() => null);

    render(
      <ResistanceSheetView
        workoutDef={mockWorkoutDef}
        formData={{}} // empty formData triggers default sets fallback line 30
        handleInputChange={handleInputChange}
        getPreviousLog={getPreviousLog}
      />
    );

    // Standard Push-ups should render
    expect(screen.getByText(/Standard Push-ups/)).toBeInTheDocument();
  });
});

describe('ResistanceWizardView Component', () => {
  const mockWorkoutDef: WorkoutInfo = {
    id: 'chest_and_back',
    name: 'Chest & Back',
    type: 'resistance',
    exercises: ['cb_standard_pushup'],
  };

  const mockFormData = {
    cb_standard_pushup: [
      { reps: 12, weight: 0, assisted: false },
      { reps: 14, weight: 0, assisted: false },
    ],
  };

  it('renders progress, handles next/prev steps, and inputs', () => {
    const handleInputChange = vi.fn();
    const getPreviousLog = vi.fn(() => ({ reps: 10, weight: 0, assisted: true }));
    const setCurrentStepIndex = vi.fn((cb) => {
      if (typeof cb === 'function') {
        cb(0);
      }
    });
    const handleSave = vi.fn();

    const { rerender } = render(
      <ResistanceWizardView
        workoutDef={mockWorkoutDef}
        formData={mockFormData}
        currentStepIndex={0}
        setCurrentStepIndex={setCurrentStepIndex}
        handleInputChange={handleInputChange}
        getPreviousLog={getPreviousLog}
        handleSave={handleSave}
      />
    );

    // cb_standard_pushup is part of chest_and_back. 1 exercise with setCount 2 means 2 steps total (Set 1 and Set 2).
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    expect(screen.getByText(/Standard Push-ups/)).toBeInTheDocument();
    expect(screen.getByText('Last: 10 reps (Asst)')).toBeInTheDocument();

    // Check input change triggers
    const inputs = screen.getAllByPlaceholderText('0');
    fireEvent.change(inputs[0], { target: { value: '15' } }); // reps input
    expect(handleInputChange).toHaveBeenCalledWith('cb_standard_pushup', 0, 'reps', '15');

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(handleInputChange).toHaveBeenCalledWith('cb_standard_pushup', 0, 'assisted', true);

    // Back button is disabled on step 0
    const prevBtn = screen.getByRole('button', { name: '← Previous' });
    expect(prevBtn).toBeDisabled();

    // Click Next button to change step index
    const nextBtn = screen.getByRole('button', { name: 'Next →' });
    fireEvent.click(nextBtn);
    expect(setCurrentStepIndex).toHaveBeenCalled();

    // Rerender at step 1
    rerender(
      <ResistanceWizardView
        workoutDef={mockWorkoutDef}
        formData={mockFormData}
        currentStepIndex={1}
        setCurrentStepIndex={setCurrentStepIndex}
        handleInputChange={handleInputChange}
        getPreviousLog={getPreviousLog}
        handleSave={handleSave}
      />
    );

    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();

    // Back button is enabled on step 1
    const prevBtnActive = screen.getByRole('button', { name: '← Previous' });
    expect(prevBtnActive).not.toBeDisabled();
    fireEvent.click(prevBtnActive);
    expect(setCurrentStepIndex).toHaveBeenCalled();

    // Finish button is visible on step 1 (last step)
    const finishBtn = screen.getByRole('button', { name: 'Finish ✓' });
    fireEvent.click(finishBtn);
    expect(handleSave).toHaveBeenCalled();
  });

  it('renders weighted exercise type correctly in wizard mode', () => {
    const handleInputChange = vi.fn();
    const getPreviousLog = vi.fn(() => ({ reps: 8, weight: 20, assisted: false }));
    const setCurrentStepIndex = vi.fn();

    const mockWeightedWorkoutDef: WorkoutInfo = {
      id: 'shoulders_and_arms',
      name: 'Shoulders & Arms',
      type: 'resistance',
      exercises: ['sa_alt_shoulder_press'],
    };

    render(
      <ResistanceWizardView
        workoutDef={mockWeightedWorkoutDef}
        formData={{ sa_alt_shoulder_press: [{ reps: 8, weight: 25, assisted: false }] }}
        currentStepIndex={0}
        setCurrentStepIndex={setCurrentStepIndex}
        handleInputChange={handleInputChange}
        getPreviousLog={getPreviousLog}
        handleSave={vi.fn()}
      />
    );

    expect(screen.getByText(/Alternating Shoulder Presses/)).toBeInTheDocument();
    expect(screen.getByText('Last: 20 lbs x 8 reps')).toBeInTheDocument();

    // Both weight and reps inputs should be visible
    const inputs = screen.getAllByPlaceholderText('0');
    expect(inputs.length).toBe(2);

    fireEvent.change(inputs[0], { target: { value: '30' } }); // weight input
    expect(handleInputChange).toHaveBeenCalledWith('sa_alt_shoulder_press', 0, 'weight', '30');
  });

  it('returns null for boundary/invalid configurations', () => {
    const handleInputChange = vi.fn();
    const setCurrentStepIndex = vi.fn();

    // 1. Empty exercises list
    const emptyWorkoutDef: WorkoutInfo = {
      id: 'empty',
      name: 'Empty Workout',
      type: 'resistance',
      exercises: [],
    };
    const { container: container1, rerender } = render(
      <ResistanceWizardView
        workoutDef={emptyWorkoutDef}
        formData={{}}
        currentStepIndex={0}
        setCurrentStepIndex={setCurrentStepIndex}
        handleInputChange={handleInputChange}
        getPreviousLog={() => null}
        handleSave={vi.fn()}
      />
    );
    expect(container1.firstChild).toBeNull();

    // 2. Out of bounds index
    const mockWorkoutDef: WorkoutInfo = {
      id: 'chest_and_back',
      name: 'Chest & Back',
      type: 'resistance',
      exercises: ['cb_standard_pushup'],
    };
    rerender(
      <ResistanceWizardView
        workoutDef={mockWorkoutDef}
        formData={{}}
        currentStepIndex={10} // out of bounds
        setCurrentStepIndex={setCurrentStepIndex}
        handleInputChange={handleInputChange}
        getPreviousLog={() => null}
        handleSave={vi.fn()}
      />
    );
    // 2 steps (Set 1 and Set 2), stepIndex = 1
    expect(screen.getByText(/Standard Push-ups/)).toBeInTheDocument();

    // 3. Unknown exercise id
    const badWorkoutDef: WorkoutInfo = {
      id: 'chest_and_back',
      name: 'Chest & Back',
      type: 'resistance',
      exercises: ['non-existent-exercise-id'],
    };
    rerender(
      <ResistanceWizardView
        workoutDef={badWorkoutDef}
        formData={{}}
        currentStepIndex={0}
        setCurrentStepIndex={setCurrentStepIndex}
        handleInputChange={handleInputChange}
        getPreviousLog={() => null}
        handleSave={vi.fn()}
      />
    );
    // Should return null gracefully because exercise config not found
    expect(screen.queryByText(/Step/)).not.toBeInTheDocument();
  });
});
