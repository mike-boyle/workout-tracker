import React from 'react';
import { useWorkout } from '../../contexts/WorkoutContext';

export const AdherenceCard: React.FC = () => {
  const { state, startNewCycle } = useWorkout();

  // Calculate statistics for the selected cycle
  const selectedCycleLogs = state.logs.filter((log) => log.cycle === state.selectedCycle);
  const completedCount = selectedCycleLogs.filter((log) => !log.skipped).length;
  const skippedCount = selectedCycleLogs.filter((log) => log.skipped).length;
  const totalDays = state.activeProgramId === 'test_workout' ? 7 : 91;
  const progressPercent = Math.round((selectedCycleLogs.length / totalDays) * 100);

  const maxWeeks = state.activeProgramId === 'test_workout' ? 1 : 13;
  const getLogForDay = (week: number, day: number) => {
    return state.logs.find(
      (log) => log.cycle === state.selectedCycle && log.week === week && log.day === day
    );
  };
  const isCycleCompleted =
    state.currentWeek === maxWeeks &&
    state.currentDay === 7 &&
    getLogForDay(maxWeeks, 7) !== undefined;

  const showStartNextCyclePrompt = isCycleCompleted && state.selectedCycle === state.currentCycle;

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Summary Panel */}
      <div
        className="glass-panel flex justify-between items-center flex-wrap gap-6"
        style={{ padding: '24px' }}
      >
        <div style={{ flex: '1 1 300px' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>
            Cycle {state.selectedCycle} Adherence
          </h2>
          <div
            style={{
              background: 'hsla(var(--hue-base), 25%, 8%, 0.5)',
              borderRadius: '9999px',
              height: '12px',
              width: '100%',
              overflow: 'hidden',
              border: '1px solid var(--color-border)',
            }}
          >
            <div
              style={{
                background: 'var(--gradient-primary)',
                height: '100%',
                width: `${progressPercent}%`,
                borderRadius: '9999px',
                transition: 'width var(--transition-slow)',
              }}
            />
          </div>
          <div
            className="flex justify-between text-secondary"
            style={{
              fontSize: '0.85rem',
              marginTop: '8px',
            }}
          >
            <span>{progressPercent}% Complete</span>
            <span>
              {selectedCycleLogs.length} / {totalDays} Days Tracked
            </span>
          </div>
        </div>

        <div className="flex gap-4">
          <div style={{ textAlign: 'center', minWidth: '80px' }}>
            <span
              className="text-cyan"
              style={{
                display: 'block',
                fontSize: '1.8rem',
                fontWeight: '700',
              }}
            >
              {completedCount}
            </span>
            <span
              className="text-secondary"
              style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
              }}
            >
              Workouts
            </span>
          </div>
          <div style={{ textAlign: 'center', minWidth: '80px' }}>
            <span
              className="text-yellow"
              style={{
                display: 'block',
                fontSize: '1.8rem',
                fontWeight: '700',
              }}
            >
              {skippedCount}
            </span>
            <span
              className="text-secondary"
              style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
              }}
            >
              Skipped
            </span>
          </div>
          <div style={{ textAlign: 'center', minWidth: '80px' }}>
            <span
              className="text-purple"
              style={{
                display: 'block',
                fontSize: '1.8rem',
                fontWeight: '700',
              }}
            >
              {totalDays - selectedCycleLogs.length}
            </span>
            <span
              className="text-secondary"
              style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
              }}
            >
              Remaining
            </span>
          </div>
        </div>
      </div>

      {/* Cycle Completion Prompt */}
      {showStartNextCyclePrompt && (
        <div
          className="glass-panel"
          style={{
            padding: '24px',
            border: '1px solid var(--color-cyan)',
            boxShadow: 'var(--shadow-glow-cyan)',
            textAlign: 'center',
          }}
        >
          <h2 className="text-cyan" style={{ marginBottom: '8px' }}>
            🎉 Congratulations! Cycle Complete!
          </h2>
          <p className="text-secondary" style={{ marginBottom: '16px' }}>
            You completed all 13 weeks of this training cycle. Ready to start another round of
            muscle confusion?
          </p>
          <button
            className="btn btn-primary"
            onClick={() => {
              startNewCycle();
              window.location.hash = `#/dashboard/cycle/${state.currentCycle + 1}`;
            }}
          >
            Start Cycle {state.currentCycle + 1}
          </button>
        </div>
      )}
    </div>
  );
};
