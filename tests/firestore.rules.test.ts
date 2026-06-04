import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';

describe('Firestore Security Rules', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'workout-tracker-498019',
      firestore: {
        rules: readFileSync(resolve(__dirname, '../firebase/firestore.rules'), 'utf8'),
        host: '127.0.0.1',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it('allows Alice to CRUD her own metadata settings', async () => {
    const context = testEnv.authenticatedContext('alice');
    const db = context.firestore();
    const docRef = doc(db, 'users/alice/metadata/settings');

    await expect(setDoc(docRef, { theme: 'dark' })).resolves.not.toThrow();
    await expect(getDoc(docRef)).resolves.not.toThrow();
  });

  it("denies Bob to read/write Alice's metadata settings", async () => {
    const context = testEnv.authenticatedContext('bob');
    const db = context.firestore();
    const docRef = doc(db, 'users/alice/metadata/settings');

    await expect(setDoc(docRef, { theme: 'dark' })).rejects.toThrow();
    await expect(getDoc(docRef)).rejects.toThrow();
  });

  it("denies unauthenticated users to read/write Alice's metadata settings", async () => {
    const context = testEnv.unauthenticatedContext();
    const db = context.firestore();
    const docRef = doc(db, 'users/alice/metadata/settings');

    await expect(setDoc(docRef, { theme: 'dark' })).rejects.toThrow();
    await expect(getDoc(docRef)).rejects.toThrow();
  });

  it('allows Alice to CRUD her own cycle documents', async () => {
    const context = testEnv.authenticatedContext('alice');
    const db = context.firestore();
    const docRef = doc(db, 'users/alice/cycles/cycle_1');

    await expect(setDoc(docRef, { lastUpdated: new Date().toISOString() })).resolves.not.toThrow();
    await expect(getDoc(docRef)).resolves.not.toThrow();
  });

  it('allows Alice to CRUD logs inside her cycle logs subcollection', async () => {
    const context = testEnv.authenticatedContext('alice');
    const db = context.firestore();
    const docRef = doc(db, 'users/alice/cycles/cycle_1/logs/day1');

    await expect(setDoc(docRef, { id: 'day1', comments: 'Great day!' })).resolves.not.toThrow();
    await expect(getDoc(docRef)).resolves.not.toThrow();
  });

  it('enforces log comment length < 2000 characters', async () => {
    const context = testEnv.authenticatedContext('alice');
    const db = context.firestore();
    const docRef = doc(db, 'users/alice/cycles/cycle_1/logs/day1');

    const longCommentPayload = {
      id: 'day1',
      comments: 'x'.repeat(2005),
    };

    await expect(setDoc(docRef, longCommentPayload)).rejects.toThrow();

    const normalCommentPayload = {
      id: 'day1',
      comments: 'x'.repeat(1990),
    };
    await expect(setDoc(docRef, normalCommentPayload)).resolves.not.toThrow();
  });
});
