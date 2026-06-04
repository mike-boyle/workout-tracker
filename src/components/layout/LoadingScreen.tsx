import React from 'react';

export const LoadingScreen: React.FC = () => {
  return (
    <div
      className="flex flex-col items-center justify-center"
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
      <h3 className="text-primary">Loading Workout Tracker...</h3>
      <p className="text-secondary" style={{ fontSize: '0.9rem', marginTop: '4px' }}>
        Preparing database storage
      </p>
    </div>
  );
};
