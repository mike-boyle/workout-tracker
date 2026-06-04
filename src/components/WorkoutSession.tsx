import React, { useState, useEffect } from 'react';
import { useWorkout } from '../contexts/WorkoutContext';
import { workouts, exercises as allExercises, getScheduleForProgram } from '../data/schedule';
import { RestTimer } from './RestTimer';
import { ResistanceSheetView } from './session/ResistanceSheetView';
import { ResistanceWizardView } from './session/ResistanceWizardView';
import type { SetLog } from '../types';

export const WorkoutSession: React.FC = () => {
  const { state, completeWorkout, skipDay, fastForwardToDay } = useWorkout();

  const isFutureDay =
    state.selectedCycle > state.currentCycle ||
    (state.selectedCycle === state.currentCycle &&
      (state.selectedWeek - 1) * 7 + state.selectedDay >
        (state.currentWeek - 1) * 7 + state.currentDay);

  const handleSkipToThisDay = () => {
    if (
      confirm(
        `Are you sure you want to skip all workouts up to Week ${state.selectedWeek} Day ${state.selectedDay}?`
      )
    ) {
      fastForwardToDay(state.selectedWeek, state.selectedDay);
      window.location.hash = '#/dashboard';
    }
  };

  // Find scheduled workout for selected day
  const dayInfo = getScheduleForProgram(state.activeProgramId || 'p90x').find(
    (d) => d.weekNumber === state.selectedWeek && d.dayOfWeek === state.selectedDay
  );

  const workoutDef = workouts.find((w) => w.id === (dayInfo ? dayInfo.workoutId : 'rest'));

  const isActiveDay =
    state.currentCycle === state.selectedCycle &&
    state.currentWeek === state.selectedWeek &&
    state.currentDay === state.selectedDay;

  // Local state for inputs
  const [formData, setFormData] = useState<{ [exerciseId: string]: SetLog[] }>({});
  const [abRipperCompleted, setAbRipperCompleted] = useState<boolean>(true);
  const [comments, setComments] = useState<string>('');
  const [viewMode, setViewMode] = useState<'sheet' | 'wizard'>(isActiveDay ? 'wizard' : 'sheet');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState<boolean>(false);
  const [tempComments, setTempComments] = useState<string>('');

  // Load existing log if the user is editing a day they already completed
  useEffect(() => {
    const existingLog = state.logs.find(
      (log) =>
        log.cycle === state.selectedCycle &&
        log.week === state.selectedWeek &&
        log.day === state.selectedDay
    );

    if (existingLog && !existingLog.skipped) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronously loading database log values into local form state when entering a completed session day
      setFormData(existingLog.exercises);
      setAbRipperCompleted(existingLog.abRipperCompleted);
      setComments(existingLog.comments);
    } else {
      // Initialize fresh inputs structure
      const initialForm: { [exerciseId: string]: SetLog[] } = {};
      if (workoutDef && workoutDef.exercises) {
        workoutDef.exercises.forEach((exId) => {
          const exInfo = allExercises.find((e) => e.id === exId);
          const setCount = exInfo ? exInfo.setCount : 1;

          initialForm[exId] = Array.from({ length: setCount }, () => ({
            reps: 0,
            weight: 0,
            assisted: false,
          }));
        });
      }
      setFormData(initialForm);
      setAbRipperCompleted(workoutDef ? workoutDef.abRipper : false);
      setComments('');
    }
    setCurrentStepIndex(0);
    setViewMode(isActiveDay ? 'wizard' : 'sheet');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- We only want to reload form data when the active week, day, or workout layout definitions change, not on log updates which would overwrite unsaved user inputs
  }, [state.selectedWeek, state.selectedDay, workoutDef]);

  if (!dayInfo || !workoutDef || workoutDef.id === 'rest') {
    return (
      <div className="glass-panel animate-fade-in" style={{ padding: '32px', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '16px' }}>Rest Day</h2>
        <p className="text-secondary" style={{ marginBottom: '24px' }}>
          No formal workout scheduled for Week {state.selectedWeek} Day {state.selectedDay}. Rest,
          stretch, or do some light activity.
        </p>
        <div className="flex justify-center gap-4">
          <button
            className="btn btn-primary"
            onClick={() => {
              completeWorkout({}, false, 'Rest completed');
              window.location.hash = '#/dashboard';
            }}
          >
            Mark Completed
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              window.location.hash = '#/dashboard';
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Handle inputs changes
  const handleInputChange = (
    exerciseId: string,
    setIndex: number,
    field: keyof SetLog,
    value: string | number | boolean
  ) => {
    setFormData((prev) => {
      const exerciseSets = prev[exerciseId] ? [...prev[exerciseId]] : [];
      if (exerciseSets[setIndex]) {
        exerciseSets[setIndex] = {
          ...exerciseSets[setIndex],
          [field]: value,
        };
      }
      return {
        ...prev,
        [exerciseId]: exerciseSets,
      };
    });
  };

  // Query previous logged value for this exercise and set across history (any cycle/week)
  const getPreviousLog = (exerciseId: string, setIndex: number): SetLog | null => {
    // Sort logs descending by date to find the most recent
    const matchingLogs = [...state.logs]
      .filter(
        (log) => !log.skipped && log.exercises[exerciseId] && log.exercises[exerciseId][setIndex]
      )
      .sort((a, b) => new Date(b.dateCompleted).getTime() - new Date(a.dateCompleted).getTime());

    if (matchingLogs.length > 0) {
      return matchingLogs[0].exercises[exerciseId][setIndex];
    }
    return null;
  };

  const handleSave = () => {
    // Clean up forms: convert undefined or empty string values
    const cleanedData: { [exerciseId: string]: SetLog[] } = {};
    Object.keys(formData).forEach((exId) => {
      cleanedData[exId] = formData[exId].map((set) => ({
        reps: Number(set.reps) || 0,
        weight: Number(set.weight) || 0,
        assisted: !!set.assisted,
      }));
    });

    completeWorkout(cleanedData, abRipperCompleted, comments);
    window.location.hash = '#/dashboard';
  };

  const handleSkip = () => {
    if (
      confirm(
        'Are you sure you want to skip this workout day? It will be marked as skipped in your records.'
      )
    ) {
      skipDay(workoutDef.id);
      window.location.hash = '#/dashboard';
    }
  };

  const isResistance = workoutDef.type === 'resistance';

  return (
    <div className="flex flex-col gap-6">
      {/* Sticky Header Container */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          borderBottom: '1px solid var(--color-border)',
          padding: '16px 0',
          background: 'var(--color-bg-base)',
        }}
      >
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <button
              className="btn btn-secondary"
              onClick={() => {
                window.location.hash = '#/dashboard';
              }}
              style={{ padding: '6px 12px', fontSize: '0.85rem', marginBottom: '8px' }}
            >
              ← Back
            </button>
            <h2>{workoutDef.name}</h2>
            <p className="text-secondary">
              Week {state.selectedWeek} • Day {state.selectedDay} • {workoutDef.type.toUpperCase()}{' '}
              ROUTINE
            </p>
          </div>
          <div className="flex gap-2 items-center">
            {isResistance && (
              <button
                className="btn btn-secondary"
                onClick={() => setViewMode((prev) => (prev === 'sheet' ? 'wizard' : 'sheet'))}
              >
                {viewMode === 'sheet' ? 'Switch to Wizard View' : 'Switch to Full Sheet View'}
              </button>
            )}
            {isFutureDay && (
              <button className="btn btn-warning" onClick={handleSkipToThisDay}>
                Skip to this Day
              </button>
            )}
            <button className="btn btn-danger" onClick={handleSkip}>
              Skip Day
            </button>
          </div>
        </div>

        {/* Embedded Rest Timer for lifting inside the sticky header */}
        {isResistance && (
          <div style={{ marginTop: '12px' }}>
            <RestTimer />
          </div>
        )}
      </div>

      {/* Inner Non-Sticky Contents */}
      <div className="animate-fade-in flex flex-col gap-6">
        {/* Non-resistance Workout Details */}
        {!isResistance && (
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
            <span className="badge badge-purple" style={{ marginBottom: '12px' }}>
              {workoutDef.type} Routine
            </span>
            <h3 style={{ marginBottom: '12px' }}>Ready to push play?</h3>
            <p
              className="text-secondary"
              style={{
                marginBottom: '24px',
                maxWidth: '600px',
                margin: '0 auto 24px auto',
              }}
            >
              Grab your water, get your heart rate monitor, and start the workout video. Complete
              the entire session and mark it finished.
            </p>
            {workoutDef.abRipper && (
              <div
                className="flex justify-center items-center gap-2"
                style={{ marginBottom: '24px' }}
              >
                <input
                  type="checkbox"
                  id="ab-ripper-nonres"
                  checked={abRipperCompleted}
                  onChange={(e) => setAbRipperCompleted(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="ab-ripper-nonres" style={{ cursor: 'pointer', fontWeight: '500' }}>
                  Completed Ab Ripper X (+15 mins)
                </label>
              </div>
            )}
            <button className="btn btn-primary" onClick={handleSave} style={{ minWidth: '200px' }}>
              Mark Workout Completed
            </button>
          </div>
        )}

        {/* Resistance Exercise Views */}
        {isResistance &&
          formData &&
          (viewMode === 'sheet' ? (
            <ResistanceSheetView
              workoutDef={workoutDef}
              formData={formData}
              handleInputChange={handleInputChange}
              getPreviousLog={getPreviousLog}
            />
          ) : (
            <ResistanceWizardView
              workoutDef={workoutDef}
              formData={formData}
              currentStepIndex={currentStepIndex}
              setCurrentStepIndex={setCurrentStepIndex}
              handleInputChange={handleInputChange}
              getPreviousLog={getPreviousLog}
              handleSave={handleSave}
            />
          ))}

        {/* General Comments and Ab Ripper */}
        <div className="glass-panel flex flex-col gap-4" style={{ padding: '20px' }}>
          {workoutDef.abRipper && isResistance && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ab-ripper-cb"
                checked={abRipperCompleted}
                onChange={(e) => setAbRipperCompleted(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="ab-ripper-cb" style={{ cursor: 'pointer', fontWeight: '500' }}>
                Completed Ab Ripper X (+15 mins)
              </label>
            </div>
          )}

          <div className="flex flex-col gap-2 items-start">
            <label className="input-label">Workout Comments / Notes</label>
            <div className="flex gap-4 items-center flex-wrap">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setTempComments(comments);
                  setIsCommentModalOpen(true);
                }}
                style={{ padding: '8px 16px', fontSize: '0.9rem' }}
              >
                Add/Edit Comments
              </button>
              {comments && (
                <span className="text-green" style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                  ✓ Comment added
                </span>
              )}
            </div>
            {comments && (
              <div
                className="text-secondary"
                style={{
                  fontSize: '0.85rem',
                  background: 'hsla(var(--hue-base), 25%, 8%, 0.2)',
                  border: '1px dashed var(--color-border)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  width: '100%',
                  maxWidth: '500px',
                  whiteSpace: 'pre-wrap',
                  marginTop: '4px',
                }}
              >
                <strong>Preview:</strong> {comments}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Footer Container */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          zIndex: 100,
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          borderTop: '1px solid var(--color-border)',
          padding: '16px 0',
          background: 'var(--color-bg-base)',
        }}
      >
        <div className="flex gap-4">
          <button className="btn btn-primary" onClick={handleSave} style={{ flex: 1 }}>
            Save Workout Data
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              window.location.hash = '#/dashboard';
            }}
            style={{ flex: 1 }}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Comments Modal Overlay */}
      {isCommentModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '16px',
            animation: 'fadeIn 0.2s ease-out forwards',
          }}
          onClick={() => setIsCommentModalOpen(false)}
        >
          <div
            className="glass-panel flex flex-col gap-6"
            style={{
              width: '100%',
              maxWidth: '500px',
              background: 'var(--color-bg-modal)',
              padding: '24px',
              boxShadow: 'var(--shadow-lg)',
              animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-primary" style={{ fontSize: '1.25rem', marginBottom: '6px' }}>
                Workout Comments / Notes
              </h3>
              <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
                Add details about how the workout felt, changes in weight/reps, or general notes.
              </p>
            </div>

            <div className="input-group">
              <textarea
                className="input-field"
                rows={5}
                placeholder="e.g. standard pushups felt easier today, increased curl weight..."
                value={tempComments}
                onChange={(e) => setTempComments(e.target.value)}
                style={{ resize: 'vertical' }}
                autoFocus
              />
            </div>

            <div className="flex gap-4 justify-end">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsCommentModalOpen(false);
                }}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setComments(tempComments);
                  setIsCommentModalOpen(false);
                }}
              >
                Save Comment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
