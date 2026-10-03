import { useState } from 'react';
import { ContentGate } from '../components/ContentGate';
import { SpeakButton } from '../components/SpeakButton';
import { useContent } from '../data/content';
import { vi } from '../i18n/vi';
import { isDue, review, todayKey, type CardState, type Grade } from '../srs/sm2';
import { saveCard, useProgress, type Progress } from '../storage/progress';
import type { VocabItem } from '../types';

const NEW_PER_SESSION = 10;

const GRADES: { grade: Grade; label: string; className: string }[] = [
  { grade: 1, label: vi.flashcards.gradeAgain, className: 'btn btn--bad' },
  { grade: 3, label: vi.flashcards.gradeHard, className: 'btn btn--warn' },
  { grade: 4, label: vi.flashcards.gradeGood, className: 'btn' },
  { grade: 5, label: vi.flashcards.gradeEasy, className: 'btn btn--ok' },
];

export function FlashcardsPage() {
  const state = useContent('vocab');
  const [tag, setTag] = useState('');

  return (
    <div className="stack">
      <h1>{vi.flashcards.title}</h1>
      <ContentGate state={state}>
        {(items) => {
          const tags = [...new Set(items.flatMap((v) => v.tags))].sort();
          const filtered = tag ? items.filter((v) => v.tags.includes(tag)) : items;
          return (
            <>
              {tags.length > 1 && (
                <select
                  className="select"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  aria-label={vi.flashcards.allTags}
                >
                  <option value="">{vi.flashcards.allTags}</option>
                  {tags.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              )}
              {/* Remount the session when the filter changes. */}
              <FlashcardSession key={tag} items={filtered} />
            </>
          );
        }}
      </ContentGate>
    </div>
  );
}

/** Due cards first (oldest due date first), then up to `limit` new cards. */
function buildQueue(items: VocabItem[], progress: Progress, today: string, limit: number): string[] {
  const due = items
    .filter((v) => isDue(progress.cards[v.id], today))
    .sort((a, b) => progress.cards[a.id].due.localeCompare(progress.cards[b.id].due))
    .map((v) => v.id);
  const fresh = items
    .filter((v) => !progress.cards[v.id])
    .slice(0, limit)
    .map((v) => v.id);
  return [...due, ...fresh];
}

function FlashcardSession({ items }: { items: VocabItem[] }) {
  const progress = useProgress();
  const today = todayKey();
  // The queue is fixed when the session starts so cards don't jump around
  // while progress updates.
  const [queue, setQueue] = useState(() => buildQueue(items, progress, today, NEW_PER_SESSION));
  const [flipped, setFlipped] = useState(false);

  const byId = new Map(items.map((v) => [v.id, v]));
  const dueCount = items.filter((v) => isDue(progress.cards[v.id], today)).length;
  const newCount = items.filter((v) => !progress.cards[v.id]).length;
  const current = queue.length > 0 ? byId.get(queue[0]) : undefined;

  function grade(g: Grade) {
    if (!current) return;
    saveCard(current.id, review(progress.cards[current.id], g, today));
    // Forgotten cards come back at the end of this session.
    setQueue((q) => (g < 3 ? [...q.slice(1), q[0]] : q.slice(1)));
    setFlipped(false);
  }

  function learnMore() {
    setQueue(buildQueue(items, progress, today, NEW_PER_SESSION));
  }

  return (
    <div className="stack">
      <div className="meta">
        <span className="badge">{vi.flashcards.due(dueCount)}</span>
        <span className="badge">{vi.flashcards.newCards(newCount)}</span>
        {current && <span className="badge">{vi.flashcards.remaining(queue.length)}</span>}
      </div>

      {!current ? (
        <section className="card center stack-sm">
          <h2>{vi.flashcards.sessionDone}</h2>
          <p className="muted">{vi.flashcards.sessionDoneHint}</p>
          {newCount > 0 && (
            <button type="button" className="btn" onClick={learnMore}>
              {vi.flashcards.learnMore}
            </button>
          )}
        </section>
      ) : (
        <>
          <Flashcard item={current} flipped={flipped} onFlip={() => setFlipped(true)} />
          {flipped && (
            <div className="grades">
              {GRADES.map(({ grade: g, label, className }) => (
                <button key={g} type="button" className={className} onClick={() => grade(g)}>
                  <span>{label}</span>
                  <small>{vi.flashcards.nextReview(preview(progress.cards[current.id], g, today))}</small>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function preview(card: CardState | undefined, g: Grade, today: string): number {
  return review(card, g, today).interval;
}

function Flashcard({ item, flipped, onFlip }: { item: VocabItem; flipped: boolean; onFlip: () => void }) {
  return (
    <div
      className={flipped ? 'flashcard flipped' : 'flashcard'}
      role="button"
      tabIndex={0}
      onClick={onFlip}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onFlip();
        }
      }}
    >
      <div className="flashcard-front">
        <p lang="ko" className="flashcard-word">
          {item.ko}
        </p>
        <SpeakButton text={item.ko} />
        {!flipped && <p className="muted">{vi.flashcards.tapToFlip}</p>}
      </div>
      {flipped && (
        <div className="flashcard-back stack-sm">
          {item.romanization && <p className="muted">[{item.romanization}]</p>}
          <p className="flashcard-meaning">{item.vi}</p>
          <div className="example">
            <span className="muted small">{vi.flashcards.example}</span>
            <div className="ko-line">
              <p lang="ko" className="ko">
                {item.example.ko}
              </p>
              <SpeakButton text={item.example.ko} small />
            </div>
            <p className="muted">{item.example.vi}</p>
          </div>
        </div>
      )}
    </div>
  );
}
