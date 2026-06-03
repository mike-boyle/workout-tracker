import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getAnalytics, logEvent, isSupported, type Analytics } from 'firebase/analytics';
import { FIREBASE_CONFIG } from '../config';
import type { UserMetadata, WorkoutLog } from '../types';

// Initialize Firebase
const app = initializeApp(FIREBASE_CONFIG);
export const auth = getAuth(app);
export const db = getFirestore(app);
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
 * Save workout logs array for a specific cycle to Firestore cycles subcollection doc
 */
export const saveFirebaseCycle = async (
  userId: string,
  cycleNum: number,
  logs: WorkoutLog[],
  programId: string = 'p90x'
): Promise<void> => {
  const docRef = doc(db, 'users', userId, 'cycles', `${programId}_cycle_${cycleNum}`);
  await setDoc(docRef, {
    logs,
    lastUpdated: serverTimestamp(),
  });
};

/**
 * Load workout logs array for a specific cycle from Firestore cycles subcollection doc
 */
export const loadFirebaseCycle = async (
  userId: string,
  cycleNum: number,
  programId: string = 'p90x'
): Promise<WorkoutLog[]> => {
  const docRef = doc(db, 'users', userId, 'cycles', `${programId}_cycle_${cycleNum}`);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return (data.logs || []) as WorkoutLog[];
  }
  return [];
};
