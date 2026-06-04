import React from 'react';
import { useWorkout } from '../../contexts/WorkoutContext';
import { Flex, Text } from '../ui';

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
        }`}
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
        <Flex align="center" gap={2} inline>
          {syncStatus === 'synced' && (
            <>
              <Text color="green">☁️</Text>
              <Text color="secondary" size="0.8rem">
                Synced
              </Text>
            </>
          )}
          {syncStatus === 'error' && (
            <>
              <Text color="red">⚠️</Text>
              <Text color="red" size="0.8rem" weight="semibold">
                Sync Paused
              </Text>
            </>
          )}
          {(syncStatus === 'syncing' || syncStatus === 'linking') && (
            <>
              <span className="animate-spin" style={{ display: 'inline-block' }}>
                🔄
              </span>
              <Text color="secondary" size="0.8rem">
                Syncing...
              </Text>
            </>
          )}
        </Flex>
      </button>
    );
  }

  return (
    <button
      className="btn btn-secondary"
      onClick={login}
      disabled={syncStatus === 'linking'}
      style={{
        fontSize: '0.85rem',
        padding: '8px 12px',
      }}
      title="Connect Cloud Backup (Firebase)"
    >
      <Flex align="center" gap={2} inline>
        <span>☁️</span>
        <Text color="secondary" size="0.8rem">
          {syncStatus === 'linking' ? 'Connecting...' : 'Backup'}
        </Text>
      </Flex>
    </button>
  );
};
