import { useState } from 'react';
import { vi } from '../i18n/vi';
import { srsKey } from '../practice/decks';
import { isSpeechSupported, speakKorean } from '../speech';
import { usePrefs } from '../storage/prefs';
import type { SelfRating } from '../storage/progress';
import type { ShadowingItem } from '../types';
import { ReportButton } from './ReportButton';
import { SpeakPractice } from './SpeakPractice';

/** One shadowing sentence: listen (repeat), read the real pronunciation, record, compare, rate. */
export function ShadowingCard({
  item,
  hideText,
  onRated,
}: {
  item: ShadowingItem;
  /** Listening-only mode: the sentence stays hidden until revealed. */
  hideText?: boolean;
  onRated?: (rating: SelfRating) => void;
}) {
  const { showPron } = usePrefs();
  const [shown, setShown] = useState(!hideText);

  return (
    <section className="card stack-sm">
      <div className="meta">
        <span className="badge">{vi.shadowing.topics[item.topic] ?? item.topic}</span>
        <span className="badge">{vi.shadowing.level(item.level)}</span>
      </div>
      {isSpeechSupported() && (
        <button type="button" className="btn listen-btn" onClick={() => void speakKorean(item.ko)}>
          {vi.speaking.listen}
        </button>
      )}
      {shown ? (
        <div className="stack-xs">
          <p lang="ko" className="drill-line">
            {item.ko}
          </p>
          {showPron && (
            <p lang="ko" className="pron" aria-label={vi.practice.pron}>
              {item.pron}
            </p>
          )}
          <p className="muted">{item.vi}</p>
          <ReportButton reportKey={srsKey.shadowing(item.id)} ko={item.ko} />
          {item.notes && item.notes.length > 0 && (
            <details className="notes">
              <summary>{vi.practice.notes}</summary>
              <ul>
                {item.notes.map((n) => (
                  <li key={n} className="small">
                    {n}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      ) : (
        <div className="stack-xs">
          <p className="muted small">{vi.practice.hiddenText}</p>
          <button type="button" className="link-btn" onClick={() => setShown(true)}>
            {vi.practice.reveal}
          </button>
        </div>
      )}
      <SpeakPractice ko={item.ko} source={srsKey.shadowing(item.id)} srsKey={srsKey.shadowing(item.id)} onRated={onRated} />
    </section>
  );
}
