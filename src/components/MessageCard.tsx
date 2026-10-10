import { useState } from 'react';
import { vi } from '../i18n/vi';
import { gradeFor, srsKey } from '../practice/decks';
import { markPhrases, phraseUsed } from '../practice/messages';
import { review, todayKey } from '../srs/sm2';
import { getProgressSnapshot, saveReview, type SelfRating } from '../storage/progress';
import type { MessageExercise } from '../types';
import { ReportButton } from './ReportButton';
import { SpeakButton } from './SpeakButton';
import { RatingButtons } from './SpeakPractice';

/**
 * Write a chat message for a situation, then compare with the model and self-rate
 * into the SRS (message:<id>). `onNext` adds a "next" button after rating.
 */
export function MessageCard({
  item,
  onRated,
  onNext,
}: {
  item: MessageExercise;
  onRated?: () => void;
  onNext?: () => void;
}) {
  const [text, setText] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [rating, setRating] = useState<SelfRating | null>(null);

  function rate(r: SelfRating) {
    setRating(r);
    const key = srsKey.message(item.id);
    saveReview(key, review(getProgressSnapshot().srs[key], gradeFor(r), todayKey()));
    onRated?.();
  }

  return (
    <section className="card stack-sm">
      <div className="stack-xs">
        <span className="muted small">{vi.messages.to}</span>
        <strong>{item.to}</strong>
      </div>
      <div className="stack-xs">
        <span className="muted small">{vi.messages.situation}</span>
        <p>{item.situation}</p>
      </div>
      {!revealed ? (
        <>
          <textarea
            lang="ko"
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={vi.messages.placeholder}
            aria-label={vi.messages.yours}
          />
          <button type="button" className="btn" onClick={() => setRevealed(true)}>
            {vi.messages.reveal}
          </button>
        </>
      ) : (
        <>
          {text.trim() && (
            <div className="stack-xs">
              <span className="muted small">{vi.messages.yours}</span>
              <p className="email-text" lang="ko">
                {text}
              </p>
            </div>
          )}
          <div className="stack-xs">
            <div className="row-between">
              <span className="muted small">{vi.messages.model}</span>
              <SpeakButton text={item.model} small />
            </div>
            <p className="email-text email-text--ok" lang="ko">
              {markPhrases(item.model, item.phrases).map((p, i) =>
                p.phrase === null ? <span key={i}>{p.text}</span> : <mark key={i}>{p.text}</mark>,
              )}
            </p>
          </div>
          <div className="stack-xs">
            <span className="muted small">{vi.messages.phrases}</span>
            <ul className="phrase-list">
              {item.phrases.map((p) => {
                const used = text.trim() !== '' && phraseUsed(text, p.ko);
                return (
                  <li key={p.ko} className={used ? 'phrase phrase--used' : 'phrase'}>
                    <span className="phrase-mark" aria-label={used ? vi.messages.used : vi.messages.notUsed}>
                      {used ? '✓' : '·'}
                    </span>
                    <span>
                      <span lang="ko">{p.ko}</span>
                      <span className="muted small"> – {p.vi}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          {item.note && <p className="muted small">{item.note}</p>}
          <ReportButton reportKey={srsKey.message(item.id)} ko={item.model} />
          <p className="muted small">{vi.messages.rateTitle}</p>
          <RatingButtons selected={rating} onRate={rate} />
          {rating && onNext && (
            <button type="button" className="btn" onClick={onNext}>
              {vi.messages.next}
            </button>
          )}
        </>
      )}
    </section>
  );
}
