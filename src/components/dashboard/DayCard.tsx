import React from 'react';
import { workouts } from '../../data/schedule';
import type { ScheduleDay, WorkoutLog } from '../../types';
import { useWorkout } from '../../contexts/WorkoutContext';
import { Flex, Heading, Text, Card, Badge } from '../ui';

interface DayCardProps {
  dayInfo: ScheduleDay;
  log: WorkoutLog | undefined;
  handleDayClick: (dayInfo: ScheduleDay) => void;
}

export const DayCard: React.FC<DayCardProps> = ({ dayInfo, log, handleDayClick }) => {
  const { state } = useWorkout();
  const workoutDef = workouts.find((w) => w.id === dayInfo.workoutId);

  const isCurrent =
    state.metadata.currentCycle === state.ui.selectedCycle &&
    state.metadata.currentWeek === dayInfo.weekNumber &&
    state.metadata.currentDay === dayInfo.dayOfWeek;

  const isCompleted = log && !log.skipped;
  const isSkipped = log && log.skipped;
  const isFuture =
    !log &&
    (state.ui.selectedCycle > state.metadata.currentCycle ||
      (state.ui.selectedCycle === state.metadata.currentCycle &&
        (dayInfo.weekNumber > state.metadata.currentWeek ||
          (dayInfo.weekNumber === state.metadata.currentWeek &&
            dayInfo.dayOfWeek > state.metadata.currentDay))));

  const cardStyle: React.CSSProperties = {
    padding: '12px',
    borderRadius: '8px',
    cursor: 'pointer',
    minHeight: '100px',
    transition: 'all var(--transition-fast)',
  };

  let badgeType: React.ReactNode = null;

  if (isCurrent) {
    cardStyle.border = '2px solid var(--color-purple)';
    cardStyle.boxShadow = 'var(--shadow-glow-purple)';
    cardStyle.background = 'hsla(266, 100%, 64%, 0.05)';
    badgeType = (
      <Badge variant="purple" style={{ fontSize: '0.65rem' }}>
        Active
      </Badge>
    );
  } else if (isCompleted) {
    cardStyle.border = '1px solid var(--color-green)';
    cardStyle.background = 'hsla(142, 72%, 46%, 0.03)';
    badgeType = (
      <Badge variant="green" style={{ fontSize: '0.65rem' }}>
        ✓ Done
      </Badge>
    );
  } else if (isSkipped) {
    cardStyle.border = '1px solid var(--color-yellow)';
    cardStyle.background = 'hsla(48, 96%, 53%, 0.03)';
    badgeType = (
      <Badge variant="yellow" style={{ fontSize: '0.65rem' }}>
        Skipped
      </Badge>
    );
  } else if (isFuture) {
    cardStyle.border = '1px solid var(--color-border)';
    cardStyle.opacity = 0.5;
  } else {
    cardStyle.border = '1px solid var(--color-border)';
  }

  return (
    <Card
      hoverable
      style={cardStyle}
      onClick={() => handleDayClick(dayInfo)}
      className="flex flex-col justify-between"
      role="button"
      aria-label={`Day ${dayInfo.dayNumber}: ${workoutDef?.name || 'Rest'}${isCurrent ? ' (Active)' : ''}${isCompleted ? ' (Done)' : ''}${isSkipped ? ' (Skipped)' : ''}`}
    >
      <div>
        <Flex justify="between" align="center" style={{ marginBottom: '6px' }}>
          <Text color="muted" size="xs" weight="semibold">
            Day {dayInfo.dayNumber}
          </Text>
          {badgeType}
        </Flex>
        <Heading level={4} style={{ fontSize: '0.85rem', fontWeight: '600', lineHeight: '1.2' }}>
          {workoutDef?.name || 'Rest'}
        </Heading>
      </div>

      {workoutDef && workoutDef.abRipper && (
        <Text color="muted" size="xs" style={{ fontSize: '0.7rem', marginTop: '8px' }}>
          + Ab Ripper X
        </Text>
      )}
    </Card>
  );
};
