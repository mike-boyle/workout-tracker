import React from 'react';
import { ExerciseCard } from './ExerciseCard';
import { exercises as allExercises } from '../../data/schedule';
import type { WorkoutInfo, SetLog } from '../../types';
import { Flex } from '../ui';

interface ResistanceSheetViewProps {
  workoutDef: WorkoutInfo;
  formData: { [exerciseId: string]: SetLog[] };
  handleInputChange: (
    exerciseId: string,
    setIndex: number,
    field: keyof SetLog,
    value: string | number | boolean
  ) => void;
  getPreviousLog: (exerciseId: string, setIndex: number) => SetLog | null;
}

export const ResistanceSheetView: React.FC<ResistanceSheetViewProps> = ({
  workoutDef,
  formData,
  handleInputChange,
  getPreviousLog,
}) => {
  return (
    <Flex direction="column" gap={4}>
      {workoutDef.exercises.map((exId, idx) => {
        const exInfo = allExercises.find((e) => e.id === exId);
        if (!exInfo) return null;

        const sets = formData[exId] || [];

        return (
          <ExerciseCard
            key={exId}
            exInfo={exInfo}
            idx={idx}
            sets={sets}
            handleInputChange={handleInputChange}
            getPreviousLog={getPreviousLog}
          />
        );
      })}
    </Flex>
  );
};
