import React from 'react';
import { useWorkout } from '../contexts/WorkoutContext';
import { getScheduleForProgram, PROGRAMS } from '../data/schedule';
import type { ScheduleDay } from '../types';
import { AdherenceCard } from './dashboard/AdherenceCard';
import { PhaseSection } from './dashboard/PhaseSection';
import { Flex, Heading, Text } from './ui';

export const Dashboard: React.FC = () => {
  const { state } = useWorkout();

  // Helper to find log for a specific day in the selected cycle
  const getLogForDay = (week: number, day: number) => {
    return state.logs.find(
      (log) => log.cycle === state.ui.selectedCycle && log.week === week && log.day === day
    );
  };

  const schedule = getScheduleForProgram(state.metadata.activeProgramId || 'p90x');

  const getPhases = () => {
    const activeProg = state.metadata.activeProgramId || 'p90x';
    const program = PROGRAMS[activeProg] || PROGRAMS.p90x;
    return program.phases;
  };

  const handleDayClick = (dayInfo: ScheduleDay) => {
    // Mutating window.location.hash directly is our lightweight SPA client-side routing mechanism.
    window.location.hash =
      '#/session/cycle/' +
      state.ui.selectedCycle +
      '/week/' +
      dayInfo.weekNumber +
      '/day/' +
      dayInfo.dayOfWeek;
  };

  return (
    <Flex direction="column" gap={8} className="animate-fade-in">
      {/* Dashboard & Cycle Selector Header */}
      <Flex justify="between" align="center" wrap="wrap" gap={4}>
        <div>
          <Heading level={2} style={{ fontSize: '1.6rem' }}>
            Calendar Dashboard
          </Heading>
          <Text variant="p" color="secondary" size="sm">
            {state.ui.selectedCycle === state.metadata.currentCycle
              ? `You are currently on Cycle ${state.metadata.currentCycle}, Week ${state.metadata.currentWeek}, Day ${state.metadata.currentDay}`
              : `Reviewing historical data for Cycle ${state.ui.selectedCycle}`}
          </Text>
        </div>

        <Flex gap={4} align="center">
          <Flex gap={2} align="center">
            <Text color="secondary" size="sm" weight="medium">
              View Cycle:
            </Text>
            <select
              className="input-field"
              style={{
                width: 'auto',
                padding: '6px 12px',
                fontSize: '0.9rem',
                background: 'var(--color-bg-surface)',
                borderColor: 'var(--color-border)',
              }}
              value={state.ui.selectedCycle}
              onChange={(e) => {
                window.location.hash = `#/dashboard/cycle/${e.target.value}`;
              }}
            >
              {Array.from({ length: state.metadata.currentCycle }, (_, i) => i + 1).map((c) => (
                <option key={c} value={c}>
                  Cycle {c}
                </option>
              ))}
            </select>
          </Flex>
          <a
            href="#/history"
            className="btn btn-secondary flex items-center"
            style={{
              padding: '6px 12px',
              fontSize: '0.85rem',
              textDecoration: 'none',
            }}
          >
            Manage Cycles
          </a>
        </Flex>
      </Flex>

      {/* Adherence and completion prompts */}
      <AdherenceCard />

      {/* Calendar Phases */}
      {getPhases().map((phase) => (
        <PhaseSection
          key={phase.num}
          phase={phase}
          schedule={schedule}
          getLogForDay={getLogForDay}
          handleDayClick={handleDayClick}
        />
      ))}
    </Flex>
  );
};
