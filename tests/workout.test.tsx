import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { WorkoutProvider, useWorkout } from '../src/contexts/WorkoutContext';
import { clearLocalState, db } from '../src/services/storage';

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

  if (state.loading) {
    return <div data-testid="loading">Loading...</div>;
  }

  return (
    <div>
      <div data-testid="cycle">{state.currentCycle}</div>
      <div data-testid="week">{state.currentWeek}</div>
      <div data-testid="day">{state.currentDay}</div>
      <div data-testid="sel-week">{state.selectedWeek}</div>
      <div data-testid="sel-day">{state.selectedDay}</div>
      <div data-testid="logs-count">{state.logs.length}</div>
      <div data-testid="cycle-1-logs-count">{state.loadedCycles[1]?.length || 0}</div>

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
            {
              version: 1,
              currentCycle: 1,
              currentWeek: 1,
              currentDay: 3,
              gdriveLinked: true,
              cycleFileIds: {},
              cycleTimestamps: {},
              cycleStats: {},
            },
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
            ]
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
  let store: { [key: string]: any } = {};

  beforeEach(async () => {
    store = {};
    localStorage.clear();
    vi.restoreAllMocks();

    // Mock IndexedDB database calls to run in-memory during tests
    vi.spyOn(db, 'get').mockImplementation(async (key: string) => store[key] || null);
    vi.spyOn(db, 'set').mockImplementation(async (key: string, val: any) => {
      store[key] = val;
    });
    vi.spyOn(db, 'delete').mockImplementation(async (key: string) => {
      delete store[key];
    });
    vi.spyOn(db, 'clear').mockImplementation(async () => {
      store = {};
    });

    await clearLocalState();
  });

  it('should initialize with cycle 1, week 1, day 1', async () => {
    renderWithProvider();
    expect(await screen.findByTestId('cycle')).toHaveTextContent('1');
    expect(screen.getByTestId('week').textContent).toBe('1');
    expect(screen.getByTestId('day').textContent).toBe('1');
    expect(screen.getByTestId('sel-week').textContent).toBe('1');
    expect(screen.getByTestId('sel-day').textContent).toBe('1');
    expect(screen.getByTestId('logs-count').textContent).toBe('0');
  });

  it('should log a workout and advance pointer on current day complete', async () => {
    renderWithProvider();
    expect(await screen.findByTestId('cycle')).toHaveTextContent('1');

    const btnComplete = screen.getByTestId('btn-complete');
    await act(async () => {
      btnComplete.click();
    });

    // Pointer should advance to Day 2
    expect(screen.getByTestId('day').textContent).toBe('2');
    expect(screen.getByTestId('week').textContent).toBe('1');
    expect(screen.getByTestId('sel-day').textContent).toBe('2');
    expect(screen.getByTestId('logs-count').textContent).toBe('1');
  });

  it('should skip a day and advance pointer', async () => {
    renderWithProvider();
    expect(await screen.findByTestId('cycle')).toHaveTextContent('1');

    const btnSkip = screen.getByTestId('btn-skip');
    await act(async () => {
      btnSkip.click();
    });

    // Pointer should advance to Day 2
    expect(screen.getByTestId('day').textContent).toBe('2');
    expect(screen.getByTestId('logs-count').textContent).toBe('1');
  });

  it('should navigate to selected day without moving current active program pointer', async () => {
    renderWithProvider();
    expect(await screen.findByTestId('cycle')).toHaveTextContent('1');

    const btnNav = screen.getByTestId('btn-nav');
    await act(async () => {
      btnNav.click();
    });

    // Selected day shifts to Week 2 Day 5
    expect(screen.getByTestId('sel-week').textContent).toBe('2');
    expect(screen.getByTestId('sel-day').textContent).toBe('5');

    // Active day pointer remains at Week 1 Day 1
    expect(screen.getByTestId('week').textContent).toBe('1');
    expect(screen.getByTestId('day').textContent).toBe('1');
  });

  it('should allow editing a past day without advancing active program pointer', async () => {
    renderWithProvider();
    expect(await screen.findByTestId('cycle')).toHaveTextContent('1');

    // 1. Advance to day 3 by skipping twice
    const btnSkip = screen.getByTestId('btn-skip');
    await act(async () => {
      btnSkip.click(); // Day 1 -> Day 2
    });
    await act(async () => {
      btnSkip.click(); // Day 2 -> Day 3
    });

    expect(screen.getByTestId('day').textContent).toBe('3');
    expect(screen.getByTestId('logs-count').textContent).toBe('2');

    // 2. Navigate to Week 2 Day 5
    const btnNav = screen.getByTestId('btn-nav');
    await act(async () => {
      btnNav.click();
    });

    // Complete W2D5
    const btnComplete = screen.getByTestId('btn-complete');
    await act(async () => {
      btnComplete.click();
    });

    // Logs count goes up
    expect(screen.getByTestId('logs-count').textContent).toBe('3');
    // Active pointer stays at W1D3
    expect(screen.getByTestId('week').textContent).toBe('1');
    expect(screen.getByTestId('day').textContent).toBe('3');
  });

  it('should increment cycle and reset pointers on start new cycle', async () => {
    renderWithProvider();
    expect(await screen.findByTestId('cycle')).toHaveTextContent('1');

    // 1. Set to Week 2 Day 3
    const btnNav = screen.getByTestId('btn-nav');
    await act(async () => {
      btnNav.click();
    });

    // 2. Complete workout to log
    const btnComplete = screen.getByTestId('btn-complete');
    await act(async () => {
      btnComplete.click();
    });

    // 3. New cycle
    const btnNewCycle = screen.getByTestId('btn-new-cycle');
    await act(async () => {
      btnNewCycle.click();
    });

    expect(screen.getByTestId('cycle').textContent).toBe('2');
    expect(screen.getByTestId('week').textContent).toBe('1');
    expect(screen.getByTestId('day').textContent).toBe('1');
    expect(screen.getByTestId('sel-week').textContent).toBe('1');
    expect(screen.getByTestId('logs-count').textContent).toBe('0'); // Cycle 2 has 0 logs
    expect(screen.getByTestId('cycle-1-logs-count').textContent).toBe('1'); // Cycle 1 history preserved
  });

  it('should reset database to initial state', async () => {
    renderWithProvider();
    expect(await screen.findByTestId('cycle')).toHaveTextContent('1');

    const btnComplete = screen.getByTestId('btn-complete');
    await act(async () => {
      btnComplete.click();
    });
    expect(screen.getByTestId('logs-count').textContent).toBe('1');

    const btnReset = screen.getByTestId('btn-reset');
    await act(async () => {
      btnReset.click();
    });

    // Wait for reset state to render
    expect(await screen.findByTestId('logs-count')).toHaveTextContent('0');
    expect(screen.getByTestId('cycle').textContent).toBe('1');
  });

  it('should sync remote data and advance pointer if remote is further ahead', async () => {
    renderWithProvider();
    expect(await screen.findByTestId('cycle')).toHaveTextContent('1');

    const btnSync = screen.getByTestId('btn-sync');
    await act(async () => {
      btnSync.click();
    });

    expect(screen.getByTestId('logs-count').textContent).toBe('1');
    // Sync payload sets remote progress to Cycle 1, Week 1, Day 3
    expect(screen.getByTestId('day').textContent).toBe('3');
    expect(screen.getByTestId('sel-day').textContent).toBe('3');
  });
});
