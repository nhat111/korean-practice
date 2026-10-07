import { useEffect, useState } from 'react';
import { vi } from '../i18n/vi';
import { speakKorean } from '../speech';
import { Icon } from './Icon';

const SLOW_RATE = 0.75;

/** Plays the line at natural speed on mount; buttons replay it normally or slowly. */
export function ListenPlayer({ ko }: { ko: string }) {
  const [plays, setPlays] = useState(0);
  useEffect(() => {
    void speakKorean(ko, 1);
  }, [ko]);

  function play(rate: number) {
    setPlays((p) => p + 1);
    void speakKorean(ko, rate);
  }

  return (
    <div className="listen-player">
      <button type="button" className="listen-play" onClick={() => play(1)} aria-label={vi.listening.play}>
        <Icon name="headphones" size={30} />
      </button>
      <div className="stack-xs">
        <button type="button" className="chip" onClick={() => play(SLOW_RATE)}>
          {vi.listening.slow}
        </button>
        <span className="muted small">{plays > 0 ? vi.listening.replays(plays) : vi.listening.playHint}</span>
      </div>
    </div>
  );
}
