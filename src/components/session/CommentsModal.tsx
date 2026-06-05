import React, { useState } from 'react';
import { Flex, Heading, Text, Card } from '../ui';

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  comments: string;
  onSave: (comments: string) => void;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({
  isOpen,
  onClose,
  comments,
  onSave,
}) => {
  const [tempComments, setTempComments] = useState<string>(comments);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out forwards',
      }}
      onClick={onClose}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: '500px',
          background: 'var(--color-bg-modal)',
          padding: '24px',
          boxShadow: 'var(--shadow-lg)',
          animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Flex direction="column" gap={6}>
          <div>
            <Heading level={3} color="primary" style={{ fontSize: '1.25rem', marginBottom: '6px' }}>
              Workout Comments / Notes
            </Heading>
            <Text variant="p" color="secondary" size="sm">
              Add details about how the workout felt, changes in weight/reps, or general notes.
            </Text>
          </div>

          <div className="input-group">
            <textarea
              className="input-field"
              rows={5}
              placeholder="e.g. standard pushups felt easier today, increased curl weight..."
              value={tempComments}
              onChange={(e) => setTempComments(e.target.value)}
              style={{ resize: 'vertical' }}
              autoFocus
            />
          </div>

          <Flex gap={4} justify="end">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onSave(tempComments);
                onClose();
              }}
            >
              Save Comment
            </button>
          </Flex>
        </Flex>
      </Card>
    </div>
  );
};
