import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  connectAuthEmulator,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  writeBatch,
  deleteField,
  connectFirestoreEmulator,
} from 'firebase/firestore/lite';
import { getAnalytics, logEvent, isSupported, type Analytics } from 'firebase/analytics';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { FIREBASE_CONFIG, ENABLE_APP_CHECK, RECAPTCHA_SITE_KEY } from '../config';
import type { UserMetadata, WorkoutLog } from '../types';

declare global {
  interface Window {
    FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string;
  }
}

// Initialize Firebase
const app = initializeApp(FIREBASE_CONFIG);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Connect Firebase emulators in development if opt-in env flag is true
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099');
    console.log('Firebase Emulators connected (Firestore: 8080, Auth: 9099)');
  } catch (err) {
    console.warn('Firebase Emulators failed to connect or are already connected:', err);
  }
}

// Initialize Firebase App Check conditionally
if (ENABLE_APP_CHECK && RECAPTCHA_SITE_KEY) {
  /* v8 ignore next 3 */
  if (import.meta.env.DEV) {
    window.FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || true;
  }
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    console.warn('Firebase App Check failed to initialize:', err);
  }
}

const googleProvider = new GoogleAuthProvider();

// Initialize Analytics optionally (only in supported browser environments)
let analytics: Analytics | null = null;
isSupported()
  .then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  })
  .catch((err) => {
    console.warn('Firebase Analytics not supported or failed to initialize:', err);
  });

/**
 * Safely log an event to Firebase Analytics
 */
export const logAnalyticsEvent = (
  eventName: string,
  eventParams?: Record<string, unknown>
): void => {
  if (analytics) {
    try {
      logEvent(analytics, eventName, eventParams);
    } catch (err) {
      console.warn(`Failed to log analytics event "${eventName}":`, err);
    }
  }
};

/**
 * Triggers Google Sign-In popup
 */
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

/**
 * Signs out current user
 */
export const signOutUser = () => signOut(auth);

/**
 * Listens for Auth State Changes
 */
export const listenForAuthChanges = (callback: (user: User | null) => void) =>
  onAuthStateChanged(auth, callback);

/**
 * Save user metadata to Firestore settings doc
 */
export const saveFirebaseMetadata = async (
  userId: string,
  metadata: UserMetadata
): Promise<void> => {
  const docRef = doc(db, 'users', userId, 'metadata', 'settings');
  await setDoc(docRef, {
    ...metadata,
    lastUpdated: serverTimestamp(),
  });
};

/**
 * Load user metadata from Firestore settings doc
 */
export const loadFirebaseMetadata = async (userId: string): Promise<UserMetadata | null> => {
  const docRef = doc(db, 'users', userId, 'metadata', 'settings');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as UserMetadata;
  }
  return null;
};

/**
 * Save workout logs array for a specific cycle to Firestore cycles logs subcollection
 */
export const saveFirebaseCycle = async (
  userId: string,
  cycleNum: number,
  logs: WorkoutLog[],
  programId: string = 'p90x'
): Promise<void> => {
  const cycleDocRef = doc(db, 'users', userId, 'cycles', `${programId}_cycle_${cycleNum}`);
  // Save/update the parent doc's timestamp
  await setDoc(cycleDocRef, { lastUpdated: serverTimestamp() }, { merge: true });

  if (logs.length > 0) {
    const batch = writeBatch(db);
    const logsCollectionRef = collection(
      db,
      'users',
      userId,
      'cycles',
      `${programId}_cycle_${cycleNum}`,
      'logs'
    );
    logs.forEach((log) => {
      const logDocRef = doc(logsCollectionRef, log.id);
      batch.set(logDocRef, log);
    });
    await batch.commit();
  }
};

/**
 * Load workout logs array for a specific cycle from Firestore cycles logs subcollection
 */
export const loadFirebaseCycle = async (
  userId: string,
  cycleNum: number,
  programId: string = 'p90x'
): Promise<WorkoutLog[]> => {
  const cycleDocRef = doc(db, 'users', userId, 'cycles', `${programId}_cycle_${cycleNum}`);
  const logsCollectionRef = collection(
    db,
    'users',
    userId,
    'cycles',
    `${programId}_cycle_${cycleNum}`,
    'logs'
  );

  // 1. Try to load from new subcollection
  const querySnapshot = await getDocs(logsCollectionRef);
  if (!querySnapshot.empty) {
    const logs: WorkoutLog[] = [];
    querySnapshot.forEach((docSnap) => {
      logs.push(docSnap.data() as WorkoutLog);
    });
    // Sort by week and day to maintain chronological order
    return logs.sort((a, b) => {
      if (a.week !== b.week) return a.week - b.week;
      return a.day - b.day;
    });
  }

  // 2. Fallback to legacy document format and migrate on-the-fly
  const docSnap = await getDoc(cycleDocRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    if (Array.isArray(data.logs) && data.logs.length > 0) {
      const legacyLogs = data.logs as WorkoutLog[];
      const batch = writeBatch(db);
      legacyLogs.forEach((log) => {
        const logDocRef = doc(logsCollectionRef, log.id);
        batch.set(logDocRef, log);
      });
      // Remove legacy logs array from parent document
      batch.update(cycleDocRef, { logs: deleteField() });
      await batch.commit();
      return legacyLogs;
    }
  }

  return [];
};
