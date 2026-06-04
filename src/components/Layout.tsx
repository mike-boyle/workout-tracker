import React, { useState } from 'react';
import { useWorkout } from '../contexts/WorkoutContext';
import { LoadingScreen } from './layout/LoadingScreen';
import { SyncBadge } from './layout/SyncBadge';
import { SettingsPanel } from './layout/SettingsPanel';

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
      <header className="flex justify-between items-center">
        <div className="logo-section">
          <span className="logo-text">Workout Tracker</span>
          <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '2px' }}>
            Cycle {state.currentCycle} • Week {state.currentWeek} • Day {state.currentDay}
          </p>
        </div>

        <nav className="flex gap-2">
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
        </nav>
      </header>

      {showSettings && <SettingsPanel />}

      <main>{children}</main>

      <footer
        className="text-muted"
        style={{
          textAlign: 'center',
          padding: '32px 0',
          borderTop: '1px solid var(--color-border)',
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
