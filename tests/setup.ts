import '@testing-library/jest-dom/vitest';
import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

// Setup MSW Server for Node environment (JSDOM)
const server = setupServer(...handlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

// Mock Firebase service globally to prevent it from initializing the real SDK
// or making network calls during lightweight unit tests.
vi.mock('../src/services/firebase', () => {
  return {
    auth: {
      currentUser: null,
    },
    db: {},
    logAnalyticsEvent: vi.fn(),
    signInWithGoogle: vi.fn(() => Promise.resolve({ user: { uid: 'mock-user-123' } })),
    signOutUser: vi.fn(() => Promise.resolve()),
    listenForAuthChanges: vi.fn((callback) => {
      // Immediately trigger callback with null (not logged in) to match default state
      callback(null);
      return () => {}; // unsubscribe function
    }),
    saveFirebaseMetadata: vi.fn(() => Promise.resolve()),
    loadFirebaseMetadata: vi.fn(() => Promise.resolve(null)),
    saveFirebaseCycle: vi.fn(() => Promise.resolve([])),
    loadFirebaseCycle: vi.fn(() => Promise.resolve([])),
  };
});
