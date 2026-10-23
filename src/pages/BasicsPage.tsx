import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { ContentGate } from '../components/ContentGate';
import { Icon } from '../components/Icon';
import { ListenChoice } from '../components/ListenChoice';
import { ListenPlayer } from '../components/ListenPlayer';
import { ReportButton } from '../components/ReportButton';
import { KoreanLine } from '../components/SpeakButton';
import { SpeakPractice } from '../components/SpeakPractice';
import { StatusPanel } from '../components/StatusPanel';
import { useContent } from '../data/content';
import { vi } from '../i18n/vi';
import { basicProgress, basicQuestions } from '../practice/basics';
import { srsKey } from '../practice/decks';
import { saveListenResult } from '../practice/listenResult';
import { stopSpeaking } from '../speech';
import { usePrefs } from '../storage/prefs';
import { useProgress } from '../storage/progress';
import type { BasicLesson } from '../types';

/** /basics: beginner (TOPIK 1-2) lessons, grouped by level, with lines practiced. */
export function BasicsPage() {
  const state = useContent('basics');
  return (
    <div className="stack">
      <header className="stack-xs">
        <h1>{vi.basics.title}</h1>
        <p className="muted">{vi.basics.intro}</p>
      </header>
      <Link to="/hangul" className="card card--link suggest-card">
        <span className="card-icon card-icon--blue">
          <Icon name="languages" />
        </span>
        <div>
          <h2>{vi.hangul.title}</h2>
          <p className="muted">{vi.hangul.suggest}</p>
        </div>
      </Link>
      <ContentGate state={state}>{(items) => <BasicsList items={items} />}</ContentGate>
      <section className="stack-sm">
        <h2 className="section-title">{vi.basics.more}</h2>
        <div className="list list--cards">
          <Link to="/grammar?group=basic" className="card card--link">
            <span className="card-icon card-icon--amber">
              <Icon name="book" />
            </span>
            <h3>{vi.basics.grammarLink}</h3>
            <p className="muted small">{vi.basics.grammarDesc}</p>
          </Link>
          <Link to="/scenarios?cat=basic" className="card card--link">
            <span className="card-icon card-icon--red">
              <Icon name="chat" />
            </span>
            <h3>{vi.basics.dialogueLink}</h3>
            <p className="muted small">{vi.basics.dialogueDesc}</p>
          </Link>
        </div>
      </section>
    </div>
  );
}

