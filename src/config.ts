// Centralized Application Configuration

// Firebase Web Configuration
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDaeIG_R5hVICMjERmo83zj9kIVsGeaYyM',
  authDomain: 'workout-tracker-498019.firebaseapp.com',
  projectId: 'workout-tracker-498019',
  storageBucket: 'workout-tracker-498019.firebasestorage.app',
  messagingSenderId: '414005593916',
  appId: '1:414005593916:web:be8aabf5acc97bcd244039',
  measurementId: 'G-Q4HYM1RGF3',
};

// Enable/Disable Firebase App Check initialization
export const ENABLE_APP_CHECK: boolean =
  import.meta.env.PROD || import.meta.env.VITE_ENABLE_APP_CHECK === 'true';

// Your reCAPTCHA v3 Site Key
export const RECAPTCHA_SITE_KEY: string =
  import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LdREQotAAAAABDqxbaE8wQC6Tckm-_4LijHuvRj';
