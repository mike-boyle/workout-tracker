import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { RestTimer } from '../src/components/RestTimer';
import { WorkoutSession } from '../src/components/WorkoutSession';
import { WorkoutProvider, useWorkout } from '../src/contexts/WorkoutContext';
import { db, clearLocalState } from '../src/services/storage';

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
  });

  it('should add 30 seconds and start the timer when clicking +30s', () => {
    vi.useFakeTimers();
    render(<RestTimer />);

    const btnAdd30 = screen.getByText('+30s');
    act(() => {
      btnAdd30.click();
    });

    expect(screen.getByText('0:30')).toBeInTheDocument();
    expect(screen.getByText('Pause')).toBeInTheDocument();

    // Advance 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText('0:25')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('should add 60 seconds when clicking +60s', () => {
    render(<RestTimer />);
    const btnAdd60 = screen.getByText('+60s');
    act(() => {
      btnAdd60.click();
    });
    expect(screen.getByText('1:00')).toBeInTheDocument();
  });

  it('should reset timer when clicking Reset button', () => {
    render(<RestTimer />);

    const btnAdd60 = screen.getByText('+60s');
    act(() => {
      btnAdd60.click();
    });

    expect(screen.getByText('1:00')).toBeInTheDocument();

    const btnReset = screen.getByText('Reset');
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
      screen.getByText('+30s').click();
    });

    // Advance 30 seconds to reach 0
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(screen.getByText('0:00')).toBeInTheDocument();
    expect(screen.queryByText('Pause')).not.toBeInTheDocument();
    expect(screen.queryByText('Reset')).not.toBeInTheDocument();

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
      screen.getByText('+30s').click();
    });

    const toggleBtn = screen.getByText('Pause');
    
    // Click pause
    act(() => {
      toggleBtn.click();
    });
    expect(screen.getByText('Start')).toBeInTheDocument();

    // Click start
    act(() => {
      screen.getByText('Start').click();
    });
    expect(screen.getByText('Pause')).toBeInTheDocument();
  });

  it('should handle Web Audio API errors gracefully when starting buzzer', () => {
    // Stub AudioContext to throw an error
    vi.stubGlobal('AudioContext', class {
      currentTime = 0;
      destination = {};
      createOscillator() {
        throw new Error('Web Audio not supported');
      }
    });

    vi.useFakeTimers();
    render(<RestTimer />);

    // Add 30s and advance to 0
    act(() => {
      screen.getByText('+30s').click();
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
    expect(await screen.findByText('Chest & Back')).toBeInTheDocument();
    expect(screen.getByText('Switch to Full Sheet View')).toBeInTheDocument();

    // Now click the navigation button to go to Week 1 Day 5 (Legs & Back), which is inactive/future.
    const navBtn = screen.getByTestId('nav-btn');
    await act(async () => {
      navBtn.click();
    });

    // We should now be on Legs & Back, which is an inactive day, so it defaults to sheet mode
    // (displaying the "Switch to Wizard View" button).
    expect(await screen.findByText('Legs & Back')).toBeInTheDocument();
    expect(screen.getByText('Switch to Wizard View')).toBeInTheDocument();
  });
});
