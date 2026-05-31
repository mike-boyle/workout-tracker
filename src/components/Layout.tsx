import React, { useState, useEffect } from 'react';
import { useWorkout } from '../contexts/WorkoutContext';
import {
  loadGsiScript,
  initTokenClient,
  signInGdrive,
  findBackupFile,
  downloadBackup,
  createBackupFile,
  updateBackupFile,
} from '../services/gdrive';
import { GOOGLE_CLIENT_ID } from '../config';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'dashboard' | 'history' | 'analytics';
  setActiveTab: (tab: 'dashboard' | 'history' | 'analytics') => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { state, linkGoogleDrive, syncGoogleDriveData, resetDatabase } = useWorkout();
  const [showSettings, setShowSettings] = useState(false);
  const [clientId, setClientId] = useState(() => {
    const saved = localStorage.getItem('p90x_gdrive_client_id');
    if (saved) return saved;
    if (
      GOOGLE_CLIENT_ID &&
      GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'
    ) {
      return GOOGLE_CLIENT_ID;
    }
    return '';
  });
  const [gsiLoaded, setGsiLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'linking' | 'syncing' | 'synced' | 'error'>(
    'idle'
  );
  const [errorMsg, setErrorMsg] = useState('');

  // Dynamically load Google Identity Services SDK
  useEffect(() => {
    loadGsiScript()
      .then(() => setGsiLoaded(true))
      .catch((err) => {
        console.error('Failed to load Google SDK script:', err);
        setSyncStatus('error');
        setErrorMsg('Google SDK script load failed');
      });
  }, []);

  const handleGdriveConnect = () => {
    if (!clientId.trim()) {
      alert('Please enter a Google OAuth Client ID first.');
      return;
    }

    setSyncStatus('linking');
    localStorage.setItem('p90x_gdrive_client_id', clientId.trim());

    try {
      initTokenClient(clientId.trim(), async (_accessToken) => {
        setSyncStatus('syncing');
        try {
          const fileId = await findBackupFile();
          if (fileId) {
            // Found existing file, download and merge
            localStorage.setItem('p90x_gdrive_file_id', fileId);
            const remoteData = await downloadBackup(fileId);
            syncGoogleDriveData(
              remoteData.logs,
              remoteData.currentCycle,
              remoteData.currentWeek,
              remoteData.currentDay
            );
            setSyncStatus('synced');
          } else {
            // Create a new backup file
            const newFileId = await createBackupFile({
              version: state.version,
              currentCycle: state.currentCycle,
              currentWeek: state.currentWeek,
              currentDay: state.currentDay,
              logs: state.logs,
              gdriveLinked: true,
            });
            localStorage.setItem('p90x_gdrive_file_id', newFileId);
            linkGoogleDrive(true);
            setSyncStatus('synced');
          }
          setShowSettings(false);
        } catch (err: any) {
          console.error('Google Drive Sync error:', err);
          setSyncStatus('error');
          setErrorMsg(err.message || 'Sync failed');
        }
      });
      signInGdrive();
    } catch (err: any) {
      console.error('Gauth initialization error:', err);
      setSyncStatus('error');
      setErrorMsg(err.message || 'Initialization failed');
    }
  };

  // Perform auto-sync on workout log modifications if connected
  useEffect(() => {
    const fileId = localStorage.getItem('p90x_gdrive_file_id');
    if (state.gdriveLinked && fileId) {
      setSyncStatus('syncing');
      updateBackupFile(fileId, {
        version: state.version,
        currentCycle: state.currentCycle,
        currentWeek: state.currentWeek,
        currentDay: state.currentDay,
        logs: state.logs,
        gdriveLinked: true,
      })
        .then(() => setSyncStatus('synced'))
        .catch((err) => {
          console.error('Auto sync failed:', err);
          setSyncStatus('error');
          setErrorMsg('Auto-sync failed');
        });
    }
  }, [state.logs, state.currentCycle, state.currentWeek, state.currentDay, state.gdriveLinked]);

  return (
    <div className="app-container">
      <header>
        <div className="logo-section">
          <span className="logo-text">P90X Tracker</span>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            Cycle {state.currentCycle} • Week {state.currentWeek} • Day {state.currentDay}
          </p>
        </div>

        <nav style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
          <button
            className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setShowSettings(!showSettings)}
            style={{ padding: '8px' }}
            title="Settings & Backups"
          >
            ⚙️
          </button>
        </nav>
      </header>

      {showSettings && (
        <div
          className="glass-panel animate-fade-in"
          style={{ padding: '20px', marginBottom: '20px' }}
        >
          <h3 style={{ marginBottom: '12px' }}>Backup & Cloud Storage Settings</h3>
          <p
            style={{
              fontSize: '0.9rem',
              color: 'var(--color-text-secondary)',
              marginBottom: '16px',
            }}
          >
            Configure client-side backup to keep your data safe. Since your progress is stored in
            LocalStorage, linking Google Drive avoids data loss.
          </p>

          <div className="input-group" style={{ marginBottom: '16px' }}>
            <label className="input-label">Google OAuth Client ID</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. 123456-abcdef.apps.googleusercontent.com"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Get yours in the Google Cloud Console (requires Drive API & OAuth redirect URI
              matching this host).
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={handleGdriveConnect}
              disabled={!gsiLoaded || syncStatus === 'linking' || syncStatus === 'syncing'}
            >
              {syncStatus === 'syncing'
                ? 'Syncing...'
                : syncStatus === 'linking'
                  ? 'Connecting...'
                  : state.gdriveLinked
                    ? 'Sync / Reconnect'
                    : 'Connect Google Drive'}
            </button>

            {syncStatus === 'synced' && (
              <span className="badge badge-green">✓ Connected & Cloud Synced</span>
            )}
            {syncStatus === 'error' && <span className="badge badge-red">⚠️ {errorMsg}</span>}
          </div>

          <hr
            style={{
              borderColor: 'var(--color-border)',
              margin: '20px 0 16px 0',
              borderStyle: 'solid',
              borderWidth: '0 0 1px 0',
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4 style={{ color: 'var(--color-red)', fontSize: '0.95rem' }}>Danger Zone</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Wipe all local and cycle logs and reset database to Day 1. This cannot be undone.
            </p>
            <button
              className="btn btn-danger"
              style={{ padding: '6px 12px', fontSize: '0.85rem', alignSelf: 'flex-start' }}
              onClick={() => {
                if (
                  confirm(
                    'Are you sure you want to completely reset the application? All history will be deleted.'
                  )
                ) {
                  resetDatabase();
                  localStorage.removeItem('p90x_gdrive_file_id');
                }
              }}
            >
              Reset Database
            </button>
          </div>
        </div>
      )}

      <main>{children}</main>

      <footer
        style={{
          textAlign: 'center',
          padding: '32px 0',
          borderTop: '1px solid var(--color-border)',
          color: 'var(--color-text-muted)',
          fontSize: '0.85rem',
        }}
      >
        P90X Workout Tracker • Keep pushing play, do your best, and forget the rest!
      </footer>
    </div>
  );
};
