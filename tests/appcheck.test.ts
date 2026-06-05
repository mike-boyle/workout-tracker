import { describe, it, expect } from 'vitest';
import { configureAppCheckDebugToken } from '../src/utils/appcheck';

describe('configureAppCheckDebugToken', () => {
  it('should set FIREBASE_APPCHECK_DEBUG_TOKEN to provided token when isDev is true', () => {
    const mockWin = {} as Window;
    configureAppCheckDebugToken(true, 'my-debug-token', mockWin);
    expect(mockWin.FIREBASE_APPCHECK_DEBUG_TOKEN).toBe('my-debug-token');
  });

  it('should fallback to true when isDev is true and debugToken is undefined', () => {
    const mockWin = {} as Window;
    configureAppCheckDebugToken(true, undefined, mockWin);
    expect(mockWin.FIREBASE_APPCHECK_DEBUG_TOKEN).toBe(true);
  });

  it('should not set FIREBASE_APPCHECK_DEBUG_TOKEN when isDev is false', () => {
    const mockWin = {} as Window;
    configureAppCheckDebugToken(false, 'my-debug-token', mockWin);
    expect(mockWin.FIREBASE_APPCHECK_DEBUG_TOKEN).toBeUndefined();
  });
});
