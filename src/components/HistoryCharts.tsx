import React, { useState, useMemo } from 'react';
import { useWorkout } from '../contexts/WorkoutContext';
import { workouts, exercises as allExercises } from '../data/schedule';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
  type ChartDataset,
  type TooltipItem,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Flex, Heading, Text, Card } from './ui';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export const HistoryCharts: React.FC = () => {
  const { state, loadCycleLogs } = useWorkout();

  // Load all historical cycles in the background when visiting Analytics
  React.useEffect(() => {
    const loadAllCycles = async () => {
      for (let c = 1; c <= state.metadata.currentCycle; c++) {
        if (state.loadedCycles[c] === undefined && !state.ui.loadingCycles[c]) {
          await loadCycleLogs(c);
        }
      }
    };
    loadAllCycles();
  }, [state.metadata.currentCycle, state.loadedCycles, state.ui.loadingCycles, loadCycleLogs]);

  // Combine logs from all loaded cycles
  const allLogs = useMemo(() => {
    return Object.values(state.loadedCycles).flat();
  }, [state.loadedCycles]);

  // Check if historical data is still loading
  const isHistoryLoading = useMemo(() => {
    for (let c = 1; c <= state.metadata.currentCycle; c++) {
      if (state.loadedCycles[c] === undefined) {
        return true;
      }
    }
    return false;
  }, [state.metadata.currentCycle, state.loadedCycles]);

  // Filter only resistance workouts
  const resistanceWorkouts = useMemo(() => {
    return workouts.filter((w) => w.type === 'resistance');
  }, []);

  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>(
    resistanceWorkouts[0]?.id || ''
  );

  const selectedWorkout = useMemo(() => {
    return resistanceWorkouts.find((w) => w.id === selectedWorkoutId);
  }, [selectedWorkoutId, resistanceWorkouts]);

  // List of exercises in the selected workout
  const exerciseOptions = useMemo(() => {
    if (!selectedWorkout) return [];
    return selectedWorkout.exercises
      .map((exId) => {
        return allExercises.find((e) => e.id === exId);
      })
      .filter((e): e is (typeof allExercises)[0] => !!e);
  }, [selectedWorkout]);

  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');

  // Derive active exercise ID, falling back to the first exercise of the routine if selection is invalid/unset
  const activeExerciseId = useMemo(() => {
    if (selectedExerciseId && exerciseOptions.some((e) => e.id === selectedExerciseId)) {
      return selectedExerciseId;
    }
    return exerciseOptions[0]?.id || '';
  }, [selectedExerciseId, exerciseOptions]);

  const selectedExercise = useMemo(() => {
    return allExercises.find((e) => e.id === activeExerciseId);
  }, [activeExerciseId]);

  const [chartMetric, setChartMetric] = useState<'reps' | 'weight'>('reps');

  // Extract logging data for the selected exercise across all cycles
  const chartDataPoints = useMemo(() => {
    if (!activeExerciseId) return [];

    // Filter logs that have records for this exercise
    return [...allLogs]
      .filter((log) => !log.skipped && log.exercises[activeExerciseId])
      .sort((a, b) => {
        // Sort chronologically
        const progressA = a.cycle * 1000 + a.week * 10 + a.day;
        const progressB = b.cycle * 1000 + b.week * 10 + b.day;
        return progressA - progressB;
      });
  }, [allLogs, activeExerciseId]);

  const hasData = chartDataPoints.length > 0;

  // Set up chart data
  const data = useMemo(() => {
    if (!hasData || !selectedExercise) {
      return { labels: [], datasets: [] };
    }

    const labels = chartDataPoints.map((log) => `C${log.cycle} W${log.week} D${log.day}`);

    const isWeighted = selectedExercise.type === 'weighted';
    const metricLabel = chartMetric === 'weight' && isWeighted ? 'Weight (lbs)' : 'Reps';

    const dataset1 = chartDataPoints.map((log) => {
      const set = log.exercises[activeExerciseId][0];
      return set ? (chartMetric === 'weight' ? set.weight : set.reps) : 0;
    });

    const datasets: ChartDataset<'line'>[] = [
      {
        label: selectedExercise.setCount > 1 ? `${metricLabel} (Set 1)` : metricLabel,
        data: dataset1,
        borderColor: 'hsl(184, 100%, 50%)',
        backgroundColor: 'hsla(184, 100%, 50%, 0.15)',
        tension: 0.15,
        pointBackgroundColor: 'hsl(184, 100%, 50%)',
        pointHoverRadius: 7,
      },
    ];

    if (selectedExercise.setCount > 1) {
      const dataset2 = chartDataPoints.map((log) => {
        const set = log.exercises[activeExerciseId][1];
        return set ? (chartMetric === 'weight' ? set.weight : set.reps) : 0;
      });

      datasets.push({
        label: `${metricLabel} (Set 2)`,
        data: dataset2,
        borderColor: 'hsl(266, 100%, 64%)',
        backgroundColor: 'hsla(266, 100%, 64%, 0.15)',
        tension: 0.15,
        pointBackgroundColor: 'hsl(266, 100%, 64%)',
        pointHoverRadius: 7,
      });
    }

    return { labels, datasets };
  }, [chartDataPoints, selectedExercise, activeExerciseId, chartMetric, hasData]);

  // Chart configuration
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'hsl(0, 0%, 96%)',
          font: {
            family: 'Outfit, sans-serif',
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'hsla(224, 30%, 8%, 0.95)',
        titleColor: 'hsl(0, 0%, 96%)',
        bodyColor: 'hsl(0, 0%, 96%)',
        borderColor: 'hsla(224, 15%, 25%, 0.5)',
        borderWidth: 1,
        titleFont: { family: 'Outfit, sans-serif', weight: 'bold' },
        bodyFont: { family: 'Outfit, sans-serif' },
        callbacks: {
          afterBody: (context: TooltipItem<'line'>[]) => {
            // Include user comments in tooltip
            const dataIndex = context[0].dataIndex;
            const log = chartDataPoints[dataIndex];
            return log && log.comments ? `\nNotes: ${log.comments}` : '';
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'hsla(224, 15%, 25%, 0.15)',
        },
        ticks: {
          color: 'hsl(224, 15%, 70%)',
          font: { family: 'Outfit, sans-serif' },
        },
      },
      y: {
        grid: {
          color: 'hsla(224, 15%, 25%, 0.15)',
        },
        ticks: {
          color: 'hsl(224, 15%, 70%)',
          font: { family: 'Outfit, sans-serif' },
        },
        suggestedMin: 0,
      },
    },
  };

  const isWeightedExercise = selectedExercise?.type === 'weighted';

  return (
    <Card className="animate-fade-in" style={{ padding: '24px' }}>
      <Flex direction="column" gap={6}>
        <Heading level={2}>Strength & Progression Analytics</Heading>

        {/* Dropdowns */}
        <Flex gap={4} wrap="wrap">
          <div className="input-group" style={{ flex: '1 1 200px' }}>
            <label className="input-label">Select Workout Routine</label>
            <select
              className="input-field"
              value={selectedWorkoutId}
              onChange={(e) => setSelectedWorkoutId(e.target.value)}
            >
              {resistanceWorkouts.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group" style={{ flex: '1 1 250px' }}>
            <label className="input-label">Select Exercise</label>
            <select
              className="input-field"
              value={activeExerciseId}
              onChange={(e) => setSelectedExerciseId(e.target.value)}
              disabled={exerciseOptions.length === 0}
            >
              {exerciseOptions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        </Flex>

        {/* Metric Toggle for weighted exercise */}
        {isWeightedExercise && hasData && (
          <Flex gap={2} align="center" style={{ alignSelf: 'flex-start' }}>
            <button
              className={`btn ${chartMetric === 'reps' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setChartMetric('reps')}
              style={{ padding: '6px 14px', fontSize: '0.85rem' }}
            >
              Reps Graph
            </button>
            <button
              className={`btn ${chartMetric === 'weight' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setChartMetric('weight')}
              style={{ padding: '6px 14px', fontSize: '0.85rem' }}
            >
              Weight Graph
            </button>
          </Flex>
        )}

        {/* Line Chart Grid */}
        <div style={{ height: '350px', position: 'relative', width: '100%' }}>
          {isHistoryLoading ? (
            <Flex
              direction="column"
              align="center"
              justify="center"
              gap={3}
              style={{ height: '100%' }}
              className="text-secondary"
            >
              <div
                className="animate-spin"
                style={{
                  border: '3px solid hsla(var(--hue-base), 15%, 25%, 0.2)',
                  borderTop: '3px solid var(--color-cyan)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  margin: '0 auto 12px auto',
                }}
              />
              <Text weight="medium">Loading progression analytics...</Text>
            </Flex>
          ) : hasData ? (
            <Line data={data} options={options} />
          ) : (
            <Flex
              direction="column"
              align="center"
              justify="center"
              gap={2}
              style={{
                height: '100%',
                border: '1px dashed var(--color-border)',
                borderRadius: '12px',
              }}
              className="text-muted"
            >
              <Text size="2.5rem" style={{ marginBottom: '8px' }}>
                📈
              </Text>
              <Text weight="medium">No workout data logged yet</Text>
              <Text
                size="sm"
                style={{
                  maxWidth: '300px',
                  textAlign: 'center',
                  marginTop: '4px',
                }}
              >
                Complete the "{selectedWorkout?.name}" routine on the Dashboard to generate charts.
              </Text>
            </Flex>
          )}
        </div>
      </Flex>
    </Card>
  );
};
