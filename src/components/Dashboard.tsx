import React from 'react';
import { useWorkout } from '../contexts/WorkoutContext';
import { getScheduleForProgram } from '../data/schedule';
import type { ScheduleDay } from '../types';
import { AdherenceCard } from './dashboard/AdherenceCard';
import { PhaseSection } from './dashboard/PhaseSection';

export const Dashboard: React.FC = () => {
  const { state } = useWorkout();

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

  const handleDayClick = (dayInfo: ScheduleDay) => {
    // Mutating window.location.hash directly is our lightweight SPA client-side routing mechanism.
    window.location.hash =
      '#/session/cycle/' +
      state.selectedCycle +
      '/week/' +
      dayInfo.weekNumber +
      '/day/' +
      dayInfo.dayOfWeek;
  };

  return (
    <div className="animate-fade-in flex flex-col gap-8">
      {/* Dashboard & Cycle Selector Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 style={{ fontSize: '1.6rem' }}>Calendar Dashboard</h2>
          <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
            {state.selectedCycle === state.currentCycle
              ? `You are currently on Cycle ${state.currentCycle}, Week ${state.currentWeek}, Day ${state.currentDay}`
              : `Reviewing historical data for Cycle ${state.selectedCycle}`}
          </p>
        </div>

        <div className="flex gap-4 items-center">
          <div className="flex gap-2 items-center">
            <span
              className="text-secondary"
              style={{
                fontSize: '0.9rem',
                fontWeight: '500',
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
            className="btn btn-secondary flex items-center"
            style={{
              padding: '6px 12px',
              fontSize: '0.85rem',
              textDecoration: 'none',
            }}
          >
            Manage Cycles
          </a>
        </div>
      </div>

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
    </div>
  );
};
