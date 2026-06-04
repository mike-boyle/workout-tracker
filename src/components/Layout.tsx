import React, { useState } from 'react';
import { useWorkout } from '../contexts/WorkoutContext';
import { LoadingScreen } from './layout/LoadingScreen';
import { SyncBadge } from './layout/SyncBadge';
import { SettingsPanel } from './layout/SettingsPanel';
import { Flex, Text } from './ui';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'dashboard' | 'history' | 'analytics';
  setActiveTab: (tab: 'dashboard' | 'history' | 'analytics') => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { state } = useWorkout();
  const [showSettings, setShowSettings] = useState(false);

  if (state.loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="app-container">
      <header>
        <Flex justify="between" align="center" style={{ width: '100%', height: '100%' }}>
          <div className="logo-section">
            <span className="logo-text">Workout Tracker</span>
            <Text variant="p" color="secondary" size="0.8rem" style={{ marginTop: '2px' }}>
              Cycle {state.currentCycle} • Week {state.currentWeek} • Day {state.currentDay}
            </Text>
          </div>

          <nav>
            <Flex gap={2} align="center">
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

              <SyncBadge />

              <button
                className="btn btn-secondary"
                onClick={() => setShowSettings(!showSettings)}
                style={{ padding: '8px' }}
                title="Settings & Backups"
              >
                ⚙️
              </button>
            </Flex>
          </nav>
        </Flex>
      </header>

      {showSettings && <SettingsPanel />}

      <main>{children}</main>

      <footer
        style={{
          padding: '32px 0',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <Flex direction="column" align="center" justify="center" gap={2}>
          <Text color="muted" size="sm" style={{ textAlign: 'center' }}>
            Workout Tracker • Keep pushing play, do your best, and forget the rest!
          </Text>
          <Text color="muted" size="sm">
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
          </Text>
        </Flex>
      </footer>
    </div>
  );
};
