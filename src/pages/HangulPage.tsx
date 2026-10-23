import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { ContentGate } from '../components/ContentGate';
import { Icon } from '../components/Icon';
import { ListenChoice } from '../components/ListenChoice';
import { ListenPlayer } from '../components/ListenPlayer';
import { ReportButton } from '../components/ReportButton';
import { SpeakButton } from '../components/SpeakButton';
import { StatusPanel } from '../components/StatusPanel';
import { useContent } from '../data/content';
import { vi } from '../i18n/vi';
import {
  BUILDER_FINALS,
  BUILDER_INITIALS,
  BUILDER_VOWELS,
  composeSyllable,
  finalSound,
  hangulProgress,
  hangulQuestions,
} from '../practice/hangul';
import { saveListenResult } from '../practice/listenResult';
import { speakKorean, stopSpeaking } from '../speech';
import { useProgress } from '../storage/progress';
import type { HangulLesson } from '../types';

/** /hangul: the alphabet from zero, lesson by lesson, plus a syllable builder. */
export function HangulPage() {
  const state = useContent('hangul');
  return (
    <div className="stack">
      <header className="stack-xs">
        <h1>{vi.hangul.title}</h1>
        <p className="muted">{vi.hangul.intro}</p>
      </header>
      <ContentGate state={state}>{(items) => <LessonList items={items} />}</ContentGate>
      <SyllableBuilder />
      <section className="stack-sm">
        <h2 className="section-title">{vi.hangul.next}</h2>
        <div className="list list--cards">
          <Link to="/basics" className="card card--link">
            <span className="card-icon card-icon--blue">
              <Icon name="book" />
            </span>
            <h3>{vi.hangul.basicsLink}</h3>
            <p className="muted small">{vi.hangul.basicsDesc}</p>
          </Link>
          <Link to="/typing?mode=keys" className="card card--link">
            <span className="card-icon card-icon--amber">
              <Icon name="keyboard" />
            </span>
            <h3>{vi.hangul.typingLink}</h3>
            <p className="muted small">{vi.hangul.typingDesc}</p>
          </Link>
        </div>
      </section>
    </div>
  );
}

