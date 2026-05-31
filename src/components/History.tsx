import React, { useState } from 'react';
import { useWorkout } from '../contexts/WorkoutContext';
import { p90xClassicSchedule, workouts } from '../data/schedule';
import type { ScheduleDay } from '../types';

export const History: React.FC = () => {
  const { state, startNewCycle } = useWorkout();
  const [expandedCycle, setExpandedCycle] = useState<number | null>(null);

  // Group schedule days by Phase
  const getPhaseWeeks = (phase: number) => {
    if (phase === 1) return [1, 2, 3, 4];
    if (phase === 2) return [5, 6, 7, 8];
    return [9, 10, 11, 12, 13];
  };

  const getCycleStats = (cycleNum: number) => {
    const cycleLogs = state.logs.filter((log) => log.cycle === cycleNum);
    const completedCount = cycleLogs.filter((log) => !log.skipped).length;
    const skippedCount = cycleLogs.filter((log) => log.skipped).length;
    const totalDays = 91;
    const progressPercent = Math.round((cycleLogs.length / totalDays) * 100);
    const isCompleted =
      cycleLogs.some((log) => log.week === 13 && log.day === 7) || cycleNum < state.currentCycle;

    return {
      completedCount,
      skippedCount,
      remainingCount: totalDays - cycleLogs.length,
      progressPercent,
      isCompleted,
    };
  };

  const handleDayClick = (cycleNum: number, dayInfo: ScheduleDay) => {
    window.location.hash = `#/session/cycle/${cycleNum}/week/${dayInfo.weekNumber}/day/${dayInfo.dayOfWeek}`;
  };

  const handleStartNewCycle = () => {
    if (
      confirm(
        'Are you sure you want to start a new training cycle early? Your current progress pointer will reset to Day 1 of the new cycle, but all past history will be safely preserved.'
      )
    ) {
      startNewCycle();
      window.location.hash = `#/dashboard/cycle/${state.currentCycle + 1}`;
    }
  };

  return (
    <div
      className="animate-fade-in"
      style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}
    >
      {/* Header section */}
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
          <h2 style={{ fontSize: '1.6rem' }}>Cycles Tracker History</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            Browse and review your workout history across all training cycles
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleStartNewCycle}>
          Start New Cycle Early
        </button>
      </div>

      {/* Cycle List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {Array.from({ length: state.currentCycle }, (_, i) => i + 1).map((cNum) => {
          const stats = getCycleStats(cNum);
          const isExpanded = expandedCycle === cNum;
          const isActive = cNum === state.currentCycle;

          return (
            <div key={cNum} className="glass-panel" style={{ padding: '24px' }}>
              {/* Cycle Card Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                  cursor: 'pointer',
                }}
                onClick={() => setExpandedCycle(isExpanded ? null : cNum)}
              >
                <div style={{ flex: '1 1 200px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '4px',
                    }}
                  >
                    <h3 style={{ fontSize: '1.3rem', margin: 0 }}>Cycle {cNum}</h3>
                    {isActive ? (
                      <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                        Active Cycle
                      </span>
                    ) : (
                      <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                        Completed
                      </span>
                    )}
                  </div>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 0 }}>
                    {stats.progressPercent}% Complete • {stats.completedCount} Workouts Logged
                  </p>
                </div>

                {/* Mini Stats Panel */}
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ textAlign: 'center', minWidth: '70px' }}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: '1.2rem',
                        fontWeight: '700',
                        color: 'var(--color-cyan)',
                      }}
                    >
                      {stats.completedCount}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                      DONE
                    </span>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: '70px' }}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: '1.2rem',
                        fontWeight: '700',
                        color: 'var(--color-yellow)',
                      }}
                    >
                      {stats.skippedCount}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                      SKIPPED
                    </span>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: '70px' }}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: '1.2rem',
                        fontWeight: '700',
                        color: 'var(--color-purple)',
                      }}
                    >
                      {stats.remainingCount}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                      LEFT
                    </span>
                  </div>
                </div>

                {/* Expand Toggle Chevron */}
                <span
                  style={{
                    fontSize: '1.2rem',
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform var(--transition-fast)',
                    padding: '0 8px',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  ▶
                </span>
              </div>

              {/* Progress bar */}
              <div
                style={{
                  background: 'hsla(var(--hue-base), 25%, 8%, 0.5)',
                  borderRadius: '9999px',
                  height: '6px',
                  width: '100%',
                  overflow: 'hidden',
                  border: '1px solid var(--color-border)',
                  marginTop: '16px',
                }}
              >
                <div
                  style={{
                    background: 'var(--gradient-primary)',
                    height: '100%',
                    width: `${stats.progressPercent}%`,
                    borderRadius: '9999px',
                  }}
                />
              </div>

              {/* Detailed Schedule Breakdown (Expanded View) */}
              {isExpanded && (
                <div
                  className="animate-fade-in"
                  style={{
                    marginTop: '24px',
                    paddingTop: '24px',
                    borderTop: '1px solid var(--color-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px',
                  }}
                >
                  {[1, 2, 3].map((phaseNum) => (
                    <div key={phaseNum}>
                      <h4
                        style={{
                          fontSize: '1.1rem',
                          borderLeft: '3px solid var(--color-cyan)',
                          paddingLeft: '10px',
                          marginBottom: '12px',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        Phase {phaseNum}{' '}
                        {phaseNum === 1
                          ? '(Foundation)'
                          : phaseNum === 2
                            ? '(Max Strength)'
                            : '(The Final Stretch)'}
                      </h4>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {getPhaseWeeks(phaseNum).map((weekNum) => {
                          const weekDays = p90xClassicSchedule.filter(
                            (d) => d.weekNumber === weekNum
                          );
                          const isRecoveryWeek = weekNum === 4 || weekNum === 8 || weekNum === 13;

                          return (
                            <div
                              key={weekNum}
                              style={{
                                background: 'hsla(var(--hue-base), 25%, 12%, 0.2)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '8px',
                                padding: '12px 16px',
                              }}
                            >
                              <h5
                                style={{
                                  margin: '0 0 10px 0',
                                  fontSize: '0.9rem',
                                  color: isRecoveryWeek
                                    ? 'var(--color-yellow)'
                                    : 'var(--color-text-secondary)',
                                }}
                              >
                                Week {weekNum} {isRecoveryWeek ? '(Recovery)' : ''}
                              </h5>

                              {/* Days List */}
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px',
                                }}
                              >
                                {weekDays.map((dayInfo) => {
                                  const log = state.logs.find(
                                    (l) =>
                                      l.cycle === cNum &&
                                      l.week === dayInfo.weekNumber &&
                                      l.day === dayInfo.dayOfWeek
                                  );

                                  const workoutDef = workouts.find(
                                    (w) => w.id === dayInfo.workoutId
                                  );
                                  const isCompleted = log && !log.skipped;
                                  const isSkipped = log && log.skipped;

                                  let statusBadge = (
                                    <span className="badge" style={{ fontSize: '0.65rem' }}>
                                      Unlogged
                                    </span>
                                  );
                                  if (dayInfo.workoutId === 'rest') {
                                    statusBadge = (
                                      <span
                                        className="badge badge-purple"
                                        style={{
                                          fontSize: '0.65rem',
                                          background: 'hsla(266, 100%, 64%, 0.15)',
                                          border: '1px solid var(--color-purple)',
                                        }}
                                      >
                                        Rest Day
                                      </span>
                                    );
                                  } else if (isCompleted) {
                                    statusBadge = (
                                      <span
                                        className="badge badge-green"
                                        style={{ fontSize: '0.65rem' }}
                                      >
                                        ✓ Done
                                      </span>
                                    );
                                  } else if (isSkipped) {
                                    statusBadge = (
                                      <span
                                        className="badge badge-yellow"
                                        style={{ fontSize: '0.65rem' }}
                                      >
                                        Skipped
                                      </span>
                                    );
                                  }

                                  return (
                                    <div
                                      key={dayInfo.dayNumber}
                                      className="glass-panel-hover"
                                      style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        padding: '10px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid hsla(var(--hue-base), 15%, 25%, 0.3)',
                                        cursor: 'pointer',
                                        background: isCompleted
                                          ? 'hsla(142, 72%, 46%, 0.02)'
                                          : isSkipped
                                            ? 'hsla(48, 96%, 53%, 0.02)'
                                            : 'transparent',
                                      }}
                                      onClick={() => handleDayClick(cNum, dayInfo)}
                                    >
                                      <div
                                        style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                          }}
                                        >
                                          <span
                                            style={{
                                              fontSize: '0.8rem',
                                              fontWeight: '600',
                                              color: 'var(--color-text-secondary)',
                                              minWidth: '50px',
                                            }}
                                          >
                                            Day {dayInfo.dayNumber}
                                          </span>
                                          <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                                            {workoutDef?.name || 'Rest'}
                                          </span>
                                        </div>
                                        {statusBadge}
                                      </div>

                                      {/* Log details excerpt */}
                                      {log && log.comments && (
                                        <div
                                          style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--color-text-muted)',
                                            marginTop: '6px',
                                            paddingLeft: '60px',
                                            fontStyle: 'italic',
                                          }}
                                        >
                                          Notes: {log.comments}
                                        </div>
                                      )}

                                      {/* Exercise Logging Info */}
                                      {isCompleted &&
                                        log.exercises &&
                                        Object.keys(log.exercises).length > 0 && (
                                          <div
                                            style={{
                                              fontSize: '0.75rem',
                                              color: 'var(--color-cyan)',
                                              marginTop: '4px',
                                              paddingLeft: '60px',
                                            }}
                                          >
                                            Logged: {Object.keys(log.exercises).length} Exercises
                                          </div>
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
