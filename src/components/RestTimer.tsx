import React, { useState, useEffect, useRef } from 'react';
import { logAnalyticsEvent } from '../services/firebase';

export const RestTimer: React.FC = () => {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Play a simple synthesized beep using browser Web Audio API (no external file dependencies)
  const triggerBuzzer = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Tone 1
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);

      // Tone 2 (slightly delayed)
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1200, ctx.currentTime); // higher note
        gain2.gain.setValueAtTime(0.08, ctx.currentTime);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.25);
      }, 180);
    } catch (e) {
      console.warn('Web Audio beep blocked or unsupported:', e);
    }
  };

  useEffect(() => {
    if (isActive && secondsLeft > 0) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsActive(false);
            triggerBuzzer();
            logAnalyticsEvent('timer_complete');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isActive, secondsLeft]);

  const addTime = (secs: number) => {
    logAnalyticsEvent('timer_add_time', { seconds_added: secs });
    setSecondsLeft((prev) => prev + secs);
    setIsActive(true);
  };

  const toggleTimer = () => {
    if (isActive) {
      logAnalyticsEvent('timer_pause');
    } else {
      logAnalyticsEvent('timer_start');
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    logAnalyticsEvent('timer_reset');
    setSecondsLeft(0);
    setIsActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div
      className="glass-panel"
      style={{
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        border:
          secondsLeft > 0 && isActive
            ? '1px solid var(--color-cyan)'
            : '1px solid var(--color-border)',
        boxShadow: secondsLeft > 0 && isActive ? 'var(--shadow-glow-cyan)' : 'var(--shadow-sm)',
        transition: 'all var(--transition-normal)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span
          style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: '500' }}
        >
          ⏱️ Rest Timer
        </span>
        <span
          style={{
            fontSize: '1.6rem',
            fontWeight: '700',
            fontFamily: 'monospace',
            color: secondsLeft > 0 ? 'var(--color-cyan)' : 'var(--color-text-muted)',
          }}
        >
          {formatTime(secondsLeft)}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          className="btn btn-secondary"
          onClick={() => addTime(30)}
          style={{ padding: '6px 12px', fontSize: '0.85rem' }}
        >
          +30s
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => addTime(60)}
          style={{ padding: '6px 12px', fontSize: '0.85rem' }}
        >
          +60s
        </button>

        {secondsLeft > 0 && (
          <>
            <button
              className={`btn ${isActive ? 'btn-secondary' : 'btn-primary'}`}
              onClick={toggleTimer}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              {isActive ? 'Pause' : 'Start'}
            </button>
            <button
              className="btn btn-danger"
              onClick={resetTimer}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              Reset
            </button>
          </>
        )}
      </div>
    </div>
  );
};
