import type { UserMetadata, WorkoutLog } from '../types';
import { validateBackup } from './storage';
 
interface GsiTokenClient {
  requestAccessToken: (options?: { prompt?: string }) => void;
}

interface OAuthResponse {
  access_token: string;
  expires_in: number;
  error?: unknown;
}

interface GoogleDriveSearchResponse {
  files?: Array<{
    id: string;
  }>;
}

interface GoogleDriveUploadResponse {
  id: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (options: {
            client_id: string;
            scope: string;
            callback: (response: OAuthResponse) => void;
          }) => GsiTokenClient;
        };
      };
    };
  }
}

let tokenClient: GsiTokenClient | null = null;
 
const getStoredToken = (): string | null => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const token = localStorage.getItem('workout_tracker_gdrive_access_token');
    const expiresAtStr = localStorage.getItem('workout_tracker_gdrive_token_expires_at');
    if (!token || !expiresAtStr) return null;
 
    const expiresAt = parseInt(expiresAtStr, 10);
    if (Date.now() >= expiresAt) {
      localStorage.removeItem('workout_tracker_gdrive_access_token');
      localStorage.removeItem('workout_tracker_gdrive_token_expires_at');
      return null;
    }
    return token;
  } catch (e) {
    console.error('Failed to read from localStorage:', e);
    return null;
  }
};
 
const saveToken = (token: string, expiresInSeconds: number) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem('workout_tracker_gdrive_access_token', token);
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    localStorage.setItem('workout_tracker_gdrive_token_expires_at', expiresAt.toString());
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
};
 
const clearStoredToken = () => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem('workout_tracker_gdrive_access_token');
    localStorage.removeItem('workout_tracker_gdrive_token_expires_at');
  } catch (e) {
    console.error('Failed to clear localStorage:', e);
  }
};
 
let accessToken: string | null = getStoredToken();
 
// Dynamically load the Google Identity Services SDK script
export const loadGsiScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.oauth2) {
        resolve();
      } else {
        reject(new Error('Google Identity Services SDK failed to load.'));
      }
    };
    script.onerror = () => reject(new Error('GSI Script load error'));
    document.head.appendChild(script);
  });
};
 
/**
 * Initializes the OAuth token client
 */
export const initTokenClient = (clientId: string, onTokenReceived: (token: string) => void) => {
  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services SDK is not loaded.');
  }
 
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: 'https://www.googleapis.com/auth/drive.appdata',
    callback: (response: OAuthResponse) => {
      if (response.error) {
        console.error('OAuth error:', response.error);
        return;
      }
      accessToken = response.access_token;
      if (response.access_token && response.expires_in) {
        saveToken(response.access_token, response.expires_in);
      }
      onTokenReceived(response.access_token);
    },
  });
};

/**
 * Request sign-in / trigger Google OAuth popup
 */
export const signInGdrive = (): void => {
  if (!tokenClient) {
    throw new Error('Token client not initialized. Please configure Client ID first.');
  }
  tokenClient.requestAccessToken({ prompt: 'consent' });
};

/**
 * Set token directly (e.g. if loaded from session)
 */
export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (token) {
    saveToken(token, 3600); // Default to 1 hour
  } else {
    clearStoredToken();
  }
};

/**
 * Get active token
 */
export const getAccessToken = () => accessToken;

/**
 * Helper to handle response validation and auto-clear expired tokens on 401 Unauthorized
 */
const handleResponse = async (response: Response, errorPrefix: string) => {
  if (response.status === 401) {
    setAccessToken(null);
    throw new Error('Google Drive session expired. Please sign in again.');
  }
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`${errorPrefix}: ${err}`);
  }
  return response;
};

/**
 * Search for the metadata file in the user's Drive appDataFolder.
 * Returns the file ID if found, otherwise null.
 */
export const findMetadataFile = async (): Promise<string | null> => {
  if (!accessToken) throw new Error('Not authenticated with Google');

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='workout-tracker-metadata.json'+and+'appDataFolder'+in+parents&spaces=appDataFolder&fields=files(id)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  await handleResponse(response, 'Drive search failed');

  const result = (await response.json()) as GoogleDriveSearchResponse;
  if (result.files && result.files.length > 0) {
    return result.files[0].id;
  }
  return null;
};

/**
 * Download the user metadata content from Google Drive
 */
export const downloadMetadata = async (fileId: string): Promise<UserMetadata> => {
  if (!accessToken) throw new Error('Not authenticated with Google');

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  await handleResponse(response, 'Drive download failed');

  const data = await response.json();
  if (!validateBackup(data)) {
    throw new Error('Downloaded metadata is invalid or corrupted');
  }
  return data;
};

/**
 * Create a new metadata file in Google Drive AppData folder
 */
export const createMetadataFile = async (data: UserMetadata): Promise<string> => {
  if (!accessToken) throw new Error('Not authenticated with Google');

  const metadata = {
    name: 'workout-tracker-metadata.json',
    parents: ['appDataFolder'],
  };

  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', new Blob([JSON.stringify(data)], { type: 'application/json' }));

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    }
  );

  await handleResponse(response, 'Drive upload failed');

  const result = (await response.json()) as GoogleDriveUploadResponse;
  return result.id;
};

/**
 * Update the metadata file in Google Drive
 */
export const updateMetadataFile = async (fileId: string, data: UserMetadata): Promise<void> => {
  if (!accessToken) throw new Error('Not authenticated with Google');

  const response = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  await handleResponse(response, 'Drive sync failed');
};

/**
 * Type predicate to check if data is an array of WorkoutLog items
 */
export function isWorkoutLogArray(data: unknown): data is WorkoutLog[] {
  if (!Array.isArray(data)) return false;
  if (data.length === 0) return true;
  const first = data[0];
  if (!first || typeof first !== 'object') return false;
  const f = first as Record<string, unknown>;
  return (
    typeof f.id === 'string' &&
    typeof f.cycle === 'number' &&
    typeof f.week === 'number' &&
    typeof f.day === 'number'
  );
}

/**
 * Download cycle logs content from Google Drive
 */
export const downloadCycleLogs = async (fileId: string): Promise<WorkoutLog[]> => {
  if (!accessToken) throw new Error('Not authenticated with Google');

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  await handleResponse(response, 'Drive download failed');

  const data = await response.json();
  if (isWorkoutLogArray(data)) {
    return data;
  }
  if (data && typeof data === 'object' && 'logs' in data) {
    const logs = (data as { logs: unknown }).logs;
    if (isWorkoutLogArray(logs)) {
      return logs;
    }
  }
  return [];
};

/**
 * Create a new cycle log file in Google Drive AppData folder
 */
export const createCycleFile = async (cycleNum: number, logs: WorkoutLog[]): Promise<string> => {
  if (!accessToken) throw new Error('Not authenticated with Google');

  const metadata = {
    name: `workout-tracker-cycle-${cycleNum}.json`,
    parents: ['appDataFolder'],
  };

  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', new Blob([JSON.stringify(logs)], { type: 'application/json' }));

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    }
  );

  await handleResponse(response, 'Drive upload failed');

  const result = (await response.json()) as GoogleDriveUploadResponse;
  return result.id;
};

/**
 * Update an existing cycle log file in Google Drive
 */
export const updateCycleFile = async (fileId: string, logs: WorkoutLog[]): Promise<void> => {
  if (!accessToken) throw new Error('Not authenticated with Google');

  const response = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logs),
    }
  );

  await handleResponse(response, 'Drive sync failed');
};
