import React from 'react';
import { useWorkout } from '../../contexts/WorkoutContext';
import { PROGRAMS } from '../../data/schedule';

export const SettingsPanel: React.FC = () => {
  const { state, user, syncStatus, errorMsg, login, logout, resetDatabase, switchProgram } =
    useWorkout();

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '20px', marginBottom: '20px' }}>
      <h3 style={{ marginBottom: '12px' }}>Backup & Cloud Storage Settings</h3>
      <p
        className="text-secondary"
        style={{
          fontSize: '0.9rem',
          marginBottom: '16px',
        }}
      >
        Configure client-side backup to keep your data safe. Syncing with Firebase allows automatic,
        silent background updates across devices.
      </p>

      <div className="flex gap-2 items-center" style={{ marginBottom: '20px' }}>
        {user ? (
          <div className="flex flex-col gap-2">
            <span className="text-secondary" style={{ fontSize: '0.9rem' }}>
              Signed in as: <strong>{user.email}</strong>
            </span>
            <div className="flex gap-2 items-center">
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
                <span className="badge badge-red" title={errorMsg}>
                  ⚠️ Sync Error
                </span>
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

      <div className="flex flex-col gap-2">
        <h4 className="text-red" style={{ fontSize: '0.95rem' }}>
          Danger Zone
        </h4>
        <p className="text-secondary" style={{ fontSize: '0.8rem' }}>
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
  );
};
