import React from 'react';
import { generateWizardSteps } from '../../utils/wizard';
import { exercises as allExercises } from '../../data/schedule';
import type { WorkoutInfo, SetLog } from '../../types';

interface ResistanceWizardViewProps {
  workoutDef: WorkoutInfo;
  formData: { [exerciseId: string]: SetLog[] };
  currentStepIndex: number;
  setCurrentStepIndex: React.Dispatch<React.SetStateAction<number>>;
  handleInputChange: (
    exerciseId: string,
    setIndex: number,
    field: keyof SetLog,
    value: string | number | boolean
  ) => void;
  getPreviousLog: (exerciseId: string, setIndex: number) => SetLog | null;
  handleSave: () => void;
}

export const ResistanceWizardView: React.FC<ResistanceWizardViewProps> = ({
  workoutDef,
  formData,
  currentStepIndex,
  setCurrentStepIndex,
  handleInputChange,
  getPreviousLog,
  handleSave,
}) => {
  const steps = generateWizardSteps(workoutDef.id, workoutDef.exercises);
  const totalSteps = steps.length;
  if (totalSteps === 0) return null;

  // Make sure currentStepIndex is within bounds
  const stepIndex = Math.min(currentStepIndex, totalSteps - 1);
  const currentStep = steps[stepIndex];

  const exInfo = allExercises.find((e) => e.id === currentStep.exerciseId);
  if (!exInfo) return null;

  const set = formData[currentStep.exerciseId]?.[currentStep.setIndex] || {
    reps: 0,
    weight: 0,
    assisted: false,
  };
  const prevLog = getPreviousLog(currentStep.exerciseId, currentStep.setIndex);
  const progressPercent = ((stepIndex + 1) / totalSteps) * 100;

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
      {/* Progress Indicator */}
      <div
        className="flex justify-between items-center flex-wrap gap-2"
        style={{ marginBottom: '12px' }}
      >
        <span
          className="text-secondary"
          style={{
            fontSize: '0.9rem',
            fontWeight: '600',
          }}
        >
          Step {stepIndex + 1} of {totalSteps}
        </span>
        <div className="flex gap-2 items-center">
          <span className="badge badge-purple">
            {exInfo.setCount > 1 ? `Set ${currentStep.setIndex + 1}` : 'Single Set'}
          </span>
          {prevLog && (
            <span className="badge badge-cyan">
              Last: {prevLog.weight > 0 ? `${prevLog.weight} lbs x ` : ''}
              {prevLog.reps} reps{prevLog.assisted ? ' (Asst)' : ''}
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          background: 'var(--color-border)',
          borderRadius: '4px',
          height: '8px',
          overflow: 'hidden',
          width: '100%',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            background: 'var(--gradient-primary)',
            width: `${progressPercent}%`,
            height: '100%',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Exercise Info */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '4px' }}>
          {exInfo.name}
        </h3>
        <span
          className="text-muted"
          style={{
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {exInfo.type}
        </span>
      </div>

      {/* Input Fields */}
      <div className="flex items-center flex-wrap gap-4" style={{ marginBottom: '24px' }}>
        {exInfo.type === 'weighted' && (
          <div className="input-group" style={{ flex: '1 1 200px' }}>
            <label className="input-label">Weight (lbs)</label>
            <input
              type="number"
              className="input-field"
              value={set.weight || ''}
              placeholder="0"
              onChange={(e) =>
                handleInputChange(
                  currentStep.exerciseId,
                  currentStep.setIndex,
                  'weight',
                  e.target.value
                )
              }
            />
          </div>
        )}

        <div className="input-group" style={{ flex: '1 1 200px' }}>
          <label className="input-label">Reps</label>
          <input
            type="number"
            className="input-field"
            value={set.reps || ''}
            placeholder="0"
            onChange={(e) =>
              handleInputChange(
                currentStep.exerciseId,
                currentStep.setIndex,
                'reps',
                e.target.value
              )
            }
          />
        </div>

        <div
          className="flex flex-col gap-1 items-start"
          style={{
            alignSelf: 'flex-end',
            paddingBottom: '6px',
          }}
        >
          <label
            className="flex items-center gap-2"
            style={{
              fontSize: '0.85rem',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={set.assisted}
              onChange={(e) =>
                handleInputChange(
                  currentStep.exerciseId,
                  currentStep.setIndex,
                  'assisted',
                  e.target.checked
                )
              }
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            {exInfo.type === 'bodyweight' ? 'Assisted' : 'Weighted'}
          </label>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex justify-between gap-4" style={{ marginTop: '32px' }}>
        <button
          className="btn btn-secondary"
          onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
          disabled={stepIndex === 0}
          style={{ flex: 1 }}
        >
          ← Previous
        </button>
        {stepIndex < totalSteps - 1 ? (
          <button
            className="btn btn-primary"
            onClick={() => setCurrentStepIndex((prev) => Math.min(totalSteps - 1, prev + 1))}
            style={{ flex: 1 }}
          >
            Next →
          </button>
        ) : (
          <button className="btn btn-primary" onClick={handleSave} style={{ flex: 1 }}>
            Finish ✓
          </button>
        )}
      </div>
    </div>
  );
};
