import { useEffect, useState } from 'react';
import { vi } from '../i18n/vi';
import { speakKorean } from '../speech';
import { getPrefs, LISTEN_RATES, setListenRate, useListenRate, type ListenRate } from '../storage/prefs';
import { Icon } from './Icon';

/** Listening speed; each tap moves to the next of 0.75 / 0.85 / 1 / 1.15x and is remembered. */
export function ListenSpeedButton({ onChange }: { onChange?: (rate: ListenRate) => void }) {
  const rate = useListenRate();
  const next = LISTEN_RATES[(LISTEN_RATES.indexOf(rate) + 1) % LISTEN_RATES.length];
  return (
    <button
      type="button"
      className="chip speed-chip"
      aria-label={`${vi.listening.speed}: ${rate}x`}
      onClick={() => {
        setListenRate(next);
        onChange?.(next);
      }}
    >
      <Icon name="gauge" size={16} /> {rate}x
    </button>
  );
}

/** Plays the line on mount at the listening speed; tap to replay, the chip changes the speed. */
export function ListenPlayer({ ko }: { ko: string }) {
  const [plays, setPlays] = useState(0);
  useEffect(() => {
    void speakKorean(ko, getPrefs().listenRate);
  }, [ko]);

  function play(rate: number) {
    setPlays((p) => p + 1);
    void speakKorean(ko, rate);
  }

  return (
    <div className="listen-player">
      <button
        type="button"
        className="listen-play"
        onClick={() => play(getPrefs().listenRate)}
        aria-label={vi.listening.play}
      >
        <Icon name="headphones" size={30} />
      </button>
      <div className="stack-xs">
        <ListenSpeedButton onChange={play} />
        <span className="muted small">{plays > 0 ? vi.listening.replays(plays) : vi.listening.playHint}</span>
      </div>
    </div>
  );
}
