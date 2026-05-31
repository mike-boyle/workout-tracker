import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { RestTimer } from '../src/components/RestTimer';

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
});
