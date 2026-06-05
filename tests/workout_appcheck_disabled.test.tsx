import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { WorkoutProvider, useWorkout } from '../src/contexts/WorkoutContext';
import type { User } from 'firebase/auth';

// 1. Mock config with ENABLE_APP_CHECK: false
vi.mock('../src/config', () => ({
  ENABLE_APP_CHECK: false,
  FIREBASE_CONFIG: {},
  RECAPTCHA_SITE_KEY: '',
}));

// 2. Mock firebase service
vi.mock('../src/services/firebase', () => ({
  auth: { currentUser: null },
  db: {},
  logAnalyticsEvent: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOutUser: vi.fn(),
  listenForAuthChanges: vi.fn((callback) => {
    // Return a logged in user to trigger auth sync block
    callback({ uid: 'mock-user-123' } as unknown as User);
    return () => {};
  }),
  saveFirebaseMetadata: vi.fn(),
  loadFirebaseMetadata: vi.fn(),
  saveFirebaseCycle: vi.fn(),
  loadFirebaseCycle: vi.fn(),
}));

describe('WorkoutContext - App Check Disabled', () => {
  it('should set sync status to idle and exit early if ENABLE_APP_CHECK is false', async () => {
    const TestComponent = () => {
      const { syncStatus, state } = useWorkout();
      if (state.loading) return <div data-testid="loading">Loading...</div>;
      return <div data-testid="sync-status">{syncStatus}</div>;
    };

    const { findByTestId } = render(
      <WorkoutProvider>
        <TestComponent />
      </WorkoutProvider>
    );

    const statusEl = await findByTestId('sync-status');
    expect(statusEl.textContent).toBe('idle');
  });

  it('should not query Firestore in loadCycleLogs if ENABLE_APP_CHECK is false', async () => {
    let loadCycleFn: ((c: number) => Promise<void>) | null = null;
    const TestComponent = () => {
      const { loadCycleLogs, state } = useWorkout();
      loadCycleFn = loadCycleLogs;
      if (state.loading) return <div data-testid="loading">Loading...</div>;
      return null;
    };

    render(
      <WorkoutProvider>
        <TestComponent />
      </WorkoutProvider>
    );

    const { loadFirebaseCycle } = await import('../src/services/firebase');

    // Call loadCycleLogs
    await act(async () => {
      if (loadCycleFn) {
        await loadCycleFn(2);
      }
    });

    expect(loadFirebaseCycle).not.toHaveBeenCalled();
  });
});
