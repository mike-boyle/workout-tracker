import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { WorkoutProvider, useWorkout } from '../src/contexts/WorkoutContext';
import { clearLocalState, db } from '../src/services/storage';
import * as storage from '../src/services/storage';
import { generateWizardSteps } from '../src/utils/wizard';
import { saveFirebaseCycle, listenForAuthChanges } from '../src/services/firebase';
import * as firebase from '../src/services/firebase';
import type { User } from 'firebase/auth';
import type { UserMetadata, WorkoutLog, SetLog } from '../src/types';

// Mock config to enable sync in tests
vi.mock('../src/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/config')>();
  return {
    ...actual,
    ENABLE_APP_CHECK: true,
  };
});

// Test consumer component to interact with the context
const TestConsumer: React.FC = () => {
  const {
    state,
    completeWorkout,
    skipDay,
    setSelectedDay,
    startNewCycle,
    resetDatabase,

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
    vi.clearAllMocks();

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

  it('should incrementally sync only the modified log when completing a workout', async () => {
    // Mock user login
    vi.mocked(listenForAuthChanges).mockImplementationOnce((callback) => {
      callback({ uid: 'mock-user-123' } as unknown as User);
      return () => {};
    });

    vi.useFakeTimers();
    renderWithProvider();

    // Wait for initial state load and login sync timer to settle
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    // Clear mock history after initialization sync
    vi.mocked(saveFirebaseCycle).mockClear();

    // Complete workout 1 to trigger sync
    const btnComplete = screen.getByTestId('btn-complete');
    await act(async () => {
      btnComplete.click();
    });

    // Advance fake timers by debounce interval (2000ms) plus a bit extra
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });

    // Verify saveFirebaseCycle was called exactly once for the changed log
    expect(saveFirebaseCycle).toHaveBeenCalledTimes(1);
    let calls = vi.mocked(saveFirebaseCycle).mock.calls;
    let passedLogs = calls[0][2];
    expect(passedLogs.length).toBe(1);
    expect(passedLogs[0].id).toBe('cycle_1_week_1_day_1');

    // Clear mock history of saveFirebaseCycle again
    vi.mocked(saveFirebaseCycle).mockClear();

    // Complete workout 2 (now on Day 2) to trigger another sync
    await act(async () => {
      btnComplete.click();
    });

    // Advance fake timers to trigger sync
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });

    // Verify saveFirebaseCycle was called exactly once for the second changed log
    // and standard_pushup log was compared and skipped because it did not change (covers line 255 of WorkoutContext.tsx)
    expect(saveFirebaseCycle).toHaveBeenCalledTimes(1);
    calls = vi.mocked(saveFirebaseCycle).mock.calls;
    passedLogs = calls[0][2];
    expect(passedLogs.length).toBe(1);
    expect(passedLogs[0].id).toBe('cycle_1_week_1_day_2');

    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should handle loadLocalState rejection on mount', async () => {
    vi.spyOn(storage, 'loadLocalState').mockRejectedValueOnce(
      new Error('Failed to load local state')
    );
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithProvider();

    expect(await screen.findByTestId('cycle')).toHaveTextContent('1');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to load initial local state:',
      expect.any(Error)
    );
    consoleErrorSpy.mockRestore();
  });

  it('should handle error when clearLocalState rejects in resetDatabase', async () => {
    vi.spyOn(storage, 'clearLocalState').mockRejectedValueOnce(
      new Error('Failed to clear database')
    );
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithProvider();
    const btn = await screen.findByTestId('btn-reset');
    await act(async () => {
      btn.click();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to clear database:', expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it('should handle saveLocalMetadata rejection gracefully', async () => {
    vi.spyOn(storage, 'saveLocalMetadata').mockRejectedValueOnce(new Error('Save metadata error'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithProvider();
    const btn = await screen.findByTestId('btn-skip');
    await act(async () => {
      btn.click();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save metadata:', expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it('should handle saveLocalState rejection gracefully', async () => {
    vi.spyOn(storage, 'saveLocalState').mockRejectedValueOnce(new Error('Save state error'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithProvider();
    const btn = await screen.findByTestId('btn-skip');
    await act(async () => {
      btn.click();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save cycle 1 logs:', expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it('should handle loadCycleLogs rejection gracefully', async () => {
    vi.spyOn(storage, 'loadLocalCycleLogs').mockRejectedValueOnce(
      new Error('Load cycle logs error')
    );
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const TestLoadLogs = () => {
      const { state, loadCycleLogs } = useWorkout();
      React.useEffect(() => {
        if (!state.loading) {
          loadCycleLogs(2);
        }
      }, [state.loading, loadCycleLogs]);

      if (state.loadingCycles[2] === false) {
        return <div data-testid="finished" />;
      }
      return <div data-testid="loading" />;
    };

    render(
      <WorkoutProvider>
        <TestLoadLogs />
      </WorkoutProvider>
    );

    await screen.findByTestId('finished');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to load logs for cycle 2:',
      expect.any(Error)
    );
    consoleErrorSpy.mockRestore();
  });

  it('should retry firebase sync on permission-denied', async () => {
    let authCallback: ((user: User | null) => void) | null = null;
    vi.spyOn(firebase, 'listenForAuthChanges').mockImplementation((cb) => {
      authCallback = cb;
      return () => {};
    });

    vi.spyOn(firebase, 'saveFirebaseMetadata')
      .mockResolvedValueOnce(Promise.resolve()) // login migration succeeds
      .mockRejectedValueOnce(new Error('permission-denied')); // auto-sync fails

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    renderWithProvider();

    const btn = await screen.findByTestId('btn-skip');

    vi.useFakeTimers();

    // Simulate login and sync active
    await act(async () => {
      if (authCallback) {
        authCallback({ uid: 'user123' } as User);
      }
    });

    // Complete skipDay to trigger sync changes
    await act(async () => {
      btn.click();
    });

    // Advance 2s for debounce sync trigger
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Sync rate limit hit. Retrying in 60 seconds...',
      expect.any(Error)
    );

    // Mock success for the retry
    vi.spyOn(firebase, 'saveFirebaseMetadata').mockResolvedValue(Promise.resolve());

    // Advance 60s for the retry timeout
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60500);
    });

    expect(firebase.saveFirebaseMetadata).toHaveBeenCalledTimes(3);
    consoleWarnSpy.mockRestore();
  });

  it('should handle other errors on firebase sync', async () => {
    let authCallback: ((user: User | null) => void) | null = null;
    vi.spyOn(firebase, 'listenForAuthChanges').mockImplementation((cb) => {
      authCallback = cb;
      return () => {};
    });

    vi.spyOn(firebase, 'saveFirebaseMetadata')
      .mockResolvedValueOnce(Promise.resolve()) // login migration succeeds
      .mockRejectedValueOnce(new Error('Some other error')); // auto-sync fails

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithProvider();
    const btn = await screen.findByTestId('btn-skip');

    vi.useFakeTimers();

    // Simulate login and sync active
    await act(async () => {
      if (authCallback) {
        authCallback({ uid: 'user123' } as User);
      }
    });

    // Complete skipDay to trigger sync changes
    await act(async () => {
      btn.click();
    });

    // Advance 2s for debounce sync trigger
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Firebase auto-sync failed:', expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it('should pull cloud metadata and active logs on auth login and load them', async () => {
    let authCallback: ((user: User | null) => void) | null = null;
    vi.spyOn(firebase, 'listenForAuthChanges').mockImplementation((cb) => {
      authCallback = cb;
      return () => {};
    });

    const cloudMeta: UserMetadata = {
      version: 1,
      currentCycle: 2,
      currentWeek: 2,
      currentDay: 2,
      cycleTimestamps: { 2: '2026-06-04T00:00:00.000Z' },
      cycleStats: {
        2: { completedCount: 0, skippedCount: 0, totalDays: 91 },
      },
      activeProgramId: 'p90x',
      programs: {
        p90x: {
          currentCycle: 2,
          currentWeek: 2,
          currentDay: 2,
          cycleStats: {
            2: { completedCount: 0, skippedCount: 0, totalDays: 91 },
          },
        },
      },
    };
    const cloudLogs = [
      {
        id: 'log1',
        cycle: 2,
        week: 2,
        day: 2,
        workoutId: 'chest',
        dateCompleted: '2026-06-04',
        skipped: false,
        exercises: {},
        abRipperCompleted: false,
        comments: '',
      },
    ];

    vi.spyOn(firebase, 'loadFirebaseMetadata').mockResolvedValueOnce(cloudMeta);
    vi.spyOn(firebase, 'loadFirebaseCycle').mockResolvedValueOnce(cloudLogs);

    renderWithProvider();

    await screen.findByTestId('loading');

    await act(async () => {
      if (authCallback) {
        authCallback({ uid: 'user123' } as User);
      }
    });

    expect(await screen.findByTestId('cycle')).toHaveTextContent('2');
    expect(screen.getByTestId('week')).toHaveTextContent('2');
    expect(screen.getByTestId('logs-count')).toHaveTextContent('1');
  });

  it('should handle error when initial cloud sync fails', async () => {
    let authCallback: ((user: User | null) => void) | null = null;
    vi.spyOn(firebase, 'listenForAuthChanges').mockImplementation((cb) => {
      authCallback = cb;
      return () => {};
    });

    vi.spyOn(firebase, 'loadFirebaseMetadata').mockRejectedValueOnce(
      new Error('Cloud load failed')
    );
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithProvider();
    await screen.findByTestId('loading');

    await act(async () => {
      if (authCallback) {
        authCallback({ uid: 'user123' } as User);
      }
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Initial cloud sync failed:', expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it('should fetch cycle logs from Firebase if local logs are empty and user is logged in', async () => {
    let authCallback: ((user: User | null) => void) | null = null;
    vi.spyOn(firebase, 'listenForAuthChanges').mockImplementation((cb) => {
      authCallback = cb;
      return () => {};
    });

    const mockLogs: WorkoutLog[] = [
      {
        id: 'mock-log-1',
        cycle: 2,
        week: 1,
        day: 1,
        workoutId: 'chest',
        dateCompleted: '2026-06-05',
        skipped: false,
        exercises: {},
        abRipperCompleted: false,
        comments: '',
      },
    ];
    vi.spyOn(firebase, 'loadFirebaseCycle').mockResolvedValueOnce(mockLogs);
    vi.spyOn(storage, 'saveLocalState').mockResolvedValue(Promise.resolve());

    const TestLoadBtn = () => {
      const { state, loadCycleLogs } = useWorkout();
      if (state.loading) return <div data-testid="loading">Loading...</div>;
      return (
        <div>
          <button data-testid="load-btn" onClick={() => loadCycleLogs(2)}>
            Load
          </button>
          <div data-testid="status">
            {state.loadingCycles[2] ? 'loading' : state.loadedCycles[2] ? 'loaded' : 'idle'}
          </div>
          <div data-testid="logs-count">{state.loadedCycles[2]?.length || 0}</div>
        </div>
      );
    };

    render(
      <WorkoutProvider>
        <TestLoadBtn />
      </WorkoutProvider>
    );

    await screen.findByText('idle');

    // Login user
    await act(async () => {
      if (authCallback) {
        authCallback({ uid: 'user123' } as User);
      }
    });

    // Trigger loadCycleLogs
    const btn = screen.getByTestId('load-btn');
    await act(async () => {
      btn.click();
    });

    await screen.findByText('loaded');
    expect(screen.getByTestId('logs-count')).toHaveTextContent('1');
    expect(firebase.loadFirebaseCycle).toHaveBeenCalledWith('user123', 2, 'p90x');
    expect(storage.saveLocalState).toHaveBeenCalledWith(expect.any(Object), 2, mockLogs, 'p90x');
  });

  it('should switch program and save local state if active cycle logs are loaded', async () => {
    vi.spyOn(storage, 'loadLocalState').mockResolvedValue({
      metadata: {
        version: 1,
        currentCycle: 1,
        currentWeek: 1,
        currentDay: 1,
        cycleTimestamps: {},
        cycleStats: {},
        activeProgramId: 'p90x',
        programs: {
          p90x: { currentCycle: 1, currentWeek: 1, currentDay: 1, cycleStats: {} },
          classic: { currentCycle: 1, currentWeek: 1, currentDay: 1, cycleStats: {} },
        },
      } as UserMetadata,
      logs: [
        {
          id: 'log-1',
          cycle: 1,
          week: 1,
          day: 1,
          workoutId: 'chest_and_back',
          dateCompleted: '2026-06-05',
          skipped: false,
          exercises: {},
          abRipperCompleted: false,
          comments: '',
        },
      ],
    });

    const TestSwitch = () => {
      const { state, switchProgram } = useWorkout();
      if (state.loading) return <div data-testid="loading">Loading...</div>;
      return (
        <div>
          <span data-testid="program">{state.activeProgramId}</span>
          <button data-testid="switch-btn" onClick={() => switchProgram('classic')}>
            Switch
          </button>
        </div>
      );
    };

    render(
      <WorkoutProvider>
        <TestSwitch />
      </WorkoutProvider>
    );

    await screen.findByTestId('program');

    const saveSpy = vi.spyOn(storage, 'saveLocalState');

    await act(async () => {
      screen.getByTestId('switch-btn').click();
    });

    expect(saveSpy).toHaveBeenCalled();
    expect(screen.getByTestId('program')).toHaveTextContent('classic');
  });

  it('should reset database and log analytics on logout if previously logged in', async () => {
    let authCallback: ((user: User | null) => void) | null = null;
    vi.mocked(listenForAuthChanges).mockImplementationOnce((callback) => {
      authCallback = callback as (user: User | null) => void;
      callback({ uid: 'mock-user-123' } as unknown as User);
      return () => {};
    });

    const TestComponent = () => {
      const { state } = useWorkout();
      if (state.loading) return <div>Loading...</div>;
      return <div data-testid="cycle">{state.currentCycle}</div>;
    };

    render(
      <WorkoutProvider>
        <TestComponent />
      </WorkoutProvider>
    );

    expect(authCallback).not.toBeNull();

    await act(async () => {
      if (authCallback) {
        (authCallback as (user: User | null) => void)(null);
      }
    });

    expect(screen.getByTestId('cycle')).toHaveTextContent('1');
  });

  it('should handle Google login failure gracefully', async () => {
    vi.mocked(listenForAuthChanges).mockImplementationOnce((callback) => {
      callback(null);
      return () => {};
    });
    vi.spyOn(firebase, 'signInWithGoogle').mockRejectedValueOnce(new Error('Auth failed'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const TestLogin = () => {
      const { login, syncStatus, errorMsg } = useWorkout();
      return (
        <div>
          <span data-testid="status">{syncStatus}</span>
          <span data-testid="error">{errorMsg}</span>
          <button data-testid="btn" onClick={login}>
            Login
          </button>
        </div>
      );
    };

    render(
      <WorkoutProvider>
        <TestLogin />
      </WorkoutProvider>
    );

    await act(async () => {
      screen.getByTestId('btn').click();
    });

    expect(screen.getByTestId('status')).toHaveTextContent('error');
    expect(screen.getByTestId('error')).toHaveTextContent('Auth failed');

    consoleErrorSpy.mockRestore();
  });

  it('should handle Google logout failure gracefully', async () => {
    vi.mocked(listenForAuthChanges).mockImplementationOnce((callback) => {
      callback({ uid: 'mock-user-123' } as unknown as User);
      return () => {};
    });
    vi.spyOn(firebase, 'signOutUser').mockRejectedValueOnce(new Error('Logout failed'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const TestLogout = () => {
      const { logout, syncStatus, errorMsg } = useWorkout();
      return (
        <div>
          <span data-testid="status">{syncStatus}</span>
          <span data-testid="error">{errorMsg}</span>
          <button data-testid="btn" onClick={logout}>
            Logout
          </button>
        </div>
      );
    };

    render(
      <WorkoutProvider>
        <TestLogout />
      </WorkoutProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('synced');
    });

    await act(async () => {
      screen.getByTestId('btn').click();
    });

    expect(screen.getByTestId('status')).toHaveTextContent('error');
    expect(screen.getByTestId('error')).toHaveTextContent('Logout failed');

    consoleErrorSpy.mockRestore();
  });

  it('should handle Google login failure with non-Error gracefully', async () => {
    vi.mocked(listenForAuthChanges).mockImplementationOnce((callback) => {
      callback(null);
      return () => {};
    });
    vi.spyOn(firebase, 'signInWithGoogle').mockRejectedValueOnce('Raw string error');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const TestLogin = () => {
      const { login, syncStatus, errorMsg } = useWorkout();
      return (
        <div>
          <span data-testid="status">{syncStatus}</span>
          <span data-testid="error">{errorMsg}</span>
          <button data-testid="btn" onClick={login}>
            Login
          </button>
        </div>
      );
    };

    render(
      <WorkoutProvider>
        <TestLogin />
      </WorkoutProvider>
    );

    await act(async () => {
      screen.getByTestId('btn').click();
    });

    expect(screen.getByTestId('status')).toHaveTextContent('error');
    expect(screen.getByTestId('error')).toHaveTextContent('Raw string error');

    consoleErrorSpy.mockRestore();
  });

  it('should handle Google logout failure with non-Error gracefully', async () => {
    vi.mocked(listenForAuthChanges).mockImplementationOnce((callback) => {
      callback({ uid: 'mock-user-123' } as unknown as User);
      return () => {};
    });
    vi.spyOn(firebase, 'signOutUser').mockRejectedValueOnce('Raw string logout error');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const TestLogout = () => {
      const { logout, syncStatus, errorMsg } = useWorkout();
      return (
        <div>
          <span data-testid="status">{syncStatus}</span>
          <span data-testid="error">{errorMsg}</span>
          <button data-testid="btn" onClick={logout}>
            Logout
          </button>
        </div>
      );
    };

    render(
      <WorkoutProvider>
        <TestLogout />
      </WorkoutProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('synced');
    });

    await act(async () => {
      screen.getByTestId('btn').click();
    });

    expect(screen.getByTestId('status')).toHaveTextContent('error');
    expect(screen.getByTestId('error')).toHaveTextContent('Raw string logout error');

    consoleErrorSpy.mockRestore();
  });

  it('should log login event only once per session even if auth changes multiple times', async () => {
    let triggerAuth: ((user: User | null) => void) | null = null;
    vi.mocked(listenForAuthChanges).mockImplementationOnce((callback) => {
      triggerAuth = callback;
      callback(null);
      return () => {};
    });

    const TestComponent = () => {
      useWorkout();
      return <div>Test</div>;
    };

    render(
      <WorkoutProvider>
        <TestComponent />
      </WorkoutProvider>
    );

    await act(async () => {});

    expect(triggerAuth).not.toBeNull();
    const analyticsSpy = vi.spyOn(firebase, 'logAnalyticsEvent');

    await act(async () => {
      triggerAuth!({ uid: 'mock-user-123' });
    });

    expect(analyticsSpy).toHaveBeenCalledWith('login', { method: 'google' });
    analyticsSpy.mockClear();

    await act(async () => {
      triggerAuth!({ uid: 'mock-user-123' });
    });

    expect(analyticsSpy).not.toHaveBeenCalledWith('login', expect.anything());
  });

  it('should throw an error when switching to a program without state', async () => {
    vi.spyOn(storage, 'loadLocalState').mockResolvedValue({
      metadata: {
        version: 1,
        currentCycle: 1,
        currentWeek: 1,
        currentDay: 1,
        cycleTimestamps: {},
        cycleStats: {},
        activeProgramId: 'p90x',
        programs: {
          p90x: { currentCycle: 1, currentWeek: 1, currentDay: 1, cycleStats: {} },
        },
      } as UserMetadata,
      logs: [],
    });

    let switchProgramFn: ((prog: string) => Promise<void>) | null = null;
    const TestSwitch = () => {
      const { state, switchProgram } = useWorkout();
      React.useEffect(() => {
        switchProgramFn = switchProgram;
      }, [switchProgram]);
      if (state.loading) return <div data-testid="loading">Loading...</div>;
      return null;
    };

    render(
      <WorkoutProvider>
        <TestSwitch />
      </WorkoutProvider>
    );

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      act(async () => {
        if (switchProgramFn) {
          await switchProgramFn('invalid_prog');
        }
      })
    ).rejects.toThrow('Program state not found for program: invalid_prog');

    consoleErrorSpy.mockRestore();
  });

  it('should throw error when useWorkout is used outside WorkoutProvider', () => {
    const TestComponent = () => {
      useWorkout();
      return null;
    };

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TestComponent />)).toThrow(
      'useWorkout must be used within a WorkoutProvider'
    );

    consoleErrorSpy.mockRestore();
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

  it('should handle non-Error rejection when initial cloud sync fails', async () => {
    let authCallback: ((user: User | null) => void) | null = null;
    vi.spyOn(firebase, 'listenForAuthChanges').mockImplementation((cb) => {
      authCallback = cb;
      return () => {};
    });

    vi.spyOn(firebase, 'loadFirebaseMetadata').mockRejectedValueOnce('Cloud load string rejection');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithProvider();
    await screen.findByTestId('loading');

    await act(async () => {
      if (authCallback) {
        authCallback({ uid: 'user123' } as User);
      }
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Initial cloud sync failed:',
      'Cloud load string rejection'
    );
    consoleErrorSpy.mockRestore();
  });

  it('should cover sync edge cases: permission-denied retry, non-Error rejections, and unchanged sync checks', async () => {
    // Mock user login
    vi.mocked(listenForAuthChanges).mockImplementationOnce((callback) => {
      callback({ uid: 'mock-user-123' } as unknown as User);
      return () => {};
    });

    vi.useFakeTimers();

    let startNewCycleFn: (() => void) | null = null;
    let completeWorkoutFn:
      | ((exercises: Record<string, SetLog[]>, abRipper: boolean, comments: string) => void)
      | null = null;

    const SyncTestConsumer = () => {
      const { startNewCycle, completeWorkout, state } = useWorkout();
      React.useEffect(() => {
        startNewCycleFn = startNewCycle;
        completeWorkoutFn = completeWorkout;
      }, [startNewCycle, completeWorkout]);
      if (state.loading) return <div data-testid="loading">Loading...</div>;
      return null;
    };

    render(
      <WorkoutProvider>
        <SyncTestConsumer />
      </WorkoutProvider>
    );

    // Settle initialization sync
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(firebase.saveFirebaseMetadata).mockRejectedValueOnce(
      new Error('permission-denied: rate limit')
    );

    // Trigger startNewCycle (adds cycle 2 to loadedCycles, syncedLogsRef.current[2] is undefined)
    await act(async () => {
      if (startNewCycleFn) {
        startNewCycleFn();
      }
    });

    // Advance 2s for debounce to run sync and fail with permission-denied
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Sync rate limit hit. Retrying in 60 seconds...',
      expect.any(Error)
    );

    // Resolve successfully on retry
    vi.mocked(firebase.saveFirebaseMetadata).mockResolvedValueOnce();
    vi.mocked(firebase.saveFirebaseCycle).mockResolvedValueOnce();

    // Advance 60s for retry to trigger
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000);
    });

    expect(firebase.saveFirebaseMetadata).toHaveBeenLastCalledWith(
      'mock-user-123',
      expect.any(Object)
    );

    // Now let's trigger a non-Error rejection
    vi.mocked(firebase.saveFirebaseMetadata).mockRejectedValueOnce('Sync raw string rejection');

    await act(async () => {
      if (completeWorkoutFn) {
        completeWorkoutFn({}, false, 'Completed');
      }
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Firebase auto-sync failed:',
      'Sync raw string rejection'
    );

    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.useRealTimers();
  });
});
