import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { vi } from '../i18n/vi';
import type { VocabItem } from '../types';
import { Icon } from './Icon';
import { KoreanLine, SpeakButton } from './SpeakButton';

/** How long each word stays before the next one. */
const ROTATE_MS = 5000;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * "Từ vựng hôm nay": shows the day's words one after another. Rotation stops while the mouse is
 * over the card, while the tab is hidden, after any tap inside it (so a word being read or
 * listened to stays), and from the start under prefers-reduced-motion. A button resumes it.
 */
export function WordRotator({ words }: { words: VocabItem[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(prefersReducedMotion);
  const [hold, setHold] = useState(false);
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden);
  const running = !paused && !hold && !hidden && words.length > 1;

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % words.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, [running, words.length]);

  const word = words[index % words.length];
  if (!word) return null;

  function go(step: number) {
    setIndex((i) => (i + step + words.length) % words.length);
    setPaused(true);
  }

  return (
    <section
      className="card stack-sm word-card"
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
    >
      <div className="row-between">
        <span className="eyebrow">{vi.home.wordTitle}</span>
        {words.length > 1 && (
          <span className="mono small muted">
            {index + 1}/{words.length}
          </span>
        )}
      </div>
      {/* A tap on the word (e.g. its speak button) keeps it on screen. */}
      <div key={word.id} className="word-slide stack-sm" onPointerDown={() => setPaused(true)} aria-live={running ? 'off' : 'polite'}>
        <div className="row-between">
          <div className="stack-xs">
            <strong className="word-ko" lang="ko">
              {word.ko}
            </strong>
            {word.pron && (
              <span className="muted small" lang="ko">
                {word.pron}
              </span>
            )}
          </div>
          <SpeakButton text={word.ko} />
        </div>
        <p>{word.vi}</p>
        <KoreanLine text={word.example.ko} className="ko word-example" />
        <p className="muted small word-example">{word.example.vi}</p>
      </div>
      <div className="row-between">
        <Link to="/flashcards" className="link-btn small">
          {vi.home.wordMore}
        </Link>
        {words.length > 1 && (
          <div className="row word-controls">
            <button type="button" className="icon-btn icon-btn--small" onClick={() => go(-1)} aria-label={vi.home.wordPrev} title={vi.home.wordPrev}>
              <Icon name="chevron-left" size={18} />
            </button>
            <button
              type="button"
              className="icon-btn icon-btn--small"
              onClick={() => {
                // Resuming with the mouse still over the card should start right away.
                setHold(false);
                setPaused((p) => !p);
              }}
              aria-label={paused ? vi.home.wordPlay : vi.home.wordPause}
              title={paused ? vi.home.wordPlay : vi.home.wordPause}
            >
              <Icon name={paused ? 'play' : 'pause'} size={16} />
            </button>
            <button type="button" className="icon-btn icon-btn--small" onClick={() => go(1)} aria-label={vi.home.wordNext} title={vi.home.wordNext}>
              <Icon name="chevron-right" size={18} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
