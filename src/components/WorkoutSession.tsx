import React, { useState, useEffect } from 'react';
import { useWorkout } from '../contexts/WorkoutContext';
import { p90xClassicSchedule, workouts, exercises as allExercises } from '../data/schedule';
import { RestTimer } from './RestTimer';
import type { SetLog } from '../types';

export const WorkoutSession: React.FC = () => {
  const { state, completeWorkout, skipDay } = useWorkout();

  // Find scheduled workout for selected day
  const dayInfo = p90xClassicSchedule.find(
    (d) => d.weekNumber === state.selectedWeek && d.dayOfWeek === state.selectedDay
  );

  const workoutDef = workouts.find((w) => w.id === (dayInfo ? dayInfo.workoutId : 'rest'));

  // Local state for inputs
  const [formData, setFormData] = useState<{ [exerciseId: string]: SetLog[] }>({});
  const [abRipperCompleted, setAbRipperCompleted] = useState<boolean>(true);
  const [comments, setComments] = useState<string>('');

  // Load existing log if the user is editing a day they already completed
  useEffect(() => {
    const existingLog = state.logs.find(
      (log) =>
        log.cycle === state.selectedCycle &&
        log.week === state.selectedWeek &&
        log.day === state.selectedDay
    );

    if (existingLog && !existingLog.skipped) {
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
    value: any
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
      {/* Header Info */}
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
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-danger" onClick={handleSkip}>
            Skip Day
          </button>
        </div>
      </div>

      {/* Embedded Rest Timer for lifting */}
      {isResistance && (
        <div style={{ position: 'sticky', top: '16px', zIndex: 10 }}>
          <RestTimer />
        </div>
      )}

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

        <div className="input-group">
          <label className="input-label">Workout Comments / Notes</label>
          <textarea
            className="input-field"
            rows={3}
            placeholder="e.g. standard pushups felt easier today, increased curl weight..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
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
    </div>
  );
};
