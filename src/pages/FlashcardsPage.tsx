import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ContentGate } from '../components/ContentGate';
import { GrammarNotes, GrammarSentence } from '../components/GrammarNotes';
import { SpeakButton } from '../components/SpeakButton';
import { ComparePlayback, MicHelp, RecordControl } from '../components/SpeakPractice';
import { useContent } from '../data/content';
import { vi } from '../i18n/vi';
import { srsKey } from '../practice/decks';
import { speakKorean, stopSpeaking } from '../speech';
import { isRecordingSupported, useRecorder } from '../speaking/recorder';
import { isDue, review, todayKey, type CardState, type Grade } from '../srs/sm2';
import { usePrefs } from '../storage/prefs';
import { saveCard, saveReview, useProgress, type Progress } from '../storage/progress';
import type { VocabItem } from '../types';

/** Read: Korean → meaning. Speak: meaning → say it in Korean (separate SRS schedule). */
type CardMode = 'read' | 'speak';

function cardState(progress: Progress, mode: CardMode, id: string): CardState | undefined {
  return mode === 'read' ? progress.cards[id] : progress.srs[srsKey.vocabSpeak(id)];
}

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
  const [mode, setMode] = useState<CardMode>('read');

  return (
    <div className="stack">
      <div className="row-between">
        <h1>{vi.flashcards.title}</h1>
        <Link to="/songs" className="link-btn small">
          {vi.flashcards.toSongs}
        </Link>
      </div>
      <ContentGate state={state}>
        {(items) => {
          const tags = [...new Set(items.flatMap((v) => v.tags))].sort();
          const filtered = tag ? items.filter((v) => v.tags.includes(tag)) : items;
          return (
            <>
              <div className="segmented" role="tablist">
                {(['read', 'speak'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={mode === m}
                    className={mode === m ? 'active' : ''}
                    onClick={() => setMode(m)}
                  >
                    {m === 'read' ? vi.flashcards.modeRead : vi.flashcards.modeSpeak}
                  </button>
                ))}
              </div>
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
              <FlashcardSession key={`${mode}:${tag}`} items={filtered} mode={mode} />
            </>
          );
        }}
      </ContentGate>
    </div>
  );
}

/** Due cards first (oldest due date first), then up to `limit` new cards. */
function buildQueue(items: VocabItem[], progress: Progress, mode: CardMode, today: string, limit: number): string[] {
  const card = (id: string) => cardState(progress, mode, id);
  const due = items
    .filter((v) => isDue(card(v.id), today))
    .sort((a, b) => (card(a.id)?.due ?? '').localeCompare(card(b.id)?.due ?? ''))
    .map((v) => v.id);
  const fresh = items
    .filter((v) => !card(v.id))
    .slice(0, limit)
    .map((v) => v.id);
  return [...due, ...fresh];
}

function FlashcardSession({ items, mode }: { items: VocabItem[]; mode: CardMode }) {
  const progress = useProgress();
  const today = todayKey();
  // The queue is fixed when the session starts so cards don't jump around
  // while progress updates.
  const [queue, setQueue] = useState(() => buildQueue(items, progress, mode, today, NEW_PER_SESSION));
  const [flipped, setFlipped] = useState(false);

  const card = (id: string) => cardState(progress, mode, id);
  const byId = new Map(items.map((v) => [v.id, v]));
  const dueCount = items.filter((v) => isDue(card(v.id), today)).length;
  const newCount = items.filter((v) => !card(v.id)).length;
  const current = queue.length > 0 ? byId.get(queue[0]) : undefined;

  function grade(g: Grade) {
    if (!current) return;
    const next = review(card(current.id), g, today);
    if (mode === 'read') saveCard(current.id, next);
    else saveReview(srsKey.vocabSpeak(current.id), next);
    // Forgotten cards come back at the end of this session.
    setQueue((q) => (g < 3 ? [...q.slice(1), q[0]] : q.slice(1)));
    setFlipped(false);
  }

  function learnMore() {
    setQueue(buildQueue(items, progress, mode, today, NEW_PER_SESSION));
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
          <Flashcard item={current} flipped={flipped} mode={mode} onFlip={() => setFlipped(true)} />
          {mode === 'speak' && <SpeakTools key={current.id} item={current} flipped={flipped} />}
          {flipped && (
            <div className="grades">
              {GRADES.map(({ grade: g, label, className }) => (
                <button key={g} type="button" className={className} onClick={() => grade(g)}>
                  <span>{label}</span>
                  <small>{vi.flashcards.nextReview(preview(card(current.id), g, today))}</small>
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

function Flashcard({
  item,
  flipped,
  mode,
  onFlip,
}: {
  item: VocabItem;
  flipped: boolean;
  mode: CardMode;
  onFlip: () => void;
}) {
  const { showPron } = usePrefs();
  const speak = mode === 'speak';
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
        {speak && !flipped ? (
          <>
            <p className="flashcard-word flashcard-word--vi">{item.vi}</p>
            {item.type && <span className="badge">{vi.flashcards.type[item.type]}</span>}
            <p className="muted">{vi.flashcards.speakPrompt}</p>
          </>
        ) : (
          <>
            <p lang="ko" className="flashcard-word">
              {item.ko}
            </p>
            <SpeakButton text={item.ko} />
            {!flipped && <p className="muted">{vi.flashcards.tapToFlip}</p>}
          </>
        )}
      </div>
      {flipped && (
        <div className="flashcard-back stack-sm">
          {showPron && (item.pron || item.romanization) && (
            <p className="muted" lang="ko">
              {item.pron && <span className="pron">{item.pron}</span>} {item.romanization && `[${item.romanization}]`}
            </p>
          )}
          <p className="flashcard-meaning">
            {item.vi}
            {item.type && <span className="badge type-badge">{vi.flashcards.type[item.type]}</span>}
          </p>
          {item.collocation && (
            <div className="ko-line">
              <span className="muted small">{vi.flashcards.collocation}:</span>
              <p lang="ko" className="ko">
                {item.collocation}
              </p>
              <SpeakButton text={item.collocation} small />
            </div>
          )}
          <div className="example">
            <span className="muted small">{vi.flashcards.example}</span>
            <div className="ko-line">
              <p lang="ko" className="ko">
                <GrammarSentence text={item.example.ko} grammar={item.example.grammar} />
              </p>
              <SpeakButton text={item.example.ko} small />
            </div>
            <p className="muted">{item.example.vi}</p>
            <GrammarNotes grammar={item.example.grammar} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Speaking mode: record the answer before flipping, then compare with the model. */
function SpeakTools({ item, flipped }: { item: VocabItem; flipped: boolean }) {
  const recorder = useRecorder();
  const ready = recorder.url !== null && recorder.status === 'idle';

  // Read the answer aloud when the card is turned over.
  useEffect(() => {
    if (flipped) void speakKorean(item.ko);
    return stopSpeaking;
  }, [flipped, item.ko]);

  if (!isRecordingSupported()) return null;
  return (
    <div className="stack-sm">
      {!flipped && <RecordControl recorder={recorder} onStart={stopSpeaking} />}
      {recorder.error && <p className="error">{recorder.error}</p>}
      {recorder.errorKind === 'denied' && <MicHelp />}
      {flipped && ready && <ComparePlayback ko={item.ko} url={recorder.url} />}
    </div>
  );
}
