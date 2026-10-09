import { useState } from 'react';
import { ContentGate } from '../components/ContentGate';
import { ReportButton } from '../components/ReportButton';
import { SpeakButton } from '../components/SpeakButton';
import { RatingButtons } from '../components/SpeakPractice';
import { useContent } from '../data/content';
import { vi } from '../i18n/vi';
import { gradeFor, MESSAGE_TOPICS, srsKey } from '../practice/decks';
import { markPhrases, phraseUsed } from '../practice/messages';
import { pickKeys } from '../practice/plan';
import { review, todayKey } from '../srs/sm2';
import { getProgressSnapshot, saveReview, type SelfRating } from '../storage/progress';
import type { MessageExercise } from '../types';

export function MessagesPage() {
  const state = useContent('messages');
  return (
    <div className="stack">
      <h1>{vi.messages.title}</h1>
      <p className="muted">{vi.messages.intro}</p>
      <ContentGate state={state}>{(items) => <MessageDeck items={items} />}</ContentGate>
    </div>
  );
}

/** Due exercises first, then new ones, then the rest (same order as the daily plan). */
function ordered(items: MessageExercise[]): MessageExercise[] {
  const byKey = new Map(items.map((m) => [srsKey.message(m.id), m]));
  return pickKeys([...byKey.keys()], getProgressSnapshot().srs, todayKey(), byKey.size).flatMap((k) => byKey.get(k) ?? []);
}

function MessageDeck({ items }: { items: MessageExercise[] }) {
  const [topic, setTopic] = useState('');
  const [list, setList] = useState(() => ordered(items));
  const [index, setIndex] = useState(0);

  function pickTopic(t: string) {
    setTopic(t);
    setList(ordered(t ? items.filter((m) => m.topic === t) : items));
    setIndex(0);
  }

  const current = list[index];
  return (
    <>
      <select className="select" value={topic} onChange={(e) => pickTopic(e.target.value)} aria-label={vi.messages.title}>
        <option value="">{vi.messages.allTopics(items.length)}</option>
        {MESSAGE_TOPICS.filter((t) => items.some((m) => m.topic === t)).map((t) => (
          <option key={t} value={t}>
            {vi.messages.topics[t]} ({items.filter((m) => m.topic === t).length})
          </option>
        ))}
      </select>
      {current ? (
        <>
          <span className="muted small">{vi.messages.progress(index + 1, list.length)}</span>
          <MessageCard key={current.id} item={current} onNext={() => setIndex((i) => i + 1)} />
        </>
      ) : (
        <section className="card center stack-sm">
          <p>{vi.messages.done}</p>
          <button type="button" className="btn" onClick={() => pickTopic(topic)}>
            {vi.messages.restart}
          </button>
        </section>
      )}
    </>
  );
}

function MessageCard({ item, onNext }: { item: MessageExercise; onNext: () => void }) {
  const [text, setText] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [rating, setRating] = useState<SelfRating | null>(null);

  function rate(r: SelfRating) {
    setRating(r);
    const key = srsKey.message(item.id);
    saveReview(key, review(getProgressSnapshot().srs[key], gradeFor(r), todayKey()));
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
          {rating && (
            <button type="button" className="btn" onClick={onNext}>
              {vi.messages.next}
            </button>
          )}
        </>
      )}
    </section>
  );
}
