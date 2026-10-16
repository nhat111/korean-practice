import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ComparisonView } from '../components/ComparisonView';
import { ListenChoice, ListenReveal } from '../components/ListenChoice';
import { saveListenResult } from '../practice/listenResult';
import { ListenPlayer as Player } from '../components/ListenPlayer';
import { MeetingListen } from '../components/MeetingListen';
import { StatusPanel } from '../components/StatusPanel';
import { useContent } from '../data/content';
import { vi } from '../i18n/vi';
import {
  dictationPool,
  grammarPool,
  grammarQuestion,
  meaningPool,
  meaningQuestion,
  numberQuestion,
  sample,
  type ChoiceQuestion,
  type ListenContent,
  type ListenLine,
} from '../practice/listening';
import { stopSpeaking } from '../speech';
import { compareAnswer, PASS_SCORE, type Comparison } from '../speaking/compare';
import type { GrammarLesson, NumberItem } from '../types';

type Mode = 'meaning' | 'dictation' | 'numbers' | 'grammar' | 'meeting';
const MODES: Mode[] = ['meaning', 'dictation', 'numbers', 'grammar', 'meeting'];
const SESSION = 10;

export function ListeningPage() {
  // `?mode=` comes from the 4-week path (numbers, meeting).
  const [params] = useSearchParams();
  const [mode, setMode] = useState<Mode>(() => MODES.find((m) => m === params.get('mode')) ?? 'meaning');
  const vocab = useContent('vocab');
  const shadowing = useContent('shadowing');
  const scenarios = useContent('scenarios');
  const numbers = useContent('numbers');
  const meetings = useContent('meetings');
  const grammar = useContent('grammar');
  const states = [vocab, shadowing, scenarios, numbers, grammar];

  return (
    <div className="stack">
      <h1>{vi.listening.title}</h1>
      <p className="muted">{vi.listening.intro}</p>
      <div className="segmented" role="tablist">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            className={mode === m ? 'active' : ''}
            onClick={() => setMode(m)}
          >
            {vi.listening.modes[m]}
          </button>
        ))}
      </div>
      {mode === 'meeting' ? (
        meetings.status === 'ready' ? (
          <MeetingListen items={meetings.items} />
        ) : meetings.status === 'error' ? (
          <p className="error">{vi.common.loadError}</p>
        ) : (
          <p className="muted">{vi.common.loading}</p>
        )
      ) : vocab.status === 'ready' &&
      shadowing.status === 'ready' &&
      scenarios.status === 'ready' &&
      numbers.status === 'ready' &&
      grammar.status === 'ready' ? (
        <Session
          key={mode}
          mode={mode}
          content={{ vocab: vocab.items, shadowing: shadowing.items, scenarios: scenarios.items }}
          numbers={numbers.items}
          grammar={grammar.items}
        />
      ) : states.some((s) => s.status === 'error') ? (
        <p className="error">{vi.common.loadError}</p>
      ) : (
        <p className="muted">{vi.common.loading}</p>
      )}
    </div>
  );
}

type Question = { kind: 'choice'; q: ChoiceQuestion } | { kind: 'dictation'; line: ListenLine };

interface Sources {
  content: ListenContent;
  numbers: NumberItem[];
  grammar: GrammarLesson[];
}

function buildQuestions(mode: Exclude<Mode, 'meeting'>, { content, numbers, grammar }: Sources): Question[] {
  if (mode === 'grammar') {
    return sample(grammarPool(grammar), SESSION).map((line) => ({ kind: 'choice', q: grammarQuestion(grammar, line) }));
  }
  if (mode === 'numbers') return sample(numbers, SESSION).map((n) => ({ kind: 'choice', q: numberQuestion(n) }));
  if (mode === 'dictation') return sample(dictationPool(content), SESSION).map((line) => ({ kind: 'dictation', line }));
  const pool = meaningPool(content);
  return sample(pool, SESSION).map((line) => ({ kind: 'choice', q: meaningQuestion(pool, line) }));
}

function Session({ mode, ...sources }: { mode: Exclude<Mode, 'meeting'> } & Sources) {
  const [questions, setQuestions] = useState(() => buildQuestions(mode, sources));
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(false);

  useEffect(() => stopSpeaking, []);

  function again() {
    setQuestions(buildQuestions(mode, sources));
    setIndex(0);
    setCorrect(0);
    setAnswered(false);
  }

  if (questions.length === 0) return (
      <StatusPanel kind="empty">
        <p className="muted">{vi.common.empty}</p>
      </StatusPanel>
    );

  if (index >= questions.length) {
    return (
      <StatusPanel kind="done" title={vi.listening.doneTitle}>
        <p className="score">{vi.listening.result(correct, questions.length)}</p>
        <div className="row">
          <button type="button" className="btn" onClick={again}>
            {vi.listening.again}
          </button>
          <Link to="/speaking" className="btn btn--ghost">
            {vi.listening.back}
          </Link>
        </div>
      </StatusPanel>
    );
  }

  const current = questions[index];
  const key = current.kind === 'choice' ? current.q.key : current.line.key;
  const ko = current.kind === 'choice' ? current.q.ko : current.line.ko;

  function onAnswer(ok: boolean) {
    saveListenResult(key, ok);
    if (ok) setCorrect((c) => c + 1);
    setAnswered(true);
  }

  function next() {
    stopSpeaking();
    setIndex((i) => i + 1);
    setAnswered(false);
  }

  return (
    <>
      <div className="row-between">
        <span className="muted small">{vi.listening.progress(index + 1, questions.length)}</span>
        <span className="badge">{vi.listening.correctCount(correct)}</span>
      </div>
      <div className="bar" aria-hidden>
        <div className="bar-fill" style={{ width: `${(100 * index) / questions.length}%` }} />
      </div>
      <section className="card stack-sm" key={`${index}:${key}`}>
        <Player ko={ko} />
        {current.kind === 'choice' ? (
          <ListenChoice
            q={current.q}
            prompt={
              mode === 'numbers' ? vi.listening.pickNumber : mode === 'grammar' ? vi.listening.pickGrammar : vi.listening.pick
            }
            onAnswer={onAnswer}
          />
        ) : (
          <DictationAnswer line={current.line} onAnswer={onAnswer} />
        )}
        {answered && mode === 'grammar' && (
          <Link to={`/grammar/${key.split(':')[1]}`} className="link-btn small">
            {vi.listening.openLesson}
          </Link>
        )}
        {answered && (
          <button type="button" className="btn" onClick={next}>
            {index + 1 === questions.length ? vi.common.finish : vi.common.next}
          </button>
        )}
      </section>
    </>
  );
}

function DictationAnswer({ line, onAnswer }: { line: ListenLine; onAnswer: (ok: boolean) => void }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<Comparison | null>(null);
  return (
    <div className="stack-sm">
      {result === null ? (
        <form
          className="stack-sm"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            const r = compareAnswer(line.ko, text);
            setResult(r);
            onAnswer(r.score >= PASS_SCORE);
          }}
        >
          <label className="field">
            <span>{vi.listening.typeLabel}</span>
            <textarea
              lang="ko"
              rows={2}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={vi.listening.typePlaceholder}
            />
          </label>
          <p className="muted small">{vi.listening.keyboardHint}</p>
          <button type="submit" className="btn" disabled={!text.trim()}>
            {vi.listening.check}
          </button>
        </form>
      ) : (
        <>
          <ComparisonView result={result} spokenLabel={vi.listening.typed} />
          <ListenReveal reportKey={line.key} ko={line.ko} vi={line.vi} ok={result.score >= PASS_SCORE} />
        </>
      )}
    </div>
  );
}
