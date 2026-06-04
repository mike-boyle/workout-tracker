import React from 'react';
import type { ExerciseInfo, SetLog } from '../../types';

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
    <div className="glass-panel" style={{ padding: '16px' }}>
      <div className="flex justify-between items-start" style={{ marginBottom: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>
            {idx + 1}. {exInfo.name}
          </h3>
          <span className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
            {exInfo.type}
          </span>
        </div>
      </div>

      {/* Header Row */}
      <div
        className={`compact-set-row ${isWeighted ? 'weighted' : 'bodyweight'}`}
        style={{
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: '4px',
          marginBottom: '4px',
        }}
      >
        <span className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: '600' }}>
          Set
        </span>
        <span className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: '600' }}>
          Previous
        </span>
        {isWeighted && (
          <span className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: '600' }}>
            Weight
          </span>
        )}
        <span className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: '600' }}>
          Reps
        </span>
        <span className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: '600' }}>
          Style
        </span>
      </div>

      {/* Set Rows */}
      <div className="flex flex-col">
        {sets.map((set, setIdx) => {
          const prevLog = getPreviousLog(exInfo.id, setIdx);

          return (
            <div
              key={setIdx}
              className={`compact-set-row ${isWeighted ? 'weighted' : 'bodyweight'}`}
            >
              <span className="text-secondary" style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                {setIdx + 1}
              </span>

              <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                {prevLog ? (
                  <>
                    {prevLog.weight > 0 ? `${prevLog.weight} lbs x ` : ''}
                    {prevLog.reps} reps
                    {prevLog.assisted ? (isWeighted ? ' (Wtd)' : ' (Asst)') : ''}
                  </>
                ) : (
                  '--'
                )}
              </span>

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

              <div className="flex items-center">
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
                  <span className="text-secondary" style={{ fontSize: '0.8rem' }}>
                    {isWeighted ? 'Weighted' : 'Assisted'}
                  </span>
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
