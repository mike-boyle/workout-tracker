import { useState, useEffect } from 'react';
import { WorkoutProvider, useWorkout } from './contexts/WorkoutContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { WorkoutSession } from './components/WorkoutSession';
import { HistoryCharts } from './components/HistoryCharts';
import { History } from './components/History';
import { ErrorBoundary } from './components/ErrorBoundary';
import { logAnalyticsEvent } from './services/firebase';

function AppContent() {
  const { state, setSelectedDay } = useWorkout();
  const [currentHash, setCurrentHash] = useState(() => window.location.hash || '#/dashboard');

  // Track screen views in Google Analytics when currentHash or selected day context changes
  useEffect(() => {
    let screenName = 'dashboard';
    if (currentHash.startsWith('#/session')) {
      screenName = 'workout_session';
    } else if (currentHash === '#/analytics') {
      screenName = 'analytics';
    } else if (currentHash.startsWith('#/history')) {
      screenName = 'history';
    }

    logAnalyticsEvent('screen_view', {
      screen_name: screenName,
      cycle: state.ui.selectedCycle,
      week: state.ui.selectedWeek,
      day: state.ui.selectedDay,
      program_id: state.metadata.activeProgramId || 'unknown',
    });
  }, [
    currentHash,
    state.ui.selectedCycle,
    state.ui.selectedWeek,
    state.ui.selectedDay,
    state.metadata.activeProgramId,
  ]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;

      if (!hash || hash === '#/dashboard' || hash.startsWith('#/dashboard/')) {
        const match = hash.match(/^#\/dashboard\/cycle\/(\d+)$/);
        if (match) {
          const cycle = parseInt(match[1], 10);
          if (cycle >= 1 && cycle <= state.metadata.currentCycle) {
            if (state.ui.selectedCycle !== cycle) {
              setSelectedDay(state.ui.selectedWeek, state.ui.selectedDay, cycle);
            }
            setCurrentHash(hash);
            return;
          }
        }
        // Fallback to active cycle dashboard if hash is just #/dashboard
        const defaultHash = `#/dashboard/cycle/${state.metadata.currentCycle}`;
        if (window.location.hash !== defaultHash) {
          window.location.hash = defaultHash;
        }
        setCurrentHash(defaultHash);
      } else if (hash === '#/analytics') {
        setCurrentHash('#/analytics');
      } else if (hash === '#/history' || hash.startsWith('#/history/')) {
        const match = hash.match(/^#\/history\/cycle\/(\d+)$/);
        if (match) {
          const cycle = parseInt(match[1], 10);
          if (cycle >= 1 && cycle <= state.metadata.currentCycle) {
            if (state.ui.selectedCycle !== cycle) {
              setSelectedDay(state.ui.selectedWeek, state.ui.selectedDay, cycle);
            }
            setCurrentHash(hash);
            return;
          }
        }
        setCurrentHash('#/history');
      } else if (hash.startsWith('#/session/')) {
        // Parse format: #/session/cycle/:cycle/week/:week/day/:day
        const match = hash.match(/^#\/session\/cycle\/(\d+)\/week\/(\d+)\/day\/(\d+)$/);
        if (match) {
          const cycle = parseInt(match[1], 10);
          const week = parseInt(match[2], 10);
          const day = parseInt(match[3], 10);

          if (
            cycle >= 1 &&
            cycle <= state.metadata.currentCycle &&
            week >= 1 &&
            week <= 13 &&
            day >= 1 &&
            day <= 7
          ) {
            if (
              state.ui.selectedCycle !== cycle ||
              state.ui.selectedWeek !== week ||
              state.ui.selectedDay !== day
            ) {
              setSelectedDay(week, day, cycle);
            }
            setCurrentHash(hash);
            return;
          }
        }
        window.location.hash = `#/dashboard/cycle/${state.metadata.currentCycle}`;
      } else {
        window.location.hash = `#/dashboard/cycle/${state.metadata.currentCycle}`;
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [
    setSelectedDay,
    state.metadata.currentCycle,
    state.ui.selectedCycle,
    state.ui.selectedWeek,
    state.ui.selectedDay,
  ]);

  const activeTab =
    currentHash === '#/analytics'
      ? 'analytics'
      : currentHash === '#/history' || currentHash.startsWith('#/history/')
        ? 'history'
        : 'dashboard';

  const handleTabChange = (tab: 'dashboard' | 'history' | 'analytics') => {
    if (tab === 'analytics') {
      window.location.hash = '#/analytics';
    } else if (tab === 'history') {
      window.location.hash = '#/history';
    } else {
      window.location.hash = `#/dashboard/cycle/${state.ui.selectedCycle}`;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={handleTabChange}>
      {currentHash.startsWith('#/dashboard') && <Dashboard />}
      {currentHash.startsWith('#/session') && <WorkoutSession />}
      {currentHash === '#/analytics' && <HistoryCharts />}
      {(currentHash === '#/history' || currentHash.startsWith('#/history/')) && <History />}
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <WorkoutProvider>
        <AppContent />
      </WorkoutProvider>
    </ErrorBoundary>
  );
}

export default App;