function BasicsList({ items }: { items: BasicLesson[] }) {
  const { srs } = useProgress();
  if (items.length === 0) {
    return (
      <StatusPanel kind="empty">
        <p className="muted">{vi.common.empty}</p>
      </StatusPanel>
    );
  }
  return (
    <>
      {[1, 2].map((level) => {
        const lessons = items.filter((l) => l.level === level);
        if (lessons.length === 0) return null;
        return (
          <section key={level} className="stack-sm">
            <h2 className="section-title">{vi.basics.levelTitle(level)}</h2>
            <ul className="list list--cards">
              {lessons.map((l) => {
                const { done, total } = basicProgress(l, srs);
                return (
                  <li key={l.id}>
                    <Link to={`/basics/${l.id}`} className="card card--link stack-xs">
                      <div className="row-between">
                        <h3>{l.title}</h3>
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
            </ul>
          </section>
        );
      })}
    </>
  );
}

const TABS = ['words', 'speak', 'listen'] as const;
type Tab = (typeof TABS)[number];

/** /basics/:id: key words, then listen and repeat each line, then a listening quiz. */
export function BasicLessonPage() {
  const { id } = useParams();
  const state = useContent('basics');
  return (
    <div className="stack">
      <Link to="/basics" className="back-link">
        ← {vi.basics.toList}
      </Link>
      <ContentGate state={state}>
        {(items) => {
          const i = items.findIndex((l) => l.id === id);
          if (i < 0) return <p className="muted">{vi.common.notFound}</p>;
          return <BasicLessonView key={items[i].id} lesson={items[i]} next={items[i + 1]} />;
        }}
      </ContentGate>
    </div>
  );
}

function BasicLessonView({ lesson, next }: { lesson: BasicLesson; next?: BasicLesson }) {
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.find((t) => t === params.get('tab')) ?? 'words';

  function pick(t: Tab) {
    stopSpeaking();
    setParams(t === 'words' ? {} : { tab: t }, { replace: true });
  }

  return (
    <>
      <header className="stack-xs">
        <p className="page-kicker">{vi.basics.levelTitle(lesson.level)}</p>
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
            {vi.basics.tabs[t]}
          </button>
        ))}
      </div>

      {tab === 'words' && (
        <>
          <section className="card stack-sm">
            <h2 className="section-title">{vi.basics.words}</h2>
            <ul className="list grammar-examples">
              {lesson.words.map((w) => (
                <li key={w.ko} className="stack-xs">
                  <KoreanLine text={w.ko} />
                  <p className="muted small">{w.vi}</p>
                </li>
              ))}
            </ul>
          </section>
          <button type="button" className="btn" onClick={() => pick('speak')}>
            {vi.basics.startSpeak} →
          </button>
        </>
      )}
      {tab === 'speak' && <SpeakLines lesson={lesson} onDone={() => pick('listen')} />}
      {tab === 'listen' && <ListenQuiz lesson={lesson} next={next} />}
    </>
  );
}

/** One line at a time: hear the model, read the real pronunciation, record and rate. */
function SpeakLines({ lesson, onDone }: { lesson: BasicLesson; onDone: () => void }) {
  const { showPron } = usePrefs();
  const [index, setIndex] = useState(0);
  const [hideText, setHideText] = useState(false);
  const [shown, setShown] = useState(false);
  const line = lesson.lines[index];
  const key = srsKey.basic(lesson.id, index);
  const last = index === lesson.lines.length - 1;

  function go(i: number) {
    stopSpeaking();
    setIndex(i);
    setShown(false);
  }

  return (
    <>
      <div className="segmented" role="tablist">
        {[false, true].map((h) => (
          <button
            key={String(h)}
            type="button"
            role="tab"
            aria-selected={hideText === h}
            className={hideText === h ? 'active' : ''}
            onClick={() => setHideText(h)}
          >
            {h ? vi.practice.hideText : vi.practice.showText}
          </button>
        ))}
      </div>
      <div className="row-between">
        <button type="button" className="btn btn--ghost" disabled={index === 0} onClick={() => go(index - 1)}>
          {vi.practice.prev}
        </button>
        <span className="muted small">{vi.practice.of(index + 1, lesson.lines.length)}</span>
        <button type="button" className="btn btn--ghost" disabled={last} onClick={() => go(index + 1)}>
          {vi.practice.next}
        </button>
      </div>
      <section className="card stack-sm" key={key}>
        {!hideText || shown ? (
          <div className="stack-xs">
            <p lang="ko" className="drill-line">
              {line.ko}
            </p>
            {showPron && (
              <p lang="ko" className="pron" aria-label={vi.practice.pron}>
                {line.pron}
              </p>
            )}
            <p className="muted">{line.vi}</p>
            {line.note && <p className="small">{line.note}</p>}
            <ReportButton reportKey={key} ko={line.ko} />
          </div>
        ) : (
          <div className="stack-xs">
            <p className="muted small">{vi.practice.hiddenText}</p>
            <button type="button" className="link-btn" onClick={() => setShown(true)}>
              {vi.practice.reveal}
            </button>
          </div>
        )}
        <SpeakPractice ko={line.ko} source={key} srsKey={key} />
      </section>
      {last && (
        <button type="button" className="btn" onClick={onDone}>
          {vi.basics.startListen} →
        </button>
      )}
    </>
  );
}

/** Hear each line (text hidden) and pick its meaning; every answer goes to the SRS. */
function ListenQuiz({ lesson, next }: { lesson: BasicLesson; next?: BasicLesson }) {
  const [questions, setQuestions] = useState(() => basicQuestions(lesson));
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(false);

  function again() {
    setQuestions(basicQuestions(lesson));
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
            <Link to={`/basics/${next.id}`} className="btn btn--ghost">
              {vi.basics.nextLesson} <Icon name="chevron-right" size={16} />
            </Link>
          ) : (
            <Link to="/basics" className="btn btn--ghost">
              {vi.basics.toList}
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
      <section className="card stack-sm" key={`${index}:${q.key}`}>
        <ListenPlayer ko={q.ko} />
        <ListenChoice
          q={q}
          prompt={vi.listening.pick}
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
