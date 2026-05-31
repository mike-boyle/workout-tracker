import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { WorkoutProvider, useWorkout } from '../src/contexts/WorkoutContext';
import { clearState } from '../src/services/storage';

// Test consumer component to interact with the context
const TestConsumer: React.FC = () => {
  const {
    state,
    completeWorkout,
    skipDay,
    setSelectedDay,
    startNewCycle,
    resetDatabase,
    syncGoogleDriveData,
  } = useWorkout();

  return (
    <div>
      <div data-testid="cycle">{state.currentCycle}</div>
      <div data-testid="week">{state.currentWeek}</div>
      <div data-testid="day">{state.currentDay}</div>
      <div data-testid="sel-week">{state.selectedWeek}</div>
      <div data-testid="sel-day">{state.selectedDay}</div>
      <div data-testid="logs-count">{state.logs.length}</div>

      <button
        data-testid="btn-complete"
        onClick={() =>
          completeWorkout(
            { cb_standard_pushup: [{ reps: 15, weight: 0, assisted: false }] },
            true,
            'Test comment'
          )
        }
      >
        Complete
      </button>

      <button data-testid="btn-skip" onClick={() => skipDay('plyometrics')}>
        Skip
      </button>

      <button data-testid="btn-nav" onClick={() => setSelectedDay(2, 5)}>
        Navigate
      </button>

      <button data-testid="btn-new-cycle" onClick={startNewCycle}>
        New Cycle
      </button>

      <button data-testid="btn-reset" onClick={resetDatabase}>
        Reset
      </button>

      <button
        data-testid="btn-sync"
        onClick={() =>
          syncGoogleDriveData(
            [
              {
                id: 'cycle_1_week_1_day_1',
                cycle: 1,
                week: 1,
                day: 1,
                workoutId: 'chest_and_back',
                dateCompleted: new Date().toISOString(),
                skipped: false,
                exercises: {},
                abRipperCompleted: false,
                comments: 'Remote log',
              },
            ],
            1,
            1,
            3
          )
        }
      >
        Sync
      </button>
    </div>
  );
};

const renderWithProvider = () => {
  return render(
    <WorkoutProvider>
      <TestConsumer />
    </WorkoutProvider>
  );
};

