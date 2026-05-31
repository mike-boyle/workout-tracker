import type { UserState } from '../types';

let tokenClient: any = null;
let accessToken: string | null = null;

// Dynamically load the Google Identity Services SDK script
export const loadGsiScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if ((window as any).google?.accounts?.oauth2) {
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
  if (!(window as any).google?.accounts?.oauth2) {
    throw new Error('Google Identity Services SDK is not loaded.');
  }

  tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: 'https://www.googleapis.com/auth/drive.appdata',
    callback: (response: any) => {
      if (response.error) {
        console.error('OAuth error:', response.error);
        return;
      }
      accessToken = response.access_token;
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
};

/**
 * Get active token
 */
export const getAccessToken = () => accessToken;

/**
 * Search for the backup file in the user's Drive appDataFolder.
 * Returns the file ID if found, otherwise null.
 */
export const findBackupFile = async (): Promise<string | null> => {
  if (!accessToken) throw new Error('Not authenticated with Google');

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='p90x-tracker-data.json'+and+'appDataFolder'+in+parents&spaces=appDataFolder&fields=files(id)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Drive search failed: ${err}`);
  }

  const result = await response.json();
  if (result.files && result.files.length > 0) {
    return result.files[0].id;
  }
  return null;
};

/**
 * Download the user state file content from Google Drive
 */
export const downloadBackup = async (fileId: string): Promise<UserState> => {
  if (!accessToken) throw new Error('Not authenticated with Google');

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Drive download failed: ${err}`);
  }

  return await response.json();
};

/**
 * Create a new backup file in Google Drive AppData folder
 */
export const createBackupFile = async (data: UserState): Promise<string> => {
  if (!accessToken) throw new Error('Not authenticated with Google');

  const metadata = {
    name: 'p90x-tracker-data.json',
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

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Drive upload failed: ${err}`);
  }

  const result = await response.json();
  return result.id;
};

/**
 * Update an existing backup file in Google Drive
 */
export const updateBackupFile = async (fileId: string, data: UserState): Promise<void> => {
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

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Drive sync failed: ${err}`);
  }
};
