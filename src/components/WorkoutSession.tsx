import React, { useState, useEffect } from 'react';
import { useWorkout } from '../contexts/WorkoutContext';
import { workouts, exercises as allExercises, getScheduleForProgram } from '../data/schedule';
import { RestTimer } from './RestTimer';
import type { SetLog } from '../types';

import { generateWizardSteps } from '../utils/wizard';

export const WorkoutSession: React.FC = () => {
  const { state, completeWorkout, skipDay, fastForwardToDay } = useWorkout();

  const isFutureDay =
    state.selectedCycle > state.currentCycle ||
    (state.selectedCycle === state.currentCycle &&
      (state.selectedWeek - 1) * 7 + state.selectedDay > (state.currentWeek - 1) * 7 + state.currentDay);

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

  // Local state for inputs
  const [formData, setFormData] = useState<{ [exerciseId: string]: SetLog[] }>({});
  const [abRipperCompleted, setAbRipperCompleted] = useState<boolean>(true);
  const [comments, setComments] = useState<string>('');
  const [viewMode, setViewMode] = useState<'sheet' | 'wizard'>('sheet');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- We only want to reload form data when the active week, day, or workout layout definitions change, not on log updates which would overwrite unsaved user inputs
  }, [state.selectedWeek, state.selectedDay, workoutDef]);

  if (!dayInfo || !workoutDef || workoutDef.id === 'rest') {
    return (
      <div className="glass-panel animate-fade-in" style={{ padding: '32px', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '16px' }}>Rest Day</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
          No formal workout scheduled for Week {state.selectedWeek} Day {state.selectedDay}. Rest,
          stretch, or do some light activity.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
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
        <div
      className="animate-fade-in"
      style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
    >
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
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
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
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Week {state.selectedWeek} • Day {state.selectedDay} • {workoutDef.type.toUpperCase()}{' '}
              ROUTINE
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
          <div>
            <RestTimer />
          </div>
        )}
      </div>

      {/* Non-resistance Workout Details */}
      {!isResistance && (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
          <span className="badge badge-purple" style={{ marginBottom: '12px' }}>
            {workoutDef.type} Routine
          </span>
          <h3 style={{ marginBottom: '12px' }}>Ready to push play?</h3>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              marginBottom: '24px',
              maxWidth: '600px',
              margin: '0 auto 24px auto',
            }}
          >
            Grab your water, get your heart rate monitor, and start the workout video. Complete the
            entire session and mark it finished.
          </p>
          {workoutDef.abRipper && (
            <div
              style={{
                marginBottom: '24px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
              }}
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

      {/* Resistance Exercise Cards */}
      {isResistance && formData && (
        viewMode === 'sheet' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {workoutDef.exercises.map((exId, idx) => {
              const exInfo = allExercises.find((e) => e.id === exId);
              if (!exInfo) return null;

              const sets = formData[exId] || [];

              return (
                <div key={exId} className="glass-panel" style={{ padding: '16px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '16px',
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                        {idx + 1}. {exInfo.name}
                      </h3>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--color-text-muted)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {exInfo.type}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '16px',
                    }}
                  >
                    {sets.map((set, setIdx) => {
                      const prevLog = getPreviousLog(exId, setIdx);

                      return (
                        <div
                          key={setIdx}
                          style={{
                            background: 'hsla(var(--hue-base), 25%, 8%, 0.3)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '8px',
                            padding: '12px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '10px',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                color: 'var(--color-text-secondary)',
                              }}
                            >
                              {exInfo.setCount > 1 ? `Set ${setIdx + 1}` : 'Single Set'}
                            </span>

                            {/* Previous value compare badge */}
                            {prevLog && (
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  color: 'var(--color-cyan)',
                                  fontWeight: '500',
                                }}
                              >
                                Last: {prevLog.weight > 0 ? `${prevLog.weight} lbs x ` : ''}
                                {prevLog.reps} reps{prevLog.assisted ? ' (Asst)' : ''}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            {exInfo.type === 'weighted' && (
                              <div className="input-group">
                                <label className="input-label">Weight (lbs)</label>
                                <input
                                  type="number"
                                  className="input-field"
                                  value={set.weight || ''}
                                  placeholder="0"
                                  onChange={(e) =>
                                    handleInputChange(exId, setIdx, 'weight', e.target.value)
                                  }
                                />
                              </div>
                            )}

                            <div className="input-group">
                              <label className="input-label">Reps</label>
                              <input
                                type="number"
                                className="input-field"
                                value={set.reps || ''}
                                placeholder="0"
                                onChange={(e) =>
                                  handleInputChange(exId, setIdx, 'reps', e.target.value)
                                }
                              />
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                alignSelf: 'flex-end',
                                paddingBottom: '6px',
                              }}
                            >
                              <label
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '0.8rem',
                                  cursor: 'pointer',
                                  userSelect: 'none',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={set.assisted}
                                  onChange={(e) =>
                                    handleInputChange(exId, setIdx, 'assisted', e.target.checked)
                                  }
                                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                />
                                {exInfo.type === 'bodyweight' ? 'Assisted' : 'Weighted'}
                              </label>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Wizard View Card */
          (() => {
            const steps = generateWizardSteps(workoutDef.id, workoutDef.exercises);
            const totalSteps = steps.length;
            if (totalSteps === 0) return null;

            // Make sure currentStepIndex is within bounds
            const stepIndex = Math.min(currentStepIndex, totalSteps - 1);
            const currentStep = steps[stepIndex];
            if (!currentStep) return null;

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
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.9rem',
                      color: 'var(--color-text-secondary)',
                      fontWeight: '600',
                    }}
                  >
                    Step {stepIndex + 1} of {totalSteps}
                  </span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {exInfo.type}
                  </span>
                </div>

                {/* Input Fields */}
                <div
                  style={{
                    display: 'flex',
                    gap: '16px',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    marginBottom: '24px',
                  }}
                >
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
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      alignSelf: 'flex-end',
                      paddingBottom: '6px',
                    }}
                  >
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
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
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '12px',
                    marginTop: '32px',
                  }}
                >
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
                      onClick={() =>
                        setCurrentStepIndex((prev) => Math.min(totalSteps - 1, prev + 1))
                      }
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
          })()
        )
      )}

            {/* General Comments and Ab Ripper */}
      <div
        className="glass-panel"
        style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        {workoutDef.abRipper && isResistance && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
          <label className="input-label">Workout Comments / Notes</label>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
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
              <span style={{ fontSize: '0.85rem', color: 'var(--color-green)', fontWeight: '500' }}>
                ✓ Comment added
              </span>
            )}
          </div>
          {comments && (
            <div
              style={{
                fontSize: '0.85rem',
                color: 'var(--color-text-secondary)',
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
        <div style={{ display: 'flex', gap: '12px' }}>
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
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '500px',
              background: 'var(--color-bg-modal)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: 'var(--shadow-lg)',
              animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '6px', color: 'var(--color-text-primary)' }}>
                Workout Comments / Notes
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
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

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
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
