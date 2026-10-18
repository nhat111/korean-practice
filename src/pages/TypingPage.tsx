import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router';
import { ContentGate } from '../components/ContentGate';
import { KoreanKeyboard } from '../components/KoreanKeyboard';
import { StatusPanel } from '../components/StatusPanel';
import { useContent } from '../data/content';
import { vi } from '../i18n/vi';
import { getProgressSnapshot, saveTypingRun, useProgress } from '../storage/progress';
import { KEY_LESSONS, ROUND_SIZE, chatLines, pickLines, wordLines, type KeyLessonId, type TypingLine } from '../typing/drills';
import { accuracy, keysPerMinute, keystrokes, typingProgress } from '../typing/hangul';

const MODES = ['keys', 'words', 'chat'] as const;
type Mode = (typeof MODES)[number];

export function TypingPage() {
  // `?mode=` keeps the tab on reload and lets other pages link to a mode.
  const [params, setParams] = useSearchParams();
  const mode: Mode = MODES.find((m) => m === params.get('mode')) ?? 'keys';
  const best = useProgress().typing.best;
  return (
    <div className="stack">
      <h1>{vi.typing.title}</h1>
      <p className="muted">{vi.typing.intro}</p>
      <div className="chips" role="tablist">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            className={mode === m ? 'chip active' : 'chip'}
            onClick={() => setParams({ mode: m }, { replace: true })}
          >
            {vi.typing.modes[m]}
          </button>
        ))}
      </div>
      {mode === 'keys' && <KeyLessons />}
      {mode === 'words' && <WordsMode />}
      {mode === 'chat' && <ChatMode />}
      <p className="muted small">
        {best > 0 && <span className="mono">{vi.typing.best(best)} · </span>}
        {vi.typing.reference}
      </p>
      <details className="card typing-setup">
        <summary>{vi.typing.setupTitle}</summary>
        <ul>
          {vi.typing.setup.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function KeyLessons() {
  const [id, setId] = useState<KeyLessonId>('home');
  const lesson = KEY_LESSONS.find((l) => l.id === id) ?? KEY_LESSONS[0];
  return (
    <>
      <div className="chips" role="tablist">
        {KEY_LESSONS.map((l, i) => (
          <button
            key={l.id}
            type="button"
            role="tab"
            aria-selected={id === l.id}
            className={id === l.id ? 'chip active' : 'chip'}
            onClick={() => setId(l.id)}
          >
            <span className="mono">{i + 1}</span> {vi.typing.lessons[l.id]}
          </button>
        ))}
      </div>
      <p className="muted small">
        {vi.typing.tips[lesson.id]} {lesson.id === 'top' && vi.typing.compound}
      </p>
      <TypingRound key={lesson.id} mode={`keys:${lesson.id}`} source={lesson.words} teach={lesson.keys} />
    </>
  );
}

function WordsMode() {
  const vocab = useContent('vocab');
  return <ContentGate state={vocab}>{(items) => <TypingRound mode="words" source={wordLines(items)} />}</ContentGate>;
}

function ChatMode() {
  const shadowing = useContent('shadowing');
  const messages = useContent('messages');
  return (
    <ContentGate state={shadowing}>
      {(sh) => <ContentGate state={messages}>{(msgs) => <TypingRound mode="chat" source={chatLines(sh, msgs)} />}</ContentGate>}
    </ContentGate>
  );
}

interface LineResult {
  keys: number;
  ms: number;
  accuracy: number;
}

function isDesktop(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
}

/** One round of ROUND_SIZE lines: type each line, then a summary that is saved to progress. */
function TypingRound({ mode, source, teach }: { mode: string; source: readonly TypingLine[]; teach?: string }) {
  const [lines, setLines] = useState(() => pickLines(source, ROUND_SIZE));
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [results, setResults] = useState<LineResult[]>([]);
  // Phones already show their own Korean keyboard; the map is mostly for desktops.
  const [showKeyboard, setShowKeyboard] = useState(isDesktop);
  const inputRef = useRef<HTMLInputElement>(null);
  const startedAt = useRef<number | null>(null);
  const doneAt = useRef<number | null>(null);
  const composing = useRef(false);
  const advanceAfterComposition = useRef(false);
  // Latest input value for handlers that run after a timeout (state in their closure may be stale).
  const typedRef = useRef('');

  function again() {
    setLines(pickLines(source, ROUND_SIZE));
    setIndex(0);
    setTyped('');
    typedRef.current = '';
    setResults([]);
  }

  const line = lines[index];
  if (!line) return <RoundSummary mode={mode} results={results} onAgain={again} />;

  const progress = typingProgress(line.ko, typed);
  const lineDone = progress.done || typed.trimEnd() === line.ko;
  const elapsed = startedAt.current !== null ? (doneAt.current ?? Date.now()) - startedAt.current : 0;

  function advance(record: boolean) {
    const value = typedRef.current.trimEnd();
    if (record && startedAt.current !== null && value) {
      const end = doneAt.current ?? Date.now();
      const ms = end - startedAt.current;
      setResults((r) => [...r, { keys: keystrokes(line.ko).length, ms, accuracy: accuracy(line.ko, value) }]);
    }
    startedAt.current = null;
    doneAt.current = null;
    advanceAfterComposition.current = false;
    typedRef.current = '';
    setTyped('');
    setIndex((i) => i + 1);
    inputRef.current?.focus();
  }

  function onChange(value: string) {
    typedRef.current = value;
    if (startedAt.current === null && value) startedAt.current = Date.now();
    if (doneAt.current === null && (value === line.ko || value.trimEnd() === line.ko)) doneAt.current = Date.now();
    // A space after a finished line moves on, the way typing tests do.
    if (value.endsWith(' ') && value.trimEnd() === line.ko && !composing.current) {
      setTyped(value);
      advanceSoon();
      return;
    }
    setTyped(value);
  }

  function advanceSoon() {
    // Let the IME settle before clearing the field, or a committed syllable lands in the next line.
    setTimeout(() => advance(true), 0);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (!typedRef.current.trim()) return;
    if (e.nativeEvent.isComposing || composing.current) advanceAfterComposition.current = true;
    else advanceSoon();
  }

  function onCompositionEnd() {
    composing.current = false;
    if (advanceAfterComposition.current) advanceSoon();
  }

  // Too few keys for a meaningful speed during the first seconds.
  const liveKpm = elapsed >= 2000 ? String(keysPerMinute(progress.correctKeys, elapsed)) : '–';
  return (
    <section className="card stack-sm typing-card">
      <div className="row-between">
        <span className="muted small">{vi.typing.progress(index + 1, lines.length)}</span>
        <span className="mono small">
          {liveKpm} {vi.typing.kpm}
        </span>
      </div>
      <p className="typing-target" lang="ko">
        {[...line.ko].map((ch, i) => (
          <span key={i} className={`tc tc--${progress.chars[i]}`}>
            {ch}
          </span>
        ))}
      </p>
      {line.vi && <p className="muted small">{line.vi}</p>}
      <input
        ref={inputRef}
        className={lineDone ? 'input typing-input typing-input--done' : 'input typing-input'}
        value={typed}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onCompositionStart={() => (composing.current = true)}
        onCompositionEnd={onCompositionEnd}
        placeholder={vi.typing.placeholder}
        aria-label={vi.typing.placeholder}
        lang="ko"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="next"
        autoFocus
      />
      <p className="sr-only" aria-live="polite">
        {progress.nextKey ? vi.typing.nextKey(progress.nextKey) : ''}
      </p>
      {showKeyboard && <KoreanKeyboard nextKey={progress.nextKey} teach={teach} />}
      <div className="row-between">
        <p className="muted small">{vi.typing.hint}</p>
        <button type="button" className="link-btn small" onClick={() => setShowKeyboard((s) => !s)}>
          {showKeyboard ? vi.typing.hideKeyboard : vi.typing.showKeyboard}
        </button>
      </div>
      <div className="row daily-nav">
        <button type="button" className="btn btn--ghost" onClick={() => advance(false)}>
          {vi.typing.skip}
        </button>
        <button type="button" className="btn" disabled={!typed.trim()} onClick={() => advance(true)}>
          {vi.typing.next}
        </button>
      </div>
    </section>
  );
}

function RoundSummary({ mode, results, onAgain }: { mode: string; results: LineResult[]; onAgain: () => void }) {
  // The best before this round decides "new best"; the round is saved once.
  const [summary] = useState(() => {
    const keys = results.reduce((n, r) => n + r.keys, 0);
    const ms = results.reduce((n, r) => n + r.ms, 0);
    const kpm = keysPerMinute(keys, ms);
    const acc = results.length ? Math.round(results.reduce((n, r) => n + r.accuracy, 0) / results.length) : 0;
    return { kpm, acc, newBest: results.length > 0 && acc >= 90 && kpm > getProgressSnapshot().typing.best };
  });
  const saved = useRef(false);
  useEffect(() => {
    if (saved.current || results.length === 0) return;
    saved.current = true;
    saveTypingRun({ at: new Date().toISOString(), mode, kpm: summary.kpm, accuracy: summary.acc });
  }, [mode, results.length, summary]);
  return (
    <StatusPanel kind="done" title={vi.typing.doneTitle}>
      {results.length > 0 && <p className="mono">{vi.typing.result(summary.kpm, summary.acc)}</p>}
      {summary.newBest && <p className="badge badge--ok">{vi.typing.newBest}</p>}
      {results.length > 0 && summary.acc < 90 && <p className="muted small">{vi.typing.bestNeedsAccuracy}</p>}
      <button type="button" className="btn" onClick={onAgain}>
        {vi.typing.again}
      </button>
    </StatusPanel>
  );
}
