import React, { useState } from 'react';
import { useWorkout } from '../contexts/WorkoutContext';
import { workouts, getScheduleForProgram, PROGRAMS } from '../data/schedule';
import type { ScheduleDay } from '../types';
import { Flex, Heading, Text, Card, Badge } from './ui';

export const History: React.FC = () => {
  const { state, startNewCycle, loadCycleLogs } = useWorkout();
  const [expandedCycle, setExpandedCycle] = useState<number | null>(null);

  const getCycleStats = (cycleNum: number) => {
    const stats = state.metadata.cycleStats?.[cycleNum];
    const completedCount = stats ? stats.completedCount : 0;
    const skippedCount = stats ? stats.skippedCount : 0;
    const activeProg = state.metadata.activeProgramId || 'p90x';
    const program = PROGRAMS[activeProg] || PROGRAMS.p90x;
    const totalDays = program.totalDays;
    const loggedCount = completedCount + skippedCount;
    const progressPercent = stats ? Math.round((loggedCount / totalDays) * 100) : 0;
    const isCompleted = cycleNum < state.metadata.currentCycle;

    return {
      completedCount,
      skippedCount,
      remainingCount: totalDays - loggedCount,
      progressPercent,
      isCompleted,
    };
  };

  const getPhases = () => {
    const activeProg = state.metadata.activeProgramId || 'p90x';
    const program = PROGRAMS[activeProg] || PROGRAMS.p90x;
    return program.phases;
  };

  const handleDayClick = (cycleNum: number, dayInfo: ScheduleDay) => {
    // eslint-disable-next-line react-hooks/immutability -- Mutating window.location.hash directly is our lightweight SPA client-side routing mechanism, which is outside React's lifecycle and cannot be done through standard state hooks.
    window.location.hash = `#/session/cycle/${cycleNum}/week/${dayInfo.weekNumber}/day/${dayInfo.dayOfWeek}`;
  };

  const handleStartNewCycle = () => {
    if (
      confirm(
        'Are you sure you want to start a new training cycle early? Your current progress pointer will reset to Day 1 of the new cycle, but all past history will be safely preserved.'
      )
    ) {
      startNewCycle();
      window.location.hash = `#/dashboard/cycle/${state.metadata.currentCycle + 1}`;
    }
  };

  return (
    <Flex direction="column" gap={8} className="animate-fade-in">
      {/* Header section */}
      <Flex justify="between" align="center" wrap="wrap" gap={4}>
        <div>
          <Heading level={2} style={{ fontSize: '1.6rem' }}>
            Cycles Tracker History
          </Heading>
          <Text color="secondary" size="sm">
            Browse and review your workout history across all training cycles
          </Text>
        </div>

        <button className="btn btn-primary" onClick={handleStartNewCycle}>
          Start New Cycle Early
        </button>
      </Flex>

      {/* Cycle List */}
      <Flex direction="column" gap={6}>
        {Array.from({ length: state.metadata.currentCycle }, (_, i) => i + 1).map((cNum) => {
          const stats = getCycleStats(cNum);
          const isExpanded = expandedCycle === cNum;
          const isActive = cNum === state.metadata.currentCycle;

          return (
            <Card key={cNum} style={{ padding: '24px' }}>
              {/* Cycle Card Header */}
              <Flex
                justify="between"
                align="center"
                wrap="wrap"
                gap={4}
                style={{ cursor: 'pointer' }}
                role="button"
                aria-expanded={isExpanded}
                aria-label={`Cycle ${cNum}`}
                onClick={() => {
                  const nextExpanded = isExpanded ? null : cNum;
                  setExpandedCycle(nextExpanded);
                  if (nextExpanded !== null) {
                    loadCycleLogs(cNum);
                  }
                }}
              >
                <div style={{ flex: '1 1 200px' }}>
                  <Flex align="center" gap={4} style={{ marginBottom: '4px' }}>
                    <Heading level={3} style={{ fontSize: '1.3rem', margin: 0 }}>
                      Cycle {cNum}
                    </Heading>
                    {isActive ? (
                      <Badge variant="purple" style={{ fontSize: '0.7rem' }}>
                        Active Cycle
                      </Badge>
                    ) : (
                      <Badge variant="green" style={{ fontSize: '0.7rem' }}>
                        Completed
                      </Badge>
                    )}
                  </Flex>
                  <Text color="muted" size="sm" style={{ display: 'block' }}>
                    {stats.progressPercent}% Complete • {stats.completedCount} Workouts Logged
                  </Text>
                </div>

                {/* Mini Stats Panel */}
                <Flex gap={4}>
                  <Flex
                    direction="column"
                    align="center"
                    style={{ minWidth: '70px', textAlign: 'center' }}
                  >
                    <Text color="cyan" size="1.2rem" weight="bold" style={{ display: 'block' }}>
                      {stats.completedCount}
                    </Text>
                    <Text color="muted" size="xs">
                      DONE
                    </Text>
                  </Flex>
                  <Flex
                    direction="column"
                    align="center"
                    style={{ minWidth: '70px', textAlign: 'center' }}
                  >
                    <Text color="yellow" size="1.2rem" weight="bold" style={{ display: 'block' }}>
                      {stats.skippedCount}
                    </Text>
                    <Text color="muted" size="xs">
                      SKIPPED
                    </Text>
                  </Flex>
                  <Flex
                    direction="column"
                    align="center"
                    style={{ minWidth: '70px', textAlign: 'center' }}
                  >
                    <Text color="purple" size="1.2rem" weight="bold" style={{ display: 'block' }}>
                      {stats.remainingCount}
                    </Text>
                    <Text color="muted" size="xs">
                      LEFT
                    </Text>
                  </Flex>
                </Flex>

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
              </Flex>

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
              {isExpanded &&
                (() => {
                  const isCycleLoading = state.ui.loadingCycles[cNum];
                  const cycleLogs = state.loadedCycles[cNum] || [];

                  if (isCycleLoading) {
                    return (
                      <Flex
                        direction="column"
                        align="center"
                        justify="center"
                        gap={4}
                        className="animate-fade-in"
                        style={{
                          marginTop: '24px',
                          paddingTop: '40px',
                          paddingBottom: '40px',
                          borderTop: '1px solid var(--color-border)',
                        }}
                      >
                        <div
                          className="animate-spin"
                          style={{
                            border: '3px solid hsla(var(--hue-base), 15%, 25%, 0.2)',
                            borderTop: '3px solid var(--color-cyan)',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            margin: '0 auto 12px auto',
                          }}
                        />
                        <Text color="muted" size="sm">
                          Loading cycle history...
                        </Text>
                      </Flex>
                    );
                  }

                  return (
                    <Flex
                      direction="column"
                      gap={6}
                      className="animate-fade-in"
                      style={{
                        marginTop: '24px',
                        paddingTop: '24px',
                        borderTop: '1px solid var(--color-border)',
                      }}
                    >
                      {getPhases().map((phase) => (
                        <div key={phase.num}>
                          <Heading
                            level={4}
                            style={{
                              fontSize: '1.1rem',
                              borderLeft: '3px solid var(--color-cyan)',
                              paddingLeft: '10px',
                              marginBottom: '12px',
                              color: 'var(--color-text-primary)',
                            }}
                          >
                            Phase {phase.num} ({phase.name})
                          </Heading>

                          <Flex direction="column" gap={4}>
                            {phase.weeks.map((weekNum) => {
                              const weekDays = getScheduleForProgram(
                                state.metadata.activeProgramId || 'p90x'
                              ).filter((d) => d.weekNumber === weekNum);
                              const activeProg = state.metadata.activeProgramId || 'p90x';
                              const program = PROGRAMS[activeProg] || PROGRAMS.p90x;
                              const isRecoveryWeek = (program.recoveryWeeks || []).includes(
                                weekNum
                              );

                              return (
                                <Card
                                  key={weekNum}
                                  style={{
                                    background: 'hsla(var(--hue-base), 25%, 12%, 0.2)',
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                  }}
                                >
                                  <Heading
                                    level={5}
                                    style={{
                                      margin: '0 0 10px 0',
                                      fontSize: '0.9rem',
                                      color: isRecoveryWeek
                                        ? 'var(--color-yellow)'
                                        : 'var(--color-text-secondary)',
                                    }}
                                  >
                                    Week {weekNum} {isRecoveryWeek ? '(Recovery)' : ''}
                                  </Heading>

                                  {/* Days List */}
                                  <Flex direction="column" gap={2}>
                                    {weekDays.map((dayInfo) => {
                                      const log = cycleLogs.find(
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
                                        <Badge style={{ fontSize: '0.65rem' }}>Unlogged</Badge>
                                      );
                                      if (dayInfo.workoutId === 'rest') {
                                        statusBadge = (
                                          <Badge
                                            variant="purple"
                                            style={{
                                              fontSize: '0.65rem',
                                              background: 'hsla(266, 100%, 64%, 0.15)',
                                              borderColor: 'var(--color-purple)',
                                            }}
                                          >
                                            Rest Day
                                          </Badge>
                                        );
                                      } else if (isCompleted) {
                                        statusBadge = (
                                          <Badge variant="green" style={{ fontSize: '0.65rem' }}>
                                            ✓ Done
                                          </Badge>
                                        );
                                      } else if (isSkipped) {
                                        statusBadge = (
                                          <Badge variant="yellow" style={{ fontSize: '0.65rem' }}>
                                            Skipped
                                          </Badge>
                                        );
                                      }

                                      return (
                                        <Card
                                          hoverable
                                          key={dayInfo.dayNumber}
                                          style={{
                                            padding: '10px 12px',
                                            borderRadius: '6px',
                                            border:
                                              '1px solid hsla(var(--hue-base), 15%, 25%, 0.3)',
                                            cursor: 'pointer',
                                            background: isCompleted
                                              ? 'hsla(142, 72%, 46%, 0.02)'
                                              : isSkipped
                                                ? 'hsla(48, 96%, 53%, 0.02)'
                                                : 'transparent',
                                          }}
                                          role="button"
                                          aria-label={`Cycle ${cNum} Day ${dayInfo.dayNumber}: ${workoutDef?.name || 'Rest'}`}
                                          onClick={() => handleDayClick(cNum, dayInfo)}
                                        >
                                          <Flex justify="between" align="center">
                                            <Flex align="center" gap={4}>
                                              <Text
                                                color="secondary"
                                                size="sm"
                                                weight="semibold"
                                                style={{ minWidth: '50px' }}
                                              >
                                                Day {dayInfo.dayNumber}
                                              </Text>
                                              <Text size="sm" weight="medium">
                                                {workoutDef?.name || 'Rest'}
                                              </Text>
                                            </Flex>
                                            {statusBadge}
                                          </Flex>

                                          {/* Log details excerpt */}
                                          {log && log.comments && (
                                            <Text
                                              color="muted"
                                              size="xs"
                                              style={{
                                                display: 'block',
                                                marginTop: '6px',
                                                paddingLeft: '60px',
                                                fontStyle: 'italic',
                                              }}
                                            >
                                              Notes: {log.comments}
                                            </Text>
                                          )}

                                          {/* Exercise Logging Info */}
                                          {isCompleted &&
                                            log.exercises &&
                                            Object.keys(log.exercises).length > 0 && (
                                              <Text
                                                color="cyan"
                                                size="xs"
                                                style={{
                                                  display: 'block',
                                                  marginTop: '4px',
                                                  paddingLeft: '60px',
                                                }}
                                              >
                                                Logged: {Object.keys(log.exercises).length}{' '}
                                                Exercises
                                              </Text>
                                            )}
                                        </Card>
                                      );
                                    })}
                                  </Flex>
                                </Card>
                              );
                            })}
                          </Flex>
                        </div>
                      ))}
                    </Flex>
                  );
                })()}
            </Card>
          );
        })}
      </Flex>
    </Flex>
  );
};
