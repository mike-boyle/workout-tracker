import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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

  const getValidSettings = () => ({
    version: 1,
    currentCycle: 1,
    currentWeek: 1,
    currentDay: 1,

    lastUpdated: serverTimestamp(),
  });

  const getValidLog = () => ({
    id: 'cycle_1_week_1_day_1',
    cycle: 1,
    week: 1,
    day: 1,
    workoutId: 'chest_and_back',
    dateCompleted: new Date().toISOString(),
    skipped: false,
    abRipperCompleted: false,
    comments: 'Great day!',
    exercises: {},
  });

  it('allows Alice to CRUD her own metadata settings with valid schema', async () => {
    const context = testEnv.authenticatedContext('alice');
    const db = context.firestore();
    const docRef = doc(db, 'users/alice/metadata/settings');

    await expect(setDoc(docRef, getValidSettings())).resolves.not.toThrow();
    await expect(getDoc(docRef)).resolves.not.toThrow();
  });

  it('denies settings writes with invalid fields or invalid values', async () => {
    const context = testEnv.authenticatedContext('alice');
    const db = context.firestore();
    const docRef = doc(db, 'users/alice/metadata/settings');

    // Extra/garbage fields
    await expect(
      setDoc(docRef, { ...getValidSettings(), extraField: 'garbage' })
    ).rejects.toThrow();

    // Invalid currentWeek range (> 13)
    await expect(setDoc(docRef, { ...getValidSettings(), currentWeek: 14 })).rejects.toThrow();

    // Invalid cycle (> 20)
    await expect(setDoc(docRef, { ...getValidSettings(), currentCycle: 25 })).rejects.toThrow();

    // Missing required field
    const invalidSettings: Partial<ReturnType<typeof getValidSettings>> = getValidSettings();
    delete invalidSettings.version;
    await expect(setDoc(docRef, invalidSettings)).rejects.toThrow();
  });

  it('denies setting documents with IDs other than "settings"', async () => {
    const context = testEnv.authenticatedContext('alice');
    const db = context.firestore();
    const docRef = doc(db, 'users/alice/metadata/invalid_id');

    await expect(setDoc(docRef, getValidSettings())).rejects.toThrow();
  });

  it('enforces rate limiting on settings updates', async () => {
    const context = testEnv.authenticatedContext('alice');
    const db = context.firestore();
    const docRef = doc(db, 'users/alice/metadata/settings');

    // First write succeeds
    await expect(setDoc(docRef, getValidSettings())).resolves.not.toThrow();

    // Second write immediately after fails due to 2-second rate limit
    await expect(setDoc(docRef, getValidSettings())).rejects.toThrow();
  });

  it("denies Bob to read/write Alice's metadata settings", async () => {
    const context = testEnv.authenticatedContext('bob');
    const db = context.firestore();
    const docRef = doc(db, 'users/alice/metadata/settings');

    await expect(setDoc(docRef, getValidSettings())).rejects.toThrow();
    await expect(getDoc(docRef)).rejects.toThrow();
  });

  it('allows Alice to CRUD her own cycle documents', async () => {
    const context = testEnv.authenticatedContext('alice');
    const db = context.firestore();
    const docRef = doc(db, 'users/alice/cycles/p90x_cycle_1');

    await expect(setDoc(docRef, { lastUpdated: serverTimestamp() })).resolves.not.toThrow();
    await expect(getDoc(docRef)).resolves.not.toThrow();
  });

  it('denies Alice to CRUD cycle documents with invalid formats or non-merge fields', async () => {
    const context = testEnv.authenticatedContext('alice');
    const db = context.firestore();

    // Invalid format (invalid cycle number > 20)
    const invalidDoc1 = doc(db, 'users/alice/cycles/p90x_cycle_21');
    await expect(setDoc(invalidDoc1, { lastUpdated: serverTimestamp() })).rejects.toThrow();

    // Extra fields
    const invalidDoc2 = doc(db, 'users/alice/cycles/p90x_cycle_1');
    await expect(
      setDoc(invalidDoc2, { lastUpdated: serverTimestamp(), garbage: 'val' })
    ).rejects.toThrow();
  });

  it('allows Alice to CRUD logs inside her cycle logs subcollection with valid schema', async () => {
    const context = testEnv.authenticatedContext('alice');
    const db = context.firestore();
    const docRef = doc(db, 'users/alice/cycles/p90x_cycle_1/logs/cycle_1_week_1_day_1');

    await expect(setDoc(docRef, getValidLog())).resolves.not.toThrow();
    await expect(getDoc(docRef)).resolves.not.toThrow();
  });

  it('denies log writes with mismatched IDs, invalid ranges, or too-long strings', async () => {
    const context = testEnv.authenticatedContext('alice');
    const db = context.firestore();

    // Mismatched ID in document path vs payload
    const docRef1 = doc(db, 'users/alice/cycles/p90x_cycle_1/logs/cycle_1_week_1_day_2');
    await expect(setDoc(docRef1, getValidLog())).rejects.toThrow();

    // Invalid week range
    const docRef2 = doc(db, 'users/alice/cycles/p90x_cycle_1/logs/cycle_1_week_14_day_1');
    const invalidWeekLog = { ...getValidLog(), id: 'cycle_1_week_14_day_1', week: 14 };
    await expect(setDoc(docRef2, invalidWeekLog)).rejects.toThrow();

    // Too long workoutId (> 100 chars)
    const docRef3 = doc(db, 'users/alice/cycles/p90x_cycle_1/logs/cycle_1_week_1_day_1');
    const invalidWorkoutIdLog = {
      ...getValidLog(),
      workoutId: 'x'.repeat(101),
    };
    await expect(setDoc(docRef3, invalidWorkoutIdLog)).rejects.toThrow();

    // Too long dateCompleted (> 100 chars)
    const docRef4 = doc(db, 'users/alice/cycles/p90x_cycle_1/logs/cycle_1_week_1_day_1');
    const invalidDateLog = {
      ...getValidLog(),
      dateCompleted: 'x'.repeat(101),
    };
    await expect(setDoc(docRef4, invalidDateLog)).rejects.toThrow();
  });

  it('enforces log comment length < 2000 characters', async () => {
    const context = testEnv.authenticatedContext('alice');
    const db = context.firestore();
    const docRef = doc(db, 'users/alice/cycles/p90x_cycle_1/logs/cycle_1_week_1_day_1');

    const longCommentPayload = {
      ...getValidLog(),
      comments: 'x'.repeat(2005),
    };

    await expect(setDoc(docRef, longCommentPayload)).rejects.toThrow();

    const normalCommentPayload = {
      ...getValidLog(),
      comments: 'x'.repeat(1990),
    };
    await expect(setDoc(docRef, normalCommentPayload)).resolves.not.toThrow();
  });

  it('denies reads and writes if the user is banned', async () => {
    const context = testEnv.authenticatedContext('alice', { banned: true });
    const db = context.firestore();
    const docRef = doc(db, 'users/alice/metadata/settings');

    await expect(getDoc(docRef)).rejects.toThrow();
    await expect(setDoc(docRef, getValidSettings())).rejects.toThrow();
  });
});
