import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import * as storage from '../src/services/storage';

// Component that throws an error for testing
const ErrorThrower = ({ message }: { message: string }) => {
  throw new Error(message);
};

describe('ErrorBoundary', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.restoreAllMocks();
    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        reload: vi.fn(),
        hash: '',
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Safe Child</div>
      </ErrorBoundary>
    );

    expect(screen.getByTestId('child')).toHaveTextContent('Safe Child');
    expect(screen.queryByText('Something Went Wrong')).toBeNull();
  });

  it('renders error UI and captures error message when child throws', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ErrorThrower message="Test Render Crash" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
    expect(screen.getByText('Test Render Crash')).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('renders error UI and fallback string representation when child throws a non-Error value', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const StringThrower = () => {
      throw 'Raw string error';
    };

    render(
      <ErrorBoundary>
        <StringThrower />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
    expect(screen.getByText('Raw string error')).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('reloads page when "Reload Page" button is clicked', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ErrorThrower message="Reload Crash" />
      </ErrorBoundary>
    );

    const btnReload = screen.getByRole('button', { name: /reload page/i });
    btnReload.click();

    expect(window.location.reload).toHaveBeenCalledTimes(1);

    consoleSpy.mockRestore();
  });

  it('resets database and reloads on "Reset Database" click with confirm', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const clearSpy = vi.spyOn(storage, 'clearLocalState').mockResolvedValue(Promise.resolve());

    render(
      <ErrorBoundary>
        <ErrorThrower message="Reset DB Crash" />
      </ErrorBoundary>
    );

    const btnReset = screen.getByRole('button', { name: /reset database/i });

    await act(async () => {
      btnReset.click();
    });

    expect(confirmSpy).toHaveBeenCalled();
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe('#/dashboard');
    expect(window.location.reload).toHaveBeenCalledTimes(1);

    consoleSpy.mockRestore();
  });

  it('does not reset database if reset confirm is rejected', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const clearSpy = vi.spyOn(storage, 'clearLocalState');

    render(
      <ErrorBoundary>
        <ErrorThrower message="Reset DB Rejected Crash" />
      </ErrorBoundary>
    );

    const btnReset = screen.getByRole('button', { name: /reset database/i });

    await act(async () => {
      btnReset.click();
    });

    expect(confirmSpy).toHaveBeenCalled();
    expect(clearSpy).not.toHaveBeenCalled();
    expect(window.location.reload).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('shows alert and does not reload if clearLocalState fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const clearSpy = vi
      .spyOn(storage, 'clearLocalState')
      .mockRejectedValue(new Error('IndexedDB deletion failed'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ErrorThrower message="Reset DB Fail Crash" />
      </ErrorBoundary>
    );

    const btnReset = screen.getByRole('button', { name: /reset database/i });

    await act(async () => {
      btnReset.click();
    });

    expect(confirmSpy).toHaveBeenCalled();
    expect(clearSpy).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'Failed to clear database. Please clear your browser cache/storage manually.'
    );
    expect(window.location.reload).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
