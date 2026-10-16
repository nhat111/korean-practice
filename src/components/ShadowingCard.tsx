import { useState } from 'react';
import { vi } from '../i18n/vi';
import { srsKey } from '../practice/decks';
import { isSpeechSupported } from '../speech';
import { usePrefs } from '../storage/prefs';
import type { SelfRating } from '../storage/progress';
import type { ShadowingItem } from '../types';
import { Icon } from './Icon';
import { ReportButton } from './ReportButton';
import { SpeakPractice, SpeedButton } from './SpeakPractice';

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
  const [notesOpen, setNotesOpen] = useState(false);

  return (
    <section className="card stack-sm">
      <div className="card-head">
        <div className="meta">
          <span className="badge">{vi.shadowing.topics[item.topic] ?? item.topic}</span>
          <span className="badge">{vi.shadowing.level(item.level)}</span>
        </div>
        {isSpeechSupported() && <SpeedButton />}
      </div>
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
          <div className="card-tools">
            {item.notes && item.notes.length > 0 ? (
              <button
                type="button"
                className="link-btn small notes-toggle"
                aria-expanded={notesOpen}
                onClick={() => setNotesOpen((o) => !o)}
              >
                <Icon name={notesOpen ? 'chevron-up' : 'chevron-down'} size={16} /> {vi.practice.notes}
              </button>
            ) : (
              <span />
            )}
            <ReportButton reportKey={srsKey.shadowing(item.id)} ko={item.ko} />
          </div>
          {notesOpen && item.notes && (
            <ul className="notes-list">
              {item.notes.map((n) => (
                <li key={n} className="small">
                  {n}
                </li>
              ))}
            </ul>
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
      <SpeakPractice ko={item.ko} source={srsKey.shadowing(item.id)} srsKey={srsKey.shadowing(item.id)} onRated={onRated} noSpeed />
    </section>
  );
}
