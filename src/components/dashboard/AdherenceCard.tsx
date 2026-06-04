import React from 'react';
import { useWorkout } from '../../contexts/WorkoutContext';
import { Flex, Heading, Text, Card } from '../ui';

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
    <Flex direction="column" gap={6}>
      {/* Stats Summary Panel */}
      <Card style={{ padding: '24px' }}>
        <Flex justify="between" align="center" wrap="wrap" gap={6}>
          <div style={{ flex: '1 1 300px' }}>
            <Heading level={2} style={{ fontSize: '1.8rem', marginBottom: '8px' }}>
              Cycle {state.selectedCycle} Adherence
            </Heading>
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
            <Flex justify="between" className="text-secondary" style={{ marginTop: '8px' }}>
              <Text size="sm">{progressPercent}% Complete</Text>
              <Text size="sm">
                {selectedCycleLogs.length} / {totalDays} Days Tracked
              </Text>
            </Flex>
          </div>

          <Flex gap={4}>
            <Flex
              direction="column"
              align="center"
              style={{ minWidth: '80px', textAlign: 'center' }}
            >
              <Text color="cyan" size="1.8rem" weight="bold" style={{ display: 'block' }}>
                {completedCount}
              </Text>
              <Text color="secondary" size="xs" style={{ textTransform: 'uppercase' }}>
                Workouts
              </Text>
            </Flex>
            <Flex
              direction="column"
              align="center"
              style={{ minWidth: '80px', textAlign: 'center' }}
            >
              <Text color="yellow" size="1.8rem" weight="bold" style={{ display: 'block' }}>
                {skippedCount}
              </Text>
              <Text color="secondary" size="xs" style={{ textTransform: 'uppercase' }}>
                Skipped
              </Text>
            </Flex>
            <Flex
              direction="column"
              align="center"
              style={{ minWidth: '80px', textAlign: 'center' }}
            >
              <Text color="purple" size="1.8rem" weight="bold" style={{ display: 'block' }}>
                {totalDays - selectedCycleLogs.length}
              </Text>
              <Text color="secondary" size="xs" style={{ textTransform: 'uppercase' }}>
                Remaining
              </Text>
            </Flex>
          </Flex>
        </Flex>
      </Card>

      {/* Cycle Completion Prompt */}
      {showStartNextCyclePrompt && (
        <Card
          style={{
            padding: '24px',
            border: '1px solid var(--color-cyan)',
            boxShadow: 'var(--shadow-glow-cyan)',
            textAlign: 'center',
          }}
        >
          <Heading level={2} color="cyan" style={{ marginBottom: '8px' }}>
            🎉 Congratulations! Cycle Complete!
          </Heading>
          <Text variant="p" color="secondary" style={{ marginBottom: '16px' }}>
            You completed all 13 weeks of this training cycle. Ready to start another round of
            muscle confusion?
          </Text>
          <button
            className="btn btn-primary"
            onClick={() => {
              startNewCycle();
              window.location.hash = `#/dashboard/cycle/${state.currentCycle + 1}`;
            }}
          >
            Start Cycle {state.currentCycle + 1}
          </button>
        </Card>
      )}
    </Flex>
  );
};
