import React from 'react';
import { Flex, Heading, Text, Card } from '../ui';

interface RestDayViewProps {
  selectedWeek: number;
  selectedDay: number;
  onComplete: () => void;
  onBack: () => void;
}

export const RestDayView: React.FC<RestDayViewProps> = ({
  selectedWeek,
  selectedDay,
  onComplete,
  onBack,
}) => {
  return (
    <Card style={{ padding: '32px', textAlign: 'center' }}>
      <Heading level={2} style={{ marginBottom: '16px' }}>
        Rest Day
      </Heading>
      <Text variant="p" color="secondary" style={{ marginBottom: '24px' }}>
        No formal workout scheduled for Week {selectedWeek} Day {selectedDay}. Rest, stretch, or do
        some light activity.
      </Text>
      <Flex justify="center" gap={4}>
        <button className="btn btn-primary" onClick={onComplete}>
          Mark Completed
        </button>
        <button className="btn btn-secondary" onClick={onBack}>
          Back to Dashboard
        </button>
      </Flex>
    </Card>
  );
};
