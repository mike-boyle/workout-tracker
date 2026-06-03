import React, { useState } from 'react';
import { useWorkout } from '../contexts/WorkoutContext';
import { PROGRAMS } from '../data/schedule';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'dashboard' | 'history' | 'analytics';
  setActiveTab: (tab: 'dashboard' | 'history' | 'analytics') => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const {
    state,
    user,
    syncStatus,
    errorMsg,
    login,
    logout,
    resetDatabase,
    switchProgram,
  } = useWorkout();
  const [showSettings, setShowSettings] = useState(false);

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

          {/* Sync Status Button/Badge */}
          {user ? (
            <button
              className={`btn ${
                syncStatus === 'synced'
                  ? 'btn-secondary'
                  : syncStatus === 'error'
                    ? 'btn-warning'
                    : 'btn-secondary'
              }`}
              onClick={syncStatus === 'error' ? login : undefined}
              disabled={syncStatus === 'linking' || syncStatus === 'syncing'}
              style={{
                fontSize: '0.85rem',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid',
                borderColor:
                  syncStatus === 'synced'
                    ? 'hsla(142, 72%, 46%, 0.4)'
                    : syncStatus === 'error'
                      ? 'hsla(350, 89%, 60%, 0.4)'
                      : 'var(--color-border)',
              }}
              title={
                syncStatus === 'synced'
                  ? 'Firebase cloud storage synced.'
                  : syncStatus === 'error'
                    ? `Sync Paused: ${errorMsg}. Click to reconnect.`
                    : syncStatus === 'syncing'
                      ? 'Syncing data...'
                      : 'Connecting...'
              }
            >
              {syncStatus === 'synced' && (
                <>
                  <span style={{ color: 'var(--color-green)' }}>☁️</span>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>Synced</span>
                </>
              )}
              {syncStatus === 'error' && (
                <>
                  <span style={{ color: 'var(--color-red)' }}>⚠️</span>
                  <span style={{ color: 'var(--color-red)', fontSize: '0.8rem', fontWeight: 600 }}>Sync Paused</span>
                </>
              )}
              {(syncStatus === 'syncing' || syncStatus === 'linking') && (
                <>
                  <span className="animate-spin" style={{ display: 'inline-block' }}>🔄</span>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>Syncing...</span>
                </>
              )}
            </button>
          ) : (
            <button
              className="btn btn-secondary"
              onClick={login}
              disabled={syncStatus === 'linking'}
              style={{
                fontSize: '0.85rem',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Connect Cloud Backup (Firebase)"
            >
              <span>☁️</span>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                {syncStatus === 'linking' ? 'Connecting...' : 'Backup'}
              </span>
            </button>
          )}

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
            Configure client-side backup to keep your data safe. Syncing with Firebase allows automatic, silent background updates across devices.
          </p>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px' }}>
            {user ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                  Signed in as: <strong>{user.email}</strong>
                </span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button className="btn btn-secondary" onClick={logout}>
                    Sign Out
                  </button>
                  {syncStatus === 'synced' && (
                    <span className="badge badge-green">✓ Synced with Cloud</span>
                  )}
                  {syncStatus === 'syncing' && (
                    <span className="badge badge-yellow">🔄 Syncing...</span>
                  )}
                  {syncStatus === 'error' && (
                    <span className="badge badge-red" title={errorMsg}>⚠️ Sync Error</span>
                  )}
                </div>
              </div>
            ) : (
              <button
                className="btn btn-primary"
                onClick={login}
                disabled={syncStatus === 'linking' || syncStatus === 'syncing'}
              >
                {syncStatus === 'linking' ? 'Connecting...' : 'Connect Google Account'}
              </button>
            )}
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
