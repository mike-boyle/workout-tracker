import React, { useState, useEffect } from 'react';
import { useWorkout } from '../contexts/WorkoutContext';
import { workouts, exercises as allExercises, getScheduleForProgram } from '../data/schedule';
import { assert, assertDefined } from '../utils/assert';

import { RestTimer } from './RestTimer';
import { ResistanceSheetView } from './session/ResistanceSheetView';
import { ResistanceWizardView } from './session/ResistanceWizardView';
import { CommentsModal } from './session/CommentsModal';
import { RestDayView } from './session/RestDayView';
import type { SetLog } from '../types';
import { Flex, Heading, Text, Card, Badge } from './ui';

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
  const dayInfo = getScheduleForProgram(state.activeProgramId).find(
    (d) => d.weekNumber === state.selectedWeek && d.dayOfWeek === state.selectedDay
  );
  assertDefined(
    dayInfo,
    `No schedule found for week ${state.selectedWeek} day ${state.selectedDay}`
  );

  const workoutDef = workouts.find((w) => w.id === dayInfo.workoutId);
  assertDefined(workoutDef, `Workout definition not found for id: ${dayInfo.workoutId}`);

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
      workoutDef.exercises.forEach((exId) => {
        const exInfo = allExercises.find((e) => e.id === exId);
        assertDefined(exInfo, `Exercise definition not found for id: ${exId}`);
        const setCount = exInfo.setCount;

        initialForm[exId] = Array.from({ length: setCount }, () => ({
          reps: 0,
          weight: 0,
          assisted: false,
        }));
      });
      setFormData(initialForm);
      setAbRipperCompleted(workoutDef.abRipper);
      setComments('');
    }
    setCurrentStepIndex(0);
    setViewMode(isActiveDay ? 'wizard' : 'sheet');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- We only want to reload form data when the active week, day, or workout layout definitions change, not on log updates which would overwrite unsaved user inputs
  }, [state.selectedWeek, state.selectedDay, workoutDef]);

  if (!dayInfo || !workoutDef || workoutDef.id === 'rest') {
    return (
      <RestDayView
        selectedWeek={state.selectedWeek}
        selectedDay={state.selectedDay}
        onComplete={() => {
          completeWorkout({}, false, 'Rest completed');
          window.location.hash = '#/dashboard';
        }}
        onBack={() => {
          window.location.hash = '#/dashboard';
        }}
      />
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
      const exerciseSets = prev[exerciseId];
      assertDefined(exerciseSets, `Exercise sets not found for id: ${exerciseId}`);
      assert(
        setIndex >= 0 && setIndex < exerciseSets.length,
        `Set index ${setIndex} out of bounds for exercise: ${exerciseId}`
      );
      const updatedSets = [...exerciseSets];
      updatedSets[setIndex] = {
        ...updatedSets[setIndex],
        [field]: value,
      };
      return {
        ...prev,
        [exerciseId]: updatedSets,
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
    <Flex direction="column" gap={6}>
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
        <Flex justify="between" align="center" wrap="wrap" gap={4}>
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
            <Heading level={2}>{workoutDef.name}</Heading>
            <Text variant="p" color="secondary">
              Week {state.selectedWeek} • Day {state.selectedDay} • {workoutDef.type.toUpperCase()}{' '}
              ROUTINE
            </Text>
          </div>
          <Flex gap={2} align="center">
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
          </Flex>
        </Flex>

        {/* Embedded Rest Timer for lifting inside the sticky header (only in sheet view to keep wizard header compact) */}
        {isResistance && viewMode === 'sheet' && (
          <div style={{ marginTop: '12px' }}>
            <RestTimer />
          </div>
        )}
      </div>

      {/* Inner Non-Sticky Contents */}
      <Flex direction="column" gap={6} className="animate-fade-in">
        {/* Non-resistance Workout Details */}
        {!isResistance && (
          <>
            <RestTimer />
            <Card style={{ padding: '32px', textAlign: 'center' }}>
              <Badge variant="purple" style={{ marginBottom: '12px' }}>
                {workoutDef.type} Routine
              </Badge>
              <Heading level={3} style={{ marginBottom: '12px' }}>
                Ready to push play?
              </Heading>
              <Text
                variant="p"
                color="secondary"
                style={{
                  marginBottom: '24px',
                  maxWidth: '600px',
                  margin: '0 auto 24px auto',
                }}
              >
                Grab your water, get your heart rate monitor, and start the workout video. Complete
                the entire session and mark it finished.
              </Text>
              {workoutDef.abRipper && (
                <Flex justify="center" align="center" gap={2} style={{ marginBottom: '24px' }}>
                  <input
                    type="checkbox"
                    id="ab-ripper-nonres"
                    checked={abRipperCompleted}
                    onChange={(e) => setAbRipperCompleted(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label
                    htmlFor="ab-ripper-nonres"
                    style={{ cursor: 'pointer', fontWeight: '500' }}
                  >
                    Completed Ab Ripper X (+15 mins)
                  </label>
                </Flex>
              )}
              <button
                className="btn btn-primary"
                onClick={handleSave}
                style={{ minWidth: '200px' }}
              >
                Mark Workout Completed
              </button>
            </Card>
          </>
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
        <Card style={{ padding: '20px' }}>
          <Flex direction="column" gap={4}>
            {workoutDef.abRipper && isResistance && (
              <Flex align="center" gap={2}>
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
              </Flex>
            )}

            <Flex direction="column" gap={2} align="start" style={{ width: '100%' }}>
              <label className="input-label">Workout Comments / Notes</label>
              <Flex gap={4} align="center" wrap="wrap">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCommentModalOpen(true)}
                  style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                >
                  Add/Edit Comments
                </button>
                {comments && (
                  <Text color="green" size="sm" weight="medium">
                    ✓ Comment added
                  </Text>
                )}
              </Flex>
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
            </Flex>
          </Flex>
        </Card>
      </Flex>

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
        <Flex gap={4}>
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
        </Flex>
      </div>

      {isCommentModalOpen && (
        <CommentsModal
          isOpen={isCommentModalOpen}
          onClose={() => setIsCommentModalOpen(false)}
          comments={comments}
          onSave={setComments}
        />
      )}
    </Flex>
  );
};
