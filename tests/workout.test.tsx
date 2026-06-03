import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { WorkoutProvider, useWorkout } from '../src/contexts/WorkoutContext';
import { clearLocalState, db } from '../src/services/storage';
import { generateWizardSteps } from '../src/utils/wizard';

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
    fastForwardToDay,
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

      <button data-testid="btn-fast-forward" onClick={() => fastForwardToDay(1, 4)}>
        Fast Forward
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
  let store: Record<string, unknown> = {};

  beforeEach(async () => {
    store = {};
    localStorage.clear();
    vi.restoreAllMocks();

    // Mock IndexedDB database calls to run in-memory during tests
    vi.spyOn(db, 'get').mockImplementation(async (key: string) => store[key] || null);
    vi.spyOn(db, 'set').mockImplementation(async (key: string, val: unknown) => {
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

  it('should fast-forward progress to a future day and create intermediate skip logs', async () => {
    renderWithProvider();
    expect(await screen.findByTestId('cycle')).toHaveTextContent('1');
    expect(screen.getByTestId('week').textContent).toBe('1');
    expect(screen.getByTestId('day').textContent).toBe('1');
    expect(screen.getByTestId('logs-count').textContent).toBe('0');

    const btnFastForward = screen.getByTestId('btn-fast-forward');
    await act(async () => {
      btnFastForward.click();
    });

    expect(screen.getByTestId('week').textContent).toBe('1');
    expect(screen.getByTestId('day').textContent).toBe('4');
    expect(screen.getByTestId('sel-week').textContent).toBe('1');
    expect(screen.getByTestId('sel-day').textContent).toBe('4');
    expect(screen.getByTestId('logs-count').textContent).toBe('3');
    expect(screen.getByTestId('cycle-1-logs-count').textContent).toBe('3');
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

describe('Workout Wizard View step generation', () => {
  it('should generate steps for chest_and_back with correct swapping logic on set 2', () => {
    const exercises = [
      'ex1',
      'ex2',
      'ex3',
      'ex4',
      'ex5',
      'ex6',
      'ex7',
      'ex8',
      'ex9',
      'ex10',
      'ex11',
      'ex12',
    ];
    const steps = generateWizardSteps('chest_and_back', exercises);

    // Total steps: 12 (Set 1) + 12 (Set 2) = 24
    expect(steps.length).toBe(24);

    // Set 1: default order
    for (let i = 0; i < 12; i++) {
      expect(steps[i]).toEqual({ exerciseId: exercises[i], setIndex: 0 });
    }

    // Set 2: swapped order within groups of 4
    // Group 1: 1, 0, 3, 2 (i.e. ex2, ex1, ex4, ex3)
    expect(steps[12]).toEqual({ exerciseId: 'ex2', setIndex: 1 });
    expect(steps[13]).toEqual({ exerciseId: 'ex1', setIndex: 1 });
    expect(steps[14]).toEqual({ exerciseId: 'ex4', setIndex: 1 });
    expect(steps[15]).toEqual({ exerciseId: 'ex3', setIndex: 1 });

    // Group 2: 5, 4, 7, 6 (i.e. ex6, ex5, ex8, ex7)
    expect(steps[16]).toEqual({ exerciseId: 'ex6', setIndex: 1 });
    expect(steps[17]).toEqual({ exerciseId: 'ex5', setIndex: 1 });
    expect(steps[18]).toEqual({ exerciseId: 'ex8', setIndex: 1 });
    expect(steps[19]).toEqual({ exerciseId: 'ex7', setIndex: 1 });

    // Group 3: 9, 8, 11, 10 (i.e. ex10, ex9, ex12, ex11)
    expect(steps[20]).toEqual({ exerciseId: 'ex10', setIndex: 1 });
    expect(steps[21]).toEqual({ exerciseId: 'ex9', setIndex: 1 });
    expect(steps[22]).toEqual({ exerciseId: 'ex12', setIndex: 1 });
    expect(steps[23]).toEqual({ exerciseId: 'ex11', setIndex: 1 });
  });

  it('should generate steps for shoulders_and_arms with correct round grouping', () => {
    const exercises = Array.from({ length: 15 }, (_, i) => `ex${i + 1}`);
    const steps = generateWizardSteps('shoulders_and_arms', exercises);

    // Total steps: 15 exercises * 2 sets = 30 steps
    expect(steps.length).toBe(30);

    // Round 0: ex1, ex2, ex3 Set 1 then Set 2
    expect(steps[0]).toEqual({ exerciseId: 'ex1', setIndex: 0 });
    expect(steps[1]).toEqual({ exerciseId: 'ex2', setIndex: 0 });
    expect(steps[2]).toEqual({ exerciseId: 'ex3', setIndex: 0 });
    expect(steps[3]).toEqual({ exerciseId: 'ex1', setIndex: 1 });
    expect(steps[4]).toEqual({ exerciseId: 'ex2', setIndex: 1 });
    expect(steps[5]).toEqual({ exerciseId: 'ex3', setIndex: 1 });

    // Round 1: ex4, ex5, ex6 Set 1 then Set 2
    expect(steps[6]).toEqual({ exerciseId: 'ex4', setIndex: 0 });
    expect(steps[7]).toEqual({ exerciseId: 'ex5', setIndex: 0 });
    expect(steps[8]).toEqual({ exerciseId: 'ex6', setIndex: 0 });
    expect(steps[9]).toEqual({ exerciseId: 'ex4', setIndex: 1 });
    expect(steps[10]).toEqual({ exerciseId: 'ex5', setIndex: 1 });
    expect(steps[11]).toEqual({ exerciseId: 'ex6', setIndex: 1 });
  });

  it('should generate steps for other resistance workouts in default order and setIndex 0', () => {
    const exercises = ['ex1', 'ex2', 'ex3'];
    const steps = generateWizardSteps('legs_and_back', exercises);

    expect(steps.length).toBe(3);
    expect(steps[0]).toEqual({ exerciseId: 'ex1', setIndex: 0 });
    expect(steps[1]).toEqual({ exerciseId: 'ex2', setIndex: 0 });
    expect(steps[2]).toEqual({ exerciseId: 'ex3', setIndex: 0 });
  });
});
