import React from 'react';
import { useWorkout } from '../../contexts/WorkoutContext';

export const SyncBadge: React.FC = () => {
  const { user, syncStatus, errorMsg, login } = useWorkout();

  if (user) {
    return (
      <button
        className={`btn ${
          syncStatus === 'synced'
            ? 'btn-secondary'
            : syncStatus === 'error'
              ? 'btn-warning'
              : 'btn-secondary'
        } flex items-center gap-2`}
        onClick={syncStatus === 'error' ? login : undefined}
        disabled={syncStatus === 'linking' || syncStatus === 'syncing'}
        style={{
          fontSize: '0.85rem',
          padding: '8px 12px',
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
            <span className="text-green">☁️</span>
            <span className="text-secondary" style={{ fontSize: '0.8rem' }}>
              Synced
            </span>
          </>
        )}
        {syncStatus === 'error' && (
          <>
            <span className="text-red">⚠️</span>
            <span className="text-red" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Sync Paused
            </span>
          </>
        )}
        {(syncStatus === 'syncing' || syncStatus === 'linking') && (
          <>
            <span className="animate-spin" style={{ display: 'inline-block' }}>
              🔄
            </span>
            <span className="text-secondary" style={{ fontSize: '0.8rem' }}>
              Syncing...
            </span>
          </>
        )}
      </button>
    );
  }

  return (
    <button
      className="btn btn-secondary flex items-center gap-2"
      onClick={login}
      disabled={syncStatus === 'linking'}
      style={{
        fontSize: '0.85rem',
        padding: '8px 12px',
      }}
      title="Connect Cloud Backup (Firebase)"
    >
      <span>☁️</span>
      <span className="text-secondary" style={{ fontSize: '0.8rem' }}>
        {syncStatus === 'linking' ? 'Connecting...' : 'Backup'}
      </span>
    </button>
  );
};
