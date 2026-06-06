import React, { useState, useEffect, useRef } from 'react';
import { logAnalyticsEvent } from '../services/firebase';
import { Flex, Text, Card } from './ui';

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
    <Card
      style={{
        padding: '16px',
        border:
          secondsLeft > 0 && isActive
            ? '1px solid var(--color-cyan)'
            : '1px solid var(--color-border)',
        boxShadow: secondsLeft > 0 && isActive ? 'var(--shadow-glow-cyan)' : 'var(--shadow-sm)',
        transition: 'all var(--transition-normal)',
      }}
    >
      <Flex justify="between" align="center" style={{ width: '100%' }}>
        <Flex direction="column" gap={1}>
          <Text color="secondary" size="0.8rem" weight="medium">
            ⏱️ Rest Timer
          </Text>
          <Text
            color={secondsLeft > 0 ? 'cyan' : 'muted'}
            size="1.6rem"
            weight="bold"
            style={{ fontFamily: 'monospace' }}
          >
            {formatTime(secondsLeft)}
          </Text>
        </Flex>

        <Flex gap={2} align="center">
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

          <button
            className={`btn ${isActive ? 'btn-secondary' : 'btn-primary'}`}
            onClick={toggleTimer}
            disabled={secondsLeft === 0}
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
          >
            {isActive ? 'Pause' : 'Start'}
          </button>
          <button
            className="btn btn-danger"
            onClick={resetTimer}
            disabled={secondsLeft === 0}
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
          >
            Reset
          </button>
        </Flex>
      </Flex>
    </Card>
  );
};
