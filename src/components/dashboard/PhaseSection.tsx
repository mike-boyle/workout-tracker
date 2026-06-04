import React from 'react';
import { DayCard } from './DayCard';
import type { ScheduleDay, WorkoutLog } from '../../types';
import { Flex, Grid, Card, Heading } from '../ui';
import { useWorkout } from '../../contexts/WorkoutContext';
import { PROGRAMS } from '../../data/schedule';

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
  const { state } = useWorkout();
  const activeProg = state.activeProgramId || 'p90x';
  const program = PROGRAMS[activeProg] || PROGRAMS.p90x;
  const recoveryWeeks = program.recoveryWeeks || [];

  return (
    <div className="phase-section" style={{ marginBottom: '32px' }}>
      <Heading
        level={2}
        color="primary"
        style={{
          fontSize: '1.4rem',
          borderLeft: '3px solid var(--color-purple)',
          paddingLeft: '12px',
          marginBottom: '16px',
        }}
      >
        Phase {phase.num} ({phase.name})
      </Heading>

      <Flex direction="column" gap={4}>
        {phase.weeks.map((weekNum) => {
          // Filter days in schedule matching this week
          const weekDays = schedule.filter((d) => d.weekNumber === weekNum);
          const isRecoveryWeek = recoveryWeeks.includes(weekNum);

          return (
            <Card key={weekNum} style={{ padding: '16px' }}>
              <Flex justify="between" align="center" style={{ marginBottom: '12px' }}>
                <Heading
                  level={3}
                  style={{
                    fontSize: '1rem',
                    color: isRecoveryWeek ? 'var(--color-yellow)' : 'var(--color-text-primary)',
                  }}
                >
                  Week {weekNum} {isRecoveryWeek ? ' (Recovery / Deload)' : ''}
                </Heading>
              </Flex>

              <Grid columns="repeat(auto-fit, minmax(130px, 1fr))" gap="10px">
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
              </Grid>
            </Card>
          );
        })}
      </Flex>
    </div>
  );
};
