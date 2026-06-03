import React, { useState, useEffect } from 'react';
import { useWorkout } from '../contexts/WorkoutContext';
import {
  loadGsiScript,
  initTokenClient,
  signInGdrive,
  findMetadataFile,
  downloadMetadata,
  createMetadataFile,
  updateMetadataFile,
  downloadCycleLogs,
  createCycleFile,
  updateCycleFile,
  getAccessToken,
} from '../services/gdrive';
import type { UserMetadata, WorkoutLog } from '../types';
import { PROGRAMS } from '../data/schedule';
import { GOOGLE_CLIENT_ID } from '../config';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'dashboard' | 'history' | 'analytics';
  setActiveTab: (tab: 'dashboard' | 'history' | 'analytics') => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { state, syncGoogleDriveData, resetDatabase, switchProgram } = useWorkout();
  const [showSettings, setShowSettings] = useState(false);
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
    if (
      !GOOGLE_CLIENT_ID ||
      GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'
    ) {
      alert('Please configure a valid GOOGLE_CLIENT_ID in src/config.ts first.');
      return;
    }

    setSyncStatus('linking');

    try {
      initTokenClient(GOOGLE_CLIENT_ID, async () => {
        setSyncStatus('syncing');
        try {
          const metadataFileId = await findMetadataFile();
          if (metadataFileId) {
            const remoteMetadata = await downloadMetadata(metadataFileId);
            remoteMetadata.metadataFileId = metadataFileId;

            // Load remote active cycle logs
            const activeCycleNum = remoteMetadata.currentCycle;
            const activeCycleFileId = remoteMetadata.cycleFileIds?.[activeCycleNum];
            let activeLogs: WorkoutLog[] = [];
            if (activeCycleFileId) {
              activeLogs = await downloadCycleLogs(activeCycleFileId);
            }

            syncGoogleDriveData(remoteMetadata, activeLogs);
            setSyncStatus('synced');
          } else {
            // Create active cycle logs file on GDrive
            const activeCycleLogs = state.loadedCycles[state.currentCycle] || [];
            const cycleFileId = await createCycleFile(state.currentCycle, activeCycleLogs);

            // Create metadata file
            const newMetadata: UserMetadata = {
              version: state.version,
              currentCycle: state.currentCycle,
              currentWeek: state.currentWeek,
              currentDay: state.currentDay,
              gdriveLinked: true,
              cycleFileIds: { [state.currentCycle]: cycleFileId },
              cycleTimestamps: { [state.currentCycle]: new Date().toISOString() },
              cycleStats: state.cycleStats || {},
            };

            const newMetadataFileId = await createMetadataFile(newMetadata);
            newMetadata.metadataFileId = newMetadataFileId;

            syncGoogleDriveData(newMetadata, activeCycleLogs);
            setSyncStatus('synced');
          }
          setShowSettings(false);
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          console.error('Google Drive Sync error:', error);
          setSyncStatus('error');
          setErrorMsg(error.message);
        }
      });
      signInGdrive();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Gauth initialization error:', error);
      setSyncStatus('error');
      setErrorMsg(error.message);
    }
  };

  const activeCycleLogs = state.loadedCycles[state.currentCycle];

  // Perform auto-sync on workout log or metadata modifications if connected
  useEffect(() => {
    if (state.loading) return;

    const syncWithDrive = async () => {
      // eslint-disable-next-line react-hooks/immutability -- The state object returned by useWorkout() is mutated below to silently update Google Drive file/timestamp caches without dispatching context state updates, which would trigger infinite auto-sync effect loops. The rule flags the first access of state inside this hook.
      const metadataFileId = state.metadataFileId;
      if (!state.gdriveLinked || !metadataFileId) return;

      if (!getAccessToken()) {
        setSyncStatus('error');
        setErrorMsg('Session expired. Please reconnect Google Drive.');
        return;
      }

      setSyncStatus('syncing');
      try {
        const activeCycleNum = state.currentCycle;
        const activeLogs = activeCycleLogs || [];
        let activeCycleFileId = state.cycleFileIds?.[activeCycleNum];

        // 1. Sync active cycle logs
        if (!activeCycleFileId) {
          activeCycleFileId = await createCycleFile(activeCycleNum, activeLogs);
        } else {
          await updateCycleFile(activeCycleFileId, activeLogs);
        }

        // 2. Build metadata
        const updatedMetadata: UserMetadata = {
          version: state.version,
          currentCycle: state.currentCycle,
          currentWeek: state.currentWeek,
          currentDay: state.currentDay,
          gdriveLinked: true,
          metadataFileId: metadataFileId,
          cycleFileIds: Object.assign({}, state.cycleFileIds, {
            [activeCycleNum]: activeCycleFileId,
          }),
          cycleTimestamps: Object.assign({}, state.cycleTimestamps, {
            [activeCycleNum]: new Date().toISOString(),
          }),
          cycleStats: state.cycleStats || {},
          activeProgramId: state.activeProgramId || 'p90x',
          programs: state.programs || {},
        };

        // 3. Sync metadata
        await updateMetadataFile(metadataFileId, updatedMetadata);

        state.cycleFileIds = updatedMetadata.cycleFileIds;
        state.cycleTimestamps = updatedMetadata.cycleTimestamps;

        setSyncStatus('synced');
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('Auto sync failed:', error);
        setSyncStatus('error');
        setErrorMsg(error.message || 'Auto-sync failed');
      }
    };

    // Run syncing
    syncWithDrive();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Dependency array is granularly specified to target only value changes; including state reference triggers infinite loop.
  }, [
    state.currentCycle,
    state.currentWeek,
    state.currentDay,
    state.gdriveLinked,
    state.metadataFileId,
    state.cycleStats,
    activeCycleLogs,
    state.loading,
    state.activeProgramId,
    state.programs,
  ]);

  if (state.loading) {
    const spinnerStyle = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--color-bg)',
          color: 'var(--color-text-primary)',
          fontFamily: 'Outfit, sans-serif',
        }}
      >
        <style>{spinnerStyle}</style>
        <div
          style={{
            border: '4px solid hsla(var(--hue-base), 15%, 25%, 0.2)',
            borderTop: '4px solid var(--color-cyan)',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            animation: 'spin 1.2s linear infinite',
            marginBottom: '16px',
          }}
        />
        <h3>Loading Workout Tracker...</h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Preparing database storage
        </p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header>
        <div className="logo-section">
          <span className="logo-text">Workout Tracker</span>
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

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px' }}>
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

          {/* Workout Program Selector */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '8px' }}>Select Workout Program</h4>
            <select
              id="program-select"
              className="input-field"
              value={state.activeProgramId || 'p90x'}
              onChange={(e) => switchProgram(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--color-bg-surface)',
                borderColor: 'var(--color-border)',
                borderRadius: '6px',
                color: 'var(--color-text-primary)',
              }}
            >
              {Object.values(PROGRAMS).map((prog) => (
                <option key={prog.id} value={prog.id}>
                  {prog.name}
                </option>
              ))}
            </select>
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
                  localStorage.removeItem('workout_tracker_gdrive_file_id');
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
        <div style={{ marginBottom: '8px' }}>
          Workout Tracker • Keep pushing play, do your best, and forget the rest!
        </div>
        <div>
          <a
            href="https://github.com/mike-boyle/workout-tracker"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--color-cyan)',
              textDecoration: 'none',
              fontWeight: '500',
              transition: 'opacity var(--transition-fast)',
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = '0.8')}
            onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
          >
            GitHub Repository
          </a>
          {' • '}
          <a
            href="https://mike-boyle.github.io/workout-tracker/"
            style={{
              color: 'var(--color-cyan)',
              textDecoration: 'none',
              fontWeight: '500',
              transition: 'opacity var(--transition-fast)',
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = '0.8')}
            onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Hosted Site
          </a>
        </div>
      </footer>
    </div>
  );
};
