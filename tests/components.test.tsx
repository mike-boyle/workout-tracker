import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { RestTimer } from '../src/components/RestTimer';
import { WorkoutSession } from '../src/components/WorkoutSession';
import { RestDayView } from '../src/components/session/RestDayView';
import { CommentsModal } from '../src/components/session/CommentsModal';
import { WorkoutProvider } from '../src/contexts/WorkoutProvider';
import { useWorkout } from '../src/contexts/WorkoutContext';
import { db, clearLocalState } from '../src/services/storage';
import { workouts } from '../src/data/schedule';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

// Mock Web Audio API for RestTimer buzzer
const mockOscillator = {
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  type: 'sine',
  frequency: { setValueAtTime: vi.fn() },
};

const mockGain = {
  connect: vi.fn(),
  gain: { setValueAtTime: vi.fn() },
};

class MockAudioContext {
  currentTime = 0;
  destination = {};
  createOscillator() {
    return mockOscillator;
  }
  createGain() {
    return mockGain;
  }
}

vi.stubGlobal('AudioContext', MockAudioContext);

describe('RestTimer Component', () => {
  it('should render initial rest timer as 0:00', () => {
    render(<RestTimer />);
    expect(screen.getByText('⏱️ Rest Timer')).toBeInTheDocument();
    expect(screen.getByText('0:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
  });

  it('should add 30 seconds and start the timer when clicking +30s', () => {
    vi.useFakeTimers();
    render(<RestTimer />);

    const btnAdd30 = screen.getByRole('button', { name: '+30s' });
    act(() => {
      btnAdd30.click();
    });

    expect(screen.getByText('0:30')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();

    // Advance 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText('0:25')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('should add 60 seconds when clicking +60s', () => {
    render(<RestTimer />);
    const btnAdd60 = screen.getByRole('button', { name: '+60s' });
    act(() => {
      btnAdd60.click();
    });
    expect(screen.getByText('1:00')).toBeInTheDocument();
  });

  it('should reset timer when clicking Reset button', () => {
    render(<RestTimer />);

    const btnAdd60 = screen.getByRole('button', { name: '+60s' });
    act(() => {
      btnAdd60.click();
    });

    expect(screen.getByText('1:00')).toBeInTheDocument();

    const btnReset = screen.getByRole('button', { name: 'Reset' });
    act(() => {
      btnReset.click();
    });

    expect(screen.getByText('0:00')).toBeInTheDocument();
  });

  it('should count down to 0, trigger buzzer, and handle second tone', () => {
    vi.useFakeTimers();
    render(<RestTimer />);

    // Add 30s
    act(() => {
      screen.getByRole('button', { name: '+30s' }).click();
    });

    // Advance 30 seconds to reach 0
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(screen.getByText('0:00')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();

    // Advance an extra 200ms to trigger the second buzzer tone
    act(() => {
      vi.advanceTimersByTime(200);
    });

    vi.useRealTimers();
  });

  it('should toggle play/pause of active timer', () => {
    render(<RestTimer />);

    // Add 30s
    act(() => {
      screen.getByRole('button', { name: '+30s' }).click();
    });

    const toggleBtn = screen.getByRole('button', { name: 'Pause' });

    // Click pause
    act(() => {
      toggleBtn.click();
    });
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();

    // Click start
    act(() => {
      screen.getByRole('button', { name: 'Start' }).click();
    });
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  it('should handle Web Audio API errors gracefully when starting buzzer', () => {
    // Stub AudioContext to throw an error
    vi.stubGlobal(
      'AudioContext',
      class {
        currentTime = 0;
        destination = {};
        createOscillator() {
          throw new Error('Web Audio not supported');
        }
      }
    );

    vi.useFakeTimers();
    render(<RestTimer />);

    // Add 30s and advance to 0
    act(() => {
      screen.getByRole('button', { name: '+30s' }).click();
    });

    // Advance 30 seconds to reach 0
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    // It should not crash, because errors are caught
    expect(screen.getByText('0:00')).toBeInTheDocument();

    vi.useRealTimers();
    // Restore default AudioContext mock
    vi.stubGlobal('AudioContext', MockAudioContext);
  });

  it('should handle missing AudioContext gracefully', () => {
    vi.stubGlobal('AudioContext', undefined);
    const originalWebkit = window.webkitAudioContext;
    window.webkitAudioContext = undefined;

    vi.useFakeTimers();
    render(<RestTimer />);
    act(() => {
      screen.getByRole('button', { name: '+30s' }).click();
    });
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    vi.stubGlobal('AudioContext', MockAudioContext);
    window.webkitAudioContext = originalWebkit;
    vi.useRealTimers();
  });

  it('should fallback to webkitAudioContext if AudioContext is undefined', () => {
    vi.stubGlobal('AudioContext', undefined);
    window.webkitAudioContext = MockAudioContext as unknown as typeof AudioContext;

    vi.useFakeTimers();
    render(<RestTimer />);
    act(() => {
      screen.getByRole('button', { name: '+30s' }).click();
    });
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    vi.stubGlobal('AudioContext', MockAudioContext);
    window.webkitAudioContext = undefined;
    vi.useRealTimers();
  });

  it('should reset timer when paused and ref is cleared', () => {
    render(<RestTimer />);
    act(() => {
      screen.getByRole('button', { name: '+30s' }).click();
    });
    act(() => {
      screen.getByRole('button', { name: 'Pause' }).click();
    });
    act(() => {
      screen.getByRole('button', { name: 'Reset' }).click();
    });
    expect(screen.getByText('0:00')).toBeInTheDocument();
  });
});

describe('WorkoutSession Component View Mode Defaults', () => {
  let store: Record<string, unknown> = {};

  beforeEach(async () => {
    store = {};
    localStorage.clear();
    vi.restoreAllMocks();

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
    window.location.hash = '';
  });

  // Helper component to navigate to other days in tests
  const NavigationTrigger: React.FC = () => {
    const { setSelectedDay } = useWorkout();
    return (
      <button data-testid="nav-btn" onClick={() => setSelectedDay(1, 5)}>
        Go to Week 1 Day 5
      </button>
    );
  };

  it('should default to wizard view for the active day, and sheet view for inactive/future days', async () => {
    render(
      <WorkoutProvider>
        <WorkoutSession />
        <NavigationTrigger />
      </WorkoutProvider>
    );

    // Week 1 Day 1 (Chest & Back) is the default active day.
    // It should default to wizard mode, displaying the "Switch to Full Sheet View" button.
    expect(await screen.findByRole('heading', { name: 'Chest & Back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch to Full Sheet View' })).toBeInTheDocument();

    // Now click the navigation button to go to Week 1 Day 5 (Legs & Back), which is inactive/future.
    const navBtn = screen.getByTestId('nav-btn');
    await act(async () => {
      navBtn.click();
    });

    // We should now be on Legs & Back, which is an inactive day, so it defaults to sheet mode
    // (displaying the "Switch to Wizard View" button).
    expect(await screen.findByRole('heading', { name: 'Legs & Back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch to Wizard View' })).toBeInTheDocument();
  });

  const TestWrapper: React.FC<{
    children?: React.ReactNode;
    week?: number;
    day?: number;
    cycle?: number;
  }> = ({ children, week, day, cycle }) => {
    const { state, setSelectedDay } = useWorkout();
    React.useEffect(() => {
      if (!state.ui.loading && week !== undefined && day !== undefined) {
        setSelectedDay(week, day, cycle);
      }
    }, [state.ui.loading, week, day, cycle, setSelectedDay]);

    if (state.ui.loading) {
      return <div>Loading...</div>;
    }
    return <>{children}</>;
  };

  it('should handle back and cancel button clicks', async () => {
    render(
      <WorkoutProvider>
        <WorkoutSession />
      </WorkoutProvider>
    );

    // Find back button
    const backBtn = await screen.findByRole('button', { name: '← Back' });
    await act(async () => {
      backBtn.click();
    });
    expect(window.location.hash).toBe('#/dashboard');

    // Reset hash
    window.location.hash = '';

    // Find cancel button
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    await act(async () => {
      cancelBtn.click();
    });
    expect(window.location.hash).toBe('#/dashboard');
  });

  it('should skip the current day when confirmed', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <WorkoutProvider>
        <WorkoutSession />
      </WorkoutProvider>
    );

    const skipBtn = await screen.findByRole('button', { name: 'Skip Day' });
    await act(async () => {
      skipBtn.click();
    });

    expect(confirmSpy).toHaveBeenCalled();
    expect(window.location.hash).toBe('#/dashboard');
  });

  it('should handle Skip to this Day for a future day when confirmed', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <WorkoutProvider>
        <TestWrapper week={1} day={4}>
          <WorkoutSession />
        </TestWrapper>
      </WorkoutProvider>
    );

    const skipToBtn = await screen.findByRole('button', { name: 'Skip to this Day' });
    await act(async () => {
      skipToBtn.click();
    });

    expect(confirmSpy).toHaveBeenCalled();
    expect(window.location.hash).toBe('#/dashboard');
  });

  it('should not skip the current day when confirm is cancelled', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <WorkoutProvider>
        <WorkoutSession />
      </WorkoutProvider>
    );

    const skipBtn = await screen.findByRole('button', { name: 'Skip Day' });
    await act(async () => {
      skipBtn.click();
    });

    expect(confirmSpy).toHaveBeenCalled();
    expect(window.location.hash).not.toBe('#/dashboard');
  });

  it('should not handle Skip to this Day for a future day when confirm is cancelled', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <WorkoutProvider>
        <TestWrapper week={1} day={4}>
          <WorkoutSession />
        </TestWrapper>
      </WorkoutProvider>
    );

    const skipToBtn = await screen.findByRole('button', { name: 'Skip to this Day' });
    await act(async () => {
      skipToBtn.click();
    });

    expect(confirmSpy).toHaveBeenCalled();
    expect(window.location.hash).not.toBe('#/dashboard');
  });

  it('should render RestDayView when selected day is a rest day', async () => {
    render(
      <WorkoutProvider>
        <TestWrapper week={1} day={7}>
          <WorkoutSession />
        </TestWrapper>
      </WorkoutProvider>
    );

    const restDayHeading = await screen.findByRole('heading', { name: /Rest Day/i });
    expect(restDayHeading).toBeInTheDocument();

    const completeRestBtn = screen.getByRole('button', { name: /Mark completed/i });
    await act(async () => {
      completeRestBtn.click();
    });
    expect(window.location.hash).toBe('#/dashboard');
  });

  it('should toggle view mode for resistance workout', async () => {
    render(
      <WorkoutProvider>
        <WorkoutSession />
      </WorkoutProvider>
    );

    const toggleBtn = await screen.findByRole('button', { name: 'Switch to Full Sheet View' });

    // Switch to sheet
    await act(async () => {
      toggleBtn.click();
    });
    expect(screen.getByRole('button', { name: 'Switch to Wizard View' })).toBeInTheDocument();

    // Switch back to wizard
    await act(async () => {
      screen.getByRole('button', { name: 'Switch to Wizard View' }).click();
    });
    expect(screen.getByRole('button', { name: 'Switch to Full Sheet View' })).toBeInTheDocument();
  });

  it('should handle non-resistance workout completion and ab ripper checking', async () => {
    render(
      <WorkoutProvider>
        <TestWrapper week={1} day={2}>
          {' '}
          {/* Plyometrics, has abRipper: false by default */}
          <WorkoutSession />
        </TestWrapper>
      </WorkoutProvider>
    );

    // Verify it is cardio/non-resistance routine and has "Ready to push play?"
    expect(await screen.findByText('Ready to push play?')).toBeInTheDocument();

    // Since Plyometrics has abRipper: false, ab-ripper checkbox is not visible for non-resistance
    expect(screen.queryByLabelText('Completed Ab Ripper X (+15 mins)')).not.toBeInTheDocument();

    const completeBtn = screen.getByRole('button', { name: 'Mark Workout Completed' });
    await act(async () => {
      completeBtn.click();
    });
    expect(window.location.hash).toBe('#/dashboard');
  });

  it('should handle modal comments adding, editing, and canceling', async () => {
    render(
      <WorkoutProvider>
        <WorkoutSession />
      </WorkoutProvider>
    );

    // Add comment
    const addCommentBtn = await screen.findByRole('button', { name: 'Add/Edit Comments' });
    await act(async () => {
      addCommentBtn.click();
    });

    // Modal is open, find textarea
    const textarea = screen.getByPlaceholderText(/standard pushups felt easier today/);
    expect(textarea).toBeInTheDocument();

    // Cancel modal
    const closeBtn = screen.getByRole('button', { name: 'Close' });
    await act(async () => {
      closeBtn.click();
    });

    // Verify preview does not show comment
    expect(screen.queryByText(/Preview:/)).not.toBeInTheDocument();

    // Open comment modal again
    await act(async () => {
      screen.getByRole('button', { name: 'Add/Edit Comments' }).click();
    });

    // Enter comment again and save
    await act(async () => {
      const textareaEl = screen.getByPlaceholderText(
        /standard pushups felt easier today/
      ) as HTMLTextAreaElement;
      fireEvent.change(textareaEl, { target: { value: 'Legs felt sore' } });
    });

    const saveCommentBtn = screen.getByRole('button', { name: 'Save Comment' });
    await act(async () => {
      saveCommentBtn.click();
    });

    // Verify preview shows the comment
    expect(await screen.findByText(/Legs felt sore/)).toBeInTheDocument();
    expect(screen.getByText('✓ Comment added')).toBeInTheDocument();

    // Save workout data
    const saveWorkoutBtn = screen.getByRole('button', { name: 'Save Workout Data' });
    await act(async () => {
      saveWorkoutBtn.click();
    });

    expect(window.location.hash).toBe('#/dashboard');
  });

  it('should support logging a resistance workout in both wizard and sheet modes, verify previous log display, and toggle ab ripper', async () => {
    const previousLogs = [
      {
        id: 'cycle_1_week_1_day_1_older',
        cycle: 1,
        week: 1,
        day: 1,
        workoutId: 'chest_and_back',
        dateCompleted: '2026-06-01T12:00:00.000Z',
        skipped: false,
        exercises: {
          cb_standard_pushup: [
            { reps: 8, weight: 0, assisted: false },
            { reps: 8, weight: 0, assisted: false },
          ],
        },
        abRipperCompleted: true,
        comments: 'older log',
      },
      {
        id: 'cycle_1_week_1_day_1_newer',
        cycle: 1,
        week: 1,
        day: 1,
        workoutId: 'chest_and_back',
        dateCompleted: '2026-06-02T12:00:00.000Z',
        skipped: false,
        exercises: {
          cb_standard_pushup: [
            { reps: 10, weight: 0, assisted: false },
            { reps: 10, weight: 0, assisted: false },
          ],
        },
        abRipperCompleted: true,
        comments: 'newer log',
      },
    ];
    store['metadata'] = {
      version: 1,
      currentCycle: 1,
      currentWeek: 2,
      currentDay: 1,
      activeProgramId: 'p90x',
      programs: {
        p90x: {
          currentCycle: 1,
          currentWeek: 2,
          currentDay: 1,
          cycleStats: {},
        },
      },
    };
    store['p90x_cycle_1_logs'] = previousLogs;

    render(
      <WorkoutProvider>
        <TestWrapper>
          <WorkoutSession />
        </TestWrapper>
      </WorkoutProvider>
    );

    expect(await screen.findByRole('heading', { name: 'Standard Push-ups' })).toBeInTheDocument();
    expect(screen.getByText('Last: 10 reps')).toBeInTheDocument();

    const repsInput = screen.getByPlaceholderText('0');
    await act(async () => {
      fireEvent.change(repsInput, { target: { value: '12' } });
    });
    screen.debug();
    expect((screen.getByPlaceholderText('0') as HTMLInputElement).value).toBe('12');

    const assistedCheckbox = screen.getByRole('checkbox', { name: 'Assisted' });
    await act(async () => {
      fireEvent.click(assistedCheckbox);
    });
    expect(screen.getByRole('checkbox', { name: 'Assisted' })).toBeChecked();

    const nextBtn = screen.getByRole('button', { name: 'Next →' });
    await act(async () => {
      nextBtn.click();
    });

    const prevBtn = screen.getByRole('button', { name: '← Previous' });
    await act(async () => {
      prevBtn.click();
    });

    const switchBtn = screen.getByRole('button', { name: 'Switch to Full Sheet View' });
    await act(async () => {
      switchBtn.click();
    });

    const compactRepsInputs = screen.getAllByPlaceholderText('0');
    await act(async () => {
      fireEvent.change(compactRepsInputs[0], { target: { value: '15' } });
    });
    expect((screen.getAllByPlaceholderText('0')[0] as HTMLInputElement).value).toBe('15');

    const abRipperCheckbox = screen.getByRole('checkbox', {
      name: 'Completed Ab Ripper X (+15 mins)',
    });
    await act(async () => {
      fireEvent.click(abRipperCheckbox);
    });
    await act(async () => {
      fireEvent.click(abRipperCheckbox);
    });

    const saveBtn = screen.getByRole('button', { name: 'Save Workout Data' });
    await act(async () => {
      saveBtn.click();
    });

    expect(window.location.hash).toBe('#/dashboard');
  });

  it('should load existing workout logs into form state when editing a completed day', async () => {
    const completedLogs = [
      {
        id: 'cycle_1_week_1_day_1_completed',
        cycle: 1,
        week: 1,
        day: 1,
        workoutId: 'chest_and_back',
        dateCompleted: '2026-06-02T12:00:00.000Z',
        skipped: false,
        exercises: {
          cb_standard_pushup: [
            { reps: 10, weight: 0, assisted: false },
            { reps: 12, weight: 0, assisted: false },
          ],
        },
        abRipperCompleted: true,
        comments: 'felt great',
      },
    ];

    store['metadata'] = {
      version: 1,
      currentCycle: 1,
      currentWeek: 1,
      currentDay: 2,
      activeProgramId: 'p90x',
      programs: {
        p90x: {
          currentCycle: 1,
          currentWeek: 1,
          currentDay: 2,
          cycleStats: {},
        },
      },
    };
    store['p90x_cycle_1_logs'] = completedLogs;

    render(
      <WorkoutProvider>
        <TestWrapper week={1} day={1}>
          <WorkoutSession />
        </TestWrapper>
      </WorkoutProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Standard Push-ups/ })).toBeInTheDocument();
      expect((screen.getAllByPlaceholderText('0')[0] as HTMLInputElement).value).toBe('10');
    });
  });

  it('should handle non-resistance workout with ab ripper checkbox', async () => {
    const plyo = workouts.find((w) => w.id === 'plyometrics');
    if (plyo) plyo.abRipper = true;

    render(
      <WorkoutProvider>
        <TestWrapper week={1} day={2}>
          <WorkoutSession />
        </TestWrapper>
      </WorkoutProvider>
    );

    expect(await screen.findByText('Ready to push play?')).toBeInTheDocument();
    const abRipperCheckbox = screen.getByRole('checkbox', {
      name: 'Completed Ab Ripper X (+15 mins)',
    });
    expect(abRipperCheckbox).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(abRipperCheckbox);
    });

    const completeBtn = screen.getByRole('button', { name: 'Mark Workout Completed' });
    await act(async () => {
      completeBtn.click();
    });

    expect(window.location.hash).toBe('#/dashboard');

    if (plyo) plyo.abRipper = false;
  });

  it('should render rest day view inside WorkoutSession and handle complete/back buttons', async () => {
    render(
      <WorkoutProvider>
        <TestWrapper week={1} day={7}>
          <WorkoutSession />
        </TestWrapper>
      </WorkoutProvider>
    );

    expect(await screen.findByRole('heading', { name: 'Rest Day' })).toBeInTheDocument();

    // Click mark completed
    const completeBtn = screen.getByRole('button', { name: 'Mark Completed' });
    window.location.hash = '';
    await act(async () => {
      completeBtn.click();
    });
    expect(window.location.hash).toBe('#/dashboard');

    // Click back button
    const backBtn = screen.getByRole('button', { name: 'Back to Dashboard' });
    window.location.hash = '';
    await act(async () => {
      backBtn.click();
    });
    expect(window.location.hash).toBe('#/dashboard');
  });
});

describe('RestDayView Component', () => {
  it('should render RestDayView and trigger callbacks', () => {
    const onComplete = vi.fn();
    const onBack = vi.fn();

    render(
      <RestDayView selectedWeek={2} selectedDay={4} onComplete={onComplete} onBack={onBack} />
    );

    expect(screen.getByRole('heading', { name: 'Rest Day' })).toBeInTheDocument();
    expect(screen.getByText(/No formal workout scheduled for Week 2 Day 4/)).toBeInTheDocument();

    act(() => {
      screen.getByRole('button', { name: 'Mark Completed' }).click();
    });
    expect(onComplete).toHaveBeenCalledTimes(1);

    act(() => {
      screen.getByRole('button', { name: 'Back to Dashboard' }).click();
    });
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('CommentsModal Component', () => {
  it('should render nothing if not open', () => {
    const { container } = render(
      <CommentsModal isOpen={false} comments="" onSave={() => {}} onClose={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });
});
