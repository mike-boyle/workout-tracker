import React from 'react';
import { useWorkout } from '../contexts/WorkoutContext';
import { workouts, getScheduleForProgram } from '../data/schedule';
import type { ScheduleDay } from '../types';

export const Dashboard: React.FC = () => {
  const { state, startNewCycle } = useWorkout();

  // Helper to find log for a specific day in the selected cycle
  const getLogForDay = (week: number, day: number) => {
    return state.logs.find(
      (log) => log.cycle === state.selectedCycle && log.week === week && log.day === day
    );
  };

  const schedule = getScheduleForProgram(state.activeProgramId || 'p90x');

  const getPhases = () => {
    if (state.activeProgramId === 'test_workout') {
      return [{ num: 1, name: 'Testing', weeks: [1] }];
    }
    return [
      { num: 1, name: 'Foundation', weeks: [1, 2, 3, 4] },
      { num: 2, name: 'Max Strength', weeks: [5, 6, 7, 8] },
      { num: 3, name: 'The Final Stretch', weeks: [9, 10, 11, 12, 13] },
    ];
  };

  // Calculate statistics for the selected cycle
  const selectedCycleLogs = state.logs.filter((log) => log.cycle === state.selectedCycle);
  const completedCount = selectedCycleLogs.filter((log) => !log.skipped).length;
  const skippedCount = selectedCycleLogs.filter((log) => log.skipped).length;
  const totalDays = state.activeProgramId === 'test_workout' ? 7 : 91;
  const progressPercent = Math.round((selectedCycleLogs.length / totalDays) * 100);

  const handleDayClick = (dayInfo: ScheduleDay) => {
    // eslint-disable-next-line react-hooks/immutability -- Mutating window.location.hash directly is our lightweight SPA client-side routing mechanism, which is outside React's lifecycle and cannot be done through standard state hooks.
    window.location.hash =
      '#/session/cycle/' +
      state.selectedCycle +
      '/week/' +
      dayInfo.weekNumber +
      '/day/' +
      dayInfo.dayOfWeek;
  };

  const maxWeeks = state.activeProgramId === 'test_workout' ? 1 : 13;
  const isCycleCompleted =
    state.currentWeek === maxWeeks &&
    state.currentDay === 7 &&
    getLogForDay(maxWeeks, 7) !== undefined;

  const showStartNextCyclePrompt = isCycleCompleted && state.selectedCycle === state.currentCycle;

  return (
    <div
      className="animate-fade-in"
      style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}
    >
      {/* Dashboard & Cycle Selector Header */}
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
          <h2 style={{ fontSize: '1.6rem' }}>Calendar Dashboard</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            {state.selectedCycle === state.currentCycle
              ? `You are currently on Cycle ${state.currentCycle}, Week ${state.currentWeek}, Day ${state.currentDay}`
              : `Reviewing historical data for Cycle ${state.selectedCycle}`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '0.9rem',
                fontWeight: '500',
                color: 'var(--color-text-secondary)',
              }}
            >
              View Cycle:
            </span>
            <select
              className="input-field"
              style={{
                width: 'auto',
                padding: '6px 12px',
                fontSize: '0.9rem',
                background: 'var(--color-bg-surface)',
                borderColor: 'var(--color-border)',
              }}
              value={state.selectedCycle}
              onChange={(e) => {
                window.location.hash = `#/dashboard/cycle/${e.target.value}`;
              }}
            >
              {Array.from({ length: state.currentCycle }, (_, i) => i + 1).map((c) => (
                <option key={c} value={c}>
                  Cycle {c}
                </option>
              ))}
            </select>
          </div>
          <a
            href="#/history"
            className="btn btn-secondary"
            style={{
              padding: '6px 12px',
              fontSize: '0.85rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Manage Cycles
          </a>
        </div>
      </div>

      {/* Stats Summary Panel */}
      <div
        className="glass-panel"
        style={{
          padding: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '24px',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
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
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.85rem',
              color: 'var(--color-text-secondary)',
              marginTop: '8px',
            }}
          >
            <span>{progressPercent}% Complete</span>
            <span>
              {selectedCycleLogs.length} / {totalDays} Days Tracked
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ textAlign: 'center', minWidth: '80px' }}>
            <span
              style={{
                display: 'block',
                fontSize: '1.8rem',
                fontWeight: '700',
                color: 'var(--color-cyan)',
              }}
            >
              {completedCount}
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
              }}
            >
              Workouts
            </span>
          </div>
          <div style={{ textAlign: 'center', minWidth: '80px' }}>
            <span
              style={{
                display: 'block',
                fontSize: '1.8rem',
                fontWeight: '700',
                color: 'var(--color-yellow)',
              }}
            >
              {skippedCount}
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
              }}
            >
              Skipped
            </span>
          </div>
          <div style={{ textAlign: 'center', minWidth: '80px' }}>
            <span
              style={{
                display: 'block',
                fontSize: '1.8rem',
                fontWeight: '700',
                color: 'var(--color-purple)',
              }}
            >
              {totalDays - selectedCycleLogs.length}
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-secondary)',
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
          <h2 style={{ color: 'var(--color-cyan)', marginBottom: '8px' }}>
            🎉 Congratulations! Cycle Complete!
          </h2>
          <p style={{ marginBottom: '16px', color: 'var(--color-text-secondary)' }}>
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

      {/* Calendar Phases */}
      {getPhases().map((phase) => (
        <div key={phase.num} className="phase-section">
          <h2
            style={{
              fontSize: '1.4rem',
              borderLeft: '3px solid var(--color-purple)',
              paddingLeft: '12px',
              marginBottom: '16px',
              color: 'var(--color-text-primary)',
            }}
          >
            Phase {phase.num} ({phase.name})
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {phase.weeks.map((weekNum) => {
              // Filter days in schedule matching this week
              const weekDays = schedule.filter((d) => d.weekNumber === weekNum);
              const isRecoveryWeek = weekNum === 4 || weekNum === 8 || weekNum === 13;

              return (
                <div key={weekNum} className="glass-panel" style={{ padding: '16px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '1rem',
                        color: isRecoveryWeek ? 'var(--color-yellow)' : 'var(--color-text-primary)',
                      }}
                    >
                      Week {weekNum} {isRecoveryWeek ? ' (Recovery / Deload)' : ''}
                    </h3>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: '10px',
                    }}
                  >
                    {weekDays.map((dayInfo) => {
                      const log = getLogForDay(dayInfo.weekNumber, dayInfo.dayOfWeek);
                      const workoutDef = workouts.find((w) => w.id === dayInfo.workoutId);

                      const isCurrent =
                        state.currentCycle === state.selectedCycle &&
                        state.currentWeek === dayInfo.weekNumber &&
                        state.currentDay === dayInfo.dayOfWeek;

                      const isCompleted = log && !log.skipped;
                      const isSkipped = log && log.skipped;
                      const isFuture =
                        !log &&
                        (state.selectedCycle > state.currentCycle ||
                          (state.selectedCycle === state.currentCycle &&
                            (dayInfo.weekNumber > state.currentWeek ||
                              (dayInfo.weekNumber === state.currentWeek &&
                                dayInfo.dayOfWeek > state.currentDay))));

                      const cardStyle: React.CSSProperties = {
                        padding: '12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '100px',
                        transition: 'all var(--transition-fast)',
                      };

                      let badgeType: React.ReactNode = null;

                      if (isCurrent) {
                        cardStyle.border = '2px solid var(--color-purple)';
                        cardStyle.boxShadow = 'var(--shadow-glow-purple)';
                        cardStyle.background = 'hsla(266, 100%, 64%, 0.05)';
                        badgeType = (
                          <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>
                            Active
                          </span>
                        );
                      } else if (isCompleted) {
                        cardStyle.border = '1px solid var(--color-green)';
                        cardStyle.background = 'hsla(142, 72%, 46%, 0.03)';
                        badgeType = (
                          <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>
                            ✓ Done
                          </span>
                        );
                      } else if (isSkipped) {
                        cardStyle.border = '1px solid var(--color-yellow)';
                        cardStyle.background = 'hsla(48, 96%, 53%, 0.03)';
                        badgeType = (
                          <span className="badge badge-yellow" style={{ fontSize: '0.65rem' }}>
                            Skipped
                          </span>
                        );
                      } else if (isFuture) {
                        cardStyle.border = '1px solid var(--color-border)';
                        cardStyle.opacity = 0.5;
                      } else {
                        // Unfinished past day in this cycle (or any past cycle day that was left unlogged)
                        cardStyle.border = '1px solid var(--color-border)';
                      }

                      return (
                        <div
                          key={dayInfo.dayNumber}
                          style={cardStyle}
                          onClick={() => handleDayClick(dayInfo)}
                          className="glass-panel-hover"
                        >
                          <div>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '6px',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  color: 'var(--color-text-muted)',
                                  fontWeight: '600',
                                }}
                              >
                                Day {dayInfo.dayNumber}
                              </span>
                              {badgeType}
                            </div>
                            <h4
                              style={{ fontSize: '0.85rem', fontWeight: '600', lineHeight: '1.2' }}
                            >
                              {workoutDef?.name || 'Rest'}
                            </h4>
                          </div>

                          {workoutDef && workoutDef.abRipper && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                color: 'var(--color-text-muted)',
                                marginTop: '8px',
                              }}
                            >
                              + Ab Ripper X
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
