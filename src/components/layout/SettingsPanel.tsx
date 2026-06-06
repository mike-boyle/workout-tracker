import React from 'react';
import { useWorkout } from '../../contexts/WorkoutContext';
import { PROGRAMS } from '../../data/schedule';
import { Flex, Heading, Text, Card } from '../ui';

export const SettingsPanel: React.FC = () => {
  const { state, user, syncStatus, errorMsg, login, logout, resetDatabase, switchProgram } =
    useWorkout();

  return (
    <Card className="animate-fade-in" style={{ padding: '20px', marginBottom: '20px' }}>
      <Heading level={3} style={{ marginBottom: '12px' }}>
        Backup & Cloud Storage Settings
      </Heading>
      <Text
        variant="p"
        color="secondary"
        size="sm"
        style={{
          marginBottom: '16px',
        }}
      >
        Configure client-side backup to keep your data safe. Syncing with Firebase allows automatic,
        silent background updates across devices.
      </Text>

      <Flex gap={2} align="center" style={{ marginBottom: '20px' }}>
        {user ? (
          <Flex direction="column" gap={2}>
            <Text color="secondary" size="sm">
              Signed in as: <strong>{user.email}</strong>
            </Text>
            <Flex gap={2} align="center">
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
            </Flex>
          </Flex>
        ) : (
          <button
            className="btn btn-primary"
            onClick={login}
            disabled={syncStatus === 'linking' || syncStatus === 'syncing'}
          >
            {syncStatus === 'linking' ? 'Connecting...' : 'Sign In with Google'}
          </button>
        )}
      </Flex>

      {/* Workout Program Selector */}
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="program-select" style={{ display: 'block' }}>
          <Heading level={4} style={{ fontSize: '0.95rem', marginBottom: '8px' }}>
            Select Workout Program
          </Heading>
        </label>
        <select
          id="program-select"
          className="input-field"
          value={state.metadata.activeProgramId || 'p90x'}
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

      <Flex direction="column" gap={2}>
        <Heading level={4} color="red" style={{ fontSize: '0.95rem' }}>
          Danger Zone
        </Heading>
        <Text color="secondary" size="0.8rem">
          Wipe all local and cycle logs and reset database to Day 1. This cannot be undone.
        </Text>
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
      </Flex>
    </Card>
  );
};
