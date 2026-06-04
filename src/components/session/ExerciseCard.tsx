import React from 'react';
import type { ExerciseInfo, SetLog } from '../../types';
import { Flex, Heading, Text, Card } from '../ui';

interface ExerciseCardProps {
  exInfo: ExerciseInfo;
  idx: number;
  sets: SetLog[];
  handleInputChange: (
    exerciseId: string,
    setIndex: number,
    field: keyof SetLog,
    value: string | number | boolean
  ) => void;
  getPreviousLog: (exerciseId: string, setIndex: number) => SetLog | null;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exInfo,
  idx,
  sets,
  handleInputChange,
  getPreviousLog,
}) => {
  const isWeighted = exInfo.type === 'weighted';

  return (
    <Card style={{ padding: '16px' }}>
      <Flex justify="between" align="start" style={{ marginBottom: '12px' }}>
        <div>
          <Heading level={3} style={{ fontSize: '1.1rem', fontWeight: '600' }}>
            {idx + 1}. {exInfo.name}
          </Heading>
          <Text color="muted" size="xs" style={{ textTransform: 'uppercase' }}>
            {exInfo.type}
          </Text>
        </div>
      </Flex>

      {/* Header Row */}
      <div
        className={`compact-set-row ${isWeighted ? 'weighted' : 'bodyweight'}`}
        style={{
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: '4px',
          marginBottom: '4px',
        }}
      >
        <Text color="secondary" size="xs" weight="semibold">
          Set
        </Text>
        <Text color="secondary" size="xs" weight="semibold">
          Previous
        </Text>
        {isWeighted && (
          <Text color="secondary" size="xs" weight="semibold">
            Weight
          </Text>
        )}
        <Text color="secondary" size="xs" weight="semibold">
          Reps
        </Text>
        <Text color="secondary" size="xs" weight="semibold">
          Style
        </Text>
      </div>

      {/* Set Rows */}
      <Flex direction="column">
        {sets.map((set, setIdx) => {
          const prevLog = getPreviousLog(exInfo.id, setIdx);

          return (
            <div
              key={setIdx}
              className={`compact-set-row ${isWeighted ? 'weighted' : 'bodyweight'}`}
            >
              <Text color="secondary" size="sm" weight="medium">
                {setIdx + 1}
              </Text>

              <Text color="muted" size="sm">
                {prevLog ? (
                  <>
                    {prevLog.weight > 0 ? `${prevLog.weight} lbs x ` : ''}
                    {prevLog.reps} reps
                    {prevLog.assisted ? (isWeighted ? ' (Wtd)' : ' (Asst)') : ''}
                  </>
                ) : (
                  '--'
                )}
              </Text>

              {isWeighted && (
                <input
                  type="number"
                  className="input-field-compact"
                  value={set.weight || ''}
                  placeholder="0"
                  onChange={(e) => handleInputChange(exInfo.id, setIdx, 'weight', e.target.value)}
                />
              )}

              <input
                type="number"
                className="input-field-compact"
                value={set.reps || ''}
                placeholder="0"
                onChange={(e) => handleInputChange(exInfo.id, setIdx, 'reps', e.target.value)}
              />

              <Flex align="center">
                <label
                  className="flex items-center gap-2"
                  style={{
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={set.assisted}
                    onChange={(e) =>
                      handleInputChange(exInfo.id, setIdx, 'assisted', e.target.checked)
                    }
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <Text color="secondary" size="xs">
                    {isWeighted ? 'Weighted' : 'Assisted'}
                  </Text>
                </label>
              </Flex>
            </div>
          );
        })}
      </Flex>
    </Card>
  );
};