function LessonList({ items }: { items: HangulLesson[] }) {
  const { srs } = useProgress();
  if (items.length === 0) {
    return (
      <StatusPanel kind="empty">
        <p className="muted">{vi.common.empty}</p>
      </StatusPanel>
    );
  }
  return (
    <section className="stack-sm">
      <h2 className="section-title">{vi.hangul.lessons}</h2>
      <ol className="list list--cards">
        {items.map((l, i) => {
          const { done, total } = hangulProgress(l, srs);
          return (
            <li key={l.id}>
              <Link to={`/hangul/${l.id}`} className="card card--link stack-xs">
                <div className="row-between">
                  <h3>
                    <span className="mono muted">{String(i + 1).padStart(2, '0')} </span>
                    {l.title}
                  </h3>
                  <span className="count-badge">{`${done}/${total}`}</span>
                </div>
                <p className="muted small">{l.intro}</p>
                <span className="bar" aria-hidden>
                  <span className="bar-fill" style={{ width: `${(100 * done) / total}%` }} />
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Pick an initial, a vowel and a final; see and hear the block they make. */
function SyllableBuilder() {
  const [initial, setInitial] = useState('ㅎ');
  const [vowel, setVowel] = useState('ㅏ');
  const [final, setFinal] = useState('ㄴ');
  const syllable = composeSyllable(initial, vowel, final);
  const sound = finalSound(final);

  const row = (label: string, values: string[], value: string, set: (v: string) => void) => (
    <div className="stack-xs">
      <p className="muted small">{label}</p>
      <div className="jamo-grid" role="group" aria-label={label}>
        {values.map((j) => (
          <button
            key={j || 'none'}
            type="button"
            lang={j ? 'ko' : undefined}
            className={j === value ? 'jamo-btn jamo-btn--on' : 'jamo-btn'}
            aria-pressed={j === value}
            onClick={() => set(j)}
          >
            {j || vi.hangul.noFinal}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <section className="card stack-sm">
      <h2 className="section-title">{vi.hangul.builder}</h2>
      <p className="muted small">{vi.hangul.builderHint}</p>
      <div className="builder-result">
        <p lang="ko" className="builder-syllable" aria-live="polite">
          {syllable}
        </p>
        <div className="stack-xs">
          <p lang="ko" className="mono muted">
            {[initial, vowel, final].filter(Boolean).join(' + ')}
          </p>
          {sound && <p className="small">{vi.hangul.finalReadAs(sound)}</p>}
        </div>
        <SpeakButton text={syllable} />
      </div>
      {row(vi.hangul.initial, BUILDER_INITIALS, initial, setInitial)}
      {row(vi.hangul.vowel, BUILDER_VOWELS, vowel, setVowel)}
      {row(vi.hangul.final, BUILDER_FINALS, final, setFinal)}
    </section>
  );
}

const TABS = ['letters', 'words', 'listen'] as const;
type Tab = (typeof TABS)[number];

/** /hangul/:id: letters with their sounds, words to read, then a listening quiz. */
export function HangulLessonPage() {
  const { id } = useParams();
  const state = useContent('hangul');
  return (
    <div className="stack">
      <Link to="/hangul" className="back-link">
        ← {vi.hangul.toList}
      </Link>
      <ContentGate state={state}>
        {(items) => {
          const i = items.findIndex((l) => l.id === id);
          if (i < 0) return <p className="muted">{vi.common.notFound}</p>;
          return <LessonView key={items[i].id} lesson={items[i]} next={items[i + 1]} />;
        }}
      </ContentGate>
    </div>
  );
}

function LessonView({ lesson, next }: { lesson: HangulLesson; next?: HangulLesson }) {
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.find((t) => t === params.get('tab')) ?? 'letters';

  function pick(t: Tab) {
    stopSpeaking();
    setParams(t === 'letters' ? {} : { tab: t }, { replace: true });
  }

  return (
    <>
      <header className="stack-xs">
        <h1>{lesson.title}</h1>
        <p className="muted">{lesson.intro}</p>
      </header>
      <div className="segmented" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? 'active' : ''}
            onClick={() => pick(t)}
          >
            {vi.hangul.tabs[t]}
          </button>
        ))}
      </div>
      {tab === 'letters' && (
        <>
          <Letters lesson={lesson} />
          <button type="button" className="btn" onClick={() => pick('words')}>
            {vi.hangul.startWords} →
          </button>
        </>
      )}
      {tab === 'words' && (
        <>
          <Words lesson={lesson} />
          <button type="button" className="btn" onClick={() => pick('listen')}>
            {vi.hangul.startListen} →
          </button>
        </>
      )}
      {tab === 'listen' && <ListenQuiz lesson={lesson} next={next} />}
    </>
  );
}

function Letters({ lesson }: { lesson: HangulLesson }) {
  return (
    <>
      {lesson.tips && (
        <section className="card stack-sm">
          <h2 className="section-title">{vi.hangul.tips}</h2>
          <ul className="tips-list">
            {lesson.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      )}
      {lesson.letters.length === 0 ? (
        <p className="muted">{vi.hangul.noLetters}</p>
      ) : (
        <section className="stack-sm">
          <h2 className="section-title">{vi.hangul.letters}</h2>
          <ul className="letter-grid">
            {lesson.letters.map((l) => (
              <li key={l.char}>
                <button type="button" className="letter-tile" onClick={() => void speakKorean(l.syllable)}>
                  <span lang="ko" className="letter-char">
                    {l.char}
                  </span>
                  {l.name && (
                    <span lang="ko" className="small muted">
                      {l.name}
                    </span>
                  )}
                  <span className="small">
                    <span lang="ko" className="mono">
                      {l.syllable}
                    </span>{' '}
                    · {l.sound}
                  </span>
                  {l.note && <span className="small muted">{l.note}</span>}
                  <span className="letter-play" aria-hidden>
                    <Icon name="volume" size={16} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/** Read each word yourself first, then reveal its meaning and real pronunciation. */
function Words({ lesson }: { lesson: HangulLesson }) {
  const [shown, setShown] = useState<Set<number>>(() => new Set());

  function reveal(i: number) {
    setShown((s) => new Set(s).add(i));
    void speakKorean(lesson.words[i].ko);
  }

  return (
    <section className="stack-sm">
      <p className="muted small">{vi.hangul.wordsHint}</p>
      <ul className="list">
        {lesson.words.map((w, i) => (
          <li key={w.ko} className="card stack-xs">
            <div className="row-between">
              <p lang="ko" className="drill-line">
                {w.ko}
              </p>
              {shown.has(i) ? (
                <SpeakButton text={w.ko} />
              ) : (
                <button type="button" className="btn btn--ghost" onClick={() => reveal(i)}>
                  {vi.hangul.showAnswer}
                </button>
              )}
            </div>
            {shown.has(i) && (
              <>
                {w.pron && (
                  <p className="small">
                    {vi.hangul.readAs}{' '}
                    <span lang="ko" className="pron">
                      {w.pron}
                    </span>
                  </p>
                )}
                <p className="muted">{w.vi}</p>
                {w.note && <p className="small">{w.note}</p>}
                <ReportButton reportKey={`hangul:${lesson.id}:w${i}`} ko={w.ko} />
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Hear a syllable or word (text hidden) and pick how it is written; answers go to the SRS. */
function ListenQuiz({ lesson, next }: { lesson: HangulLesson; next?: HangulLesson }) {
  const [questions, setQuestions] = useState(() => hangulQuestions(lesson));
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(false);

  function again() {
    setQuestions(hangulQuestions(lesson));
    setIndex(0);
    setCorrect(0);
    setAnswered(false);
  }

  if (index >= questions.length) {
    return (
      <StatusPanel kind="done" title={vi.listening.doneTitle}>
        <p className="score">{vi.listening.result(correct, questions.length)}</p>
        <div className="row">
          <button type="button" className="btn" onClick={again}>
            {vi.listening.again}
          </button>
          {next ? (
            <Link to={`/hangul/${next.id}`} className="btn btn--ghost">
              {vi.hangul.nextLesson} <Icon name="chevron-right" size={16} />
            </Link>
          ) : (
            <Link to="/basics" className="btn btn--ghost">
              {vi.hangul.basicsLink} <Icon name="chevron-right" size={16} />
            </Link>
          )}
        </div>
      </StatusPanel>
    );
  }

  const q = questions[index];
  return (
    <>
      <div className="row-between">
        <span className="muted small">{vi.listening.progress(index + 1, questions.length)}</span>
        <span className="badge">{vi.listening.correctCount(correct)}</span>
      </div>
      <div className="bar" aria-hidden>
        <div className="bar-fill" style={{ width: `${(100 * index) / questions.length}%` }} />
      </div>
      <section className="card stack-sm hangul-quiz" key={`${index}:${q.key}`}>
        <ListenPlayer ko={q.ko} />
        <ListenChoice
          q={q}
          prompt={vi.hangul.pick}
          onAnswer={(ok) => {
            saveListenResult(q.key, ok);
            if (ok) setCorrect((c) => c + 1);
            setAnswered(true);
          }}
        />
        {answered && (
          <button
            type="button"
            className="btn"
            onClick={() => {
              stopSpeaking();
              setIndex((i) => i + 1);
              setAnswered(false);
            }}
          >
            {index + 1 === questions.length ? vi.common.finish : vi.common.next}
          </button>
        )}
      </section>
    </>
  );
}
