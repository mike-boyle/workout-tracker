import React from 'react';
import { workouts } from '../../data/schedule';
import type { ScheduleDay, WorkoutLog } from '../../types';
import { useWorkout } from '../../contexts/WorkoutContext';

interface DayCardProps {
  dayInfo: ScheduleDay;
  log: WorkoutLog | undefined;
  handleDayClick: (dayInfo: ScheduleDay) => void;
}

export const DayCard: React.FC<DayCardProps> = ({ dayInfo, log, handleDayClick }) => {
  const { state } = useWorkout();
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
          (dayInfo.weekNumber === state.currentWeek && dayInfo.dayOfWeek > state.currentDay))));

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
    cardStyle.border = '1px solid var(--color-border)';
  }

  return (
    <div
      style={cardStyle}
      onClick={() => handleDayClick(dayInfo)}
      className="glass-panel-hover flex flex-col justify-between"
    >
      <div>
        <div className="flex justify-between items-center" style={{ marginBottom: '6px' }}>
          <span
            className="text-muted"
            style={{
              fontSize: '0.75rem',
              fontWeight: '600',
            }}
          >
            Day {dayInfo.dayNumber}
          </span>
          {badgeType}
        </div>
        <h4 style={{ fontSize: '0.85rem', fontWeight: '600', lineHeight: '1.2' }}>
          {workoutDef?.name || 'Rest'}
        </h4>
      </div>

      {workoutDef && workoutDef.abRipper && (
        <span
          className="text-muted"
          style={{
            fontSize: '0.7rem',
            marginTop: '8px',
          }}
        >
          + Ab Ripper X
        </span>
      )}
    </div>
  );
};
