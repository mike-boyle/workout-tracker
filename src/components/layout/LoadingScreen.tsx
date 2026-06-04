import React from 'react';
import { Flex, Heading, Text } from '../ui';

export const LoadingScreen: React.FC = () => {
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      style={{
        height: '100vh',
        background: 'var(--color-bg-base)',
        fontFamily: 'Outfit, sans-serif',
      }}
    >
      <div
        className="animate-spin"
        style={{
          border: '4px solid hsla(var(--hue-base), 15%, 25%, 0.2)',
          borderTop: '4px solid var(--color-cyan)',
          borderRadius: '50%',
          width: '48px',
          height: '48px',
          marginBottom: '16px',
        }}
      />
      <Heading level={3} color="primary">
        Loading Workout Tracker...
      </Heading>
      <Text variant="p" color="secondary" size="sm" style={{ marginTop: '4px' }}>
        Preparing database storage
      </Text>
    </Flex>
  );
};
