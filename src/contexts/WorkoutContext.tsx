import { createContext, useContext } from 'react';
import type { ExtendedState, WorkoutAction, WorkoutContextType } from './workoutTypes';

export type { ExtendedState, WorkoutAction, WorkoutContextType };

export const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export const useWorkout = () => {
  const context = useContext(WorkoutContext);
  if (context === undefined) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
};
