import React from 'react';
import { DayCard } from './DayCard';
import type { ScheduleDay, WorkoutLog } from '../../types';

interface Phase {
  num: number;
  name: string;
  weeks: number[];
}

interface PhaseSectionProps {
  phase: Phase;
  schedule: ScheduleDay[];
  getLogForDay: (week: number, day: number) => WorkoutLog | undefined;
  handleDayClick: (dayInfo: ScheduleDay) => void;
}

export const PhaseSection: React.FC<PhaseSectionProps> = ({
  phase,
  schedule,
  getLogForDay,
  handleDayClick,
}) => {
  return (
    <div className="phase-section" style={{ marginBottom: '32px' }}>
      <h2
        className="text-primary"
        style={{
          fontSize: '1.4rem',
          borderLeft: '3px solid var(--color-purple)',
          paddingLeft: '12px',
          marginBottom: '16px',
        }}
      >
        Phase {phase.num} ({phase.name})
      </h2>

      <div className="flex flex-col" style={{ gap: '20px' }}>
        {phase.weeks.map((weekNum) => {
          // Filter days in schedule matching this week
          const weekDays = schedule.filter((d) => d.weekNumber === weekNum);
          const isRecoveryWeek = weekNum === 4 || weekNum === 8 || weekNum === 13;

          return (
            <div key={weekNum} className="glass-panel" style={{ padding: '16px' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: '12px' }}>
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
                  return (
                    <DayCard
                      key={dayInfo.dayNumber}
                      dayInfo={dayInfo}
                      log={log}
                      handleDayClick={handleDayClick}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