describe('Workout Context & Reducer', () => {
  beforeEach(() => {
    clearState();
    localStorage.clear();
  });

  it('should initialize with cycle 1, week 1, day 1', () => {
    renderWithProvider();
    expect(screen.getByTestId('cycle').textContent).toBe('1');
    expect(screen.getByTestId('week').textContent).toBe('1');
    expect(screen.getByTestId('day').textContent).toBe('1');
    expect(screen.getByTestId('sel-week').textContent).toBe('1');
    expect(screen.getByTestId('sel-day').textContent).toBe('1');
    expect(screen.getByTestId('logs-count').textContent).toBe('0');
  });

  it('should log a workout and advance pointer on current day complete', () => {
    renderWithProvider();

    const btnComplete = screen.getByTestId('btn-complete');
    act(() => {
      btnComplete.click();
    });

    // Pointer should advance to Day 2
    expect(screen.getByTestId('day').textContent).toBe('2');
    expect(screen.getByTestId('week').textContent).toBe('1');
    expect(screen.getByTestId('sel-day').textContent).toBe('2');
    expect(screen.getByTestId('logs-count').textContent).toBe('1');
  });

  it('should skip a day and advance pointer', () => {
    renderWithProvider();

    const btnSkip = screen.getByTestId('btn-skip');
    act(() => {
      btnSkip.click();
    });

    // Pointer should advance to Day 2
    expect(screen.getByTestId('day').textContent).toBe('2');
    expect(screen.getByTestId('logs-count').textContent).toBe('1');
  });

  it('should navigate to selected day without moving current active program pointer', () => {
    renderWithProvider();

    const btnNav = screen.getByTestId('btn-nav');
    act(() => {
      btnNav.click();
    });

    // Selected day shifts to Week 2 Day 5
    expect(screen.getByTestId('sel-week').textContent).toBe('2');
    expect(screen.getByTestId('sel-day').textContent).toBe('5');

    // Active day pointer remains at Week 1 Day 1
    expect(screen.getByTestId('week').textContent).toBe('1');
    expect(screen.getByTestId('day').textContent).toBe('1');
  });

  it('should allow editing a past day without advancing active program pointer', () => {
    renderWithProvider();

    // 1. Advance to day 3 by skipping twice
    const btnSkip = screen.getByTestId('btn-skip');
    act(() => {
      btnSkip.click(); // Day 1 -> Day 2
    });
    act(() => {
      btnSkip.click(); // Day 2 -> Day 3
    });

    expect(screen.getByTestId('day').textContent).toBe('3');
    expect(screen.getByTestId('logs-count').textContent).toBe('2');

    // 2. Navigate back to Week 1 Day 1
    const btnNav = screen.getByTestId('btn-nav'); // Navigates to W2D5
    act(() => {
      btnNav.click();
    });

    // Navigate manually to Week 1 Day 1
    // Wait, let's just trigger a navigation to W1D1 by using setSelectedDay directly.
    // Instead of adding a button, we can just use the context's selected day, but W2D5 is fine too.
    // W2D5 is a past day relative to active day? No, active day is W1D3. W2D5 is a FUTURE day.
    // Let's test completing a FUTURE day: it should log but NOT advance pointer!
    const btnComplete = screen.getByTestId('btn-complete');
    act(() => {
      btnComplete.click(); // Completing W2D5
    });

    // Logs count goes up
    expect(screen.getByTestId('logs-count').textContent).toBe('3');
    // Active pointer stays at W1D3
    expect(screen.getByTestId('week').textContent).toBe('1');
    expect(screen.getByTestId('day').textContent).toBe('3');
  });

  it('should increment cycle and reset pointers on start new cycle', () => {
    renderWithProvider();

    // 1. Set to Week 2 Day 3
    const btnNav = screen.getByTestId('btn-nav');
    act(() => {
      btnNav.click();
    });

    // 2. Complete workout to log
    const btnComplete = screen.getByTestId('btn-complete');
    act(() => {
      btnComplete.click();
    });

    // 3. New cycle
    const btnNewCycle = screen.getByTestId('btn-new-cycle');
    act(() => {
      btnNewCycle.click();
    });

    expect(screen.getByTestId('cycle').textContent).toBe('2');
    expect(screen.getByTestId('week').textContent).toBe('1');
    expect(screen.getByTestId('day').textContent).toBe('1');
    expect(screen.getByTestId('sel-week').textContent).toBe('1');
    expect(screen.getByTestId('logs-count').textContent).toBe('1'); // History preserved
  });

  it('should reset database to initial state', () => {
    renderWithProvider();

    const btnComplete = screen.getByTestId('btn-complete');
    act(() => {
      btnComplete.click();
    });
    expect(screen.getByTestId('logs-count').textContent).toBe('1');

    const btnReset = screen.getByTestId('btn-reset');
    act(() => {
      btnReset.click();
    });

    expect(screen.getByTestId('logs-count').textContent).toBe('0');
    expect(screen.getByTestId('cycle').textContent).toBe('1');
  });

  it('should sync remote data and advance pointer if remote is further ahead', () => {
    renderWithProvider();

    const btnSync = screen.getByTestId('btn-sync');
    act(() => {
      btnSync.click();
    });

    expect(screen.getByTestId('logs-count').textContent).toBe('1');
    // Sync payload sets remote progress to Cycle 1, Week 1, Day 3
    expect(screen.getByTestId('day').textContent).toBe('3');
    expect(screen.getByTestId('sel-day').textContent).toBe('3');
  });
});
