import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { InterpretCard } from '../components/InterpretCard';
import { MeetingCard } from '../components/MeetingListen';
import { MessageCard } from '../components/MessageCard';
import { PatternDrill } from '../components/PatternDrill';
import { ScenarioTurnDrill } from '../components/ScenarioTurnDrill';
import { ShadowingCard } from '../components/ShadowingCard';
import { SpeakPractice } from '../components/SpeakPractice';
import { useContent } from '../data/content';
import { vi } from '../i18n/vi';
import { WEAK_LIMIT, weakKeys } from '../practice/weak';
import { splitParts } from '../speaking/segments';
import { getProgressSnapshot } from '../storage/progress';
import type {
  InterpretItem,
  MeetingItem,
  MessageExercise,
  NumberItem,
  PatternItem,
  Scenario,
  ShadowingItem,
  VocabItem,
} from '../types';

interface Content {
  shadowing: ShadowingItem[];
  patterns: PatternItem[];
  scenarios: Scenario[];
  vocab: VocabItem[];
  numbers: NumberItem[];
  interpret: InterpretItem[];
  messages: MessageExercise[];
  meetings: MeetingItem[];
}

type WeakKind = 'shadowing' | 'pattern' | 'scenario' | 'vocab' | 'listen' | 'interpret' | 'message' | 'meeting';

interface WeakItem {
  key: string;
  kind: WeakKind;
  /** Korean shown in the list. */
  ko: string;
  render: (onRated: () => void) => ReactNode;
}

/** "[N]이/가 필요합니다." from "{noun}{이/가} 필요합니다." */
function frameText(pattern: string): string {
  return pattern
    .replace(/\{([^}/]+)\}/g, (_, name: string) => `[${vi.patterns.slotLabels[name] ?? name}]`)
    .replace(/\{([^}]+)\}/g, '$1');
}

/** A line to shadow again, rated into the same SRS key (listening and speaking flashcards). */
function lineDrill(key: string, ko: string, meaning: string, onRated: () => void) {
  return (
    <section className="card stack-sm">
      <p lang="ko" className="drill-line">
        {ko}
      </p>
      {meaning && <p className="muted">{meaning}</p>}
      <SpeakPractice ko={ko} source={key} srsKey={key} onRated={onRated} />
    </section>
  );
}

/** Turns an SRS key back into its content and drill; null if the content is gone. */
function resolve(key: string, c: Content): WeakItem | null {
  const [type, ...rest] = key.split(':');
  const id = rest[0];
  const scenarioTurn = (sid: string, turn: string) => c.scenarios.find((s) => s.id === sid)?.turns[Number(turn)];

  switch (type) {
    case 'shadowing': {
      const item = c.shadowing.find((s) => s.id === id);
      return item ? { key, kind: 'shadowing', ko: item.ko, render: (r) => <ShadowingCard item={item} onRated={r} /> } : null;
    }
    case 'pattern': {
      const item = c.patterns.find((p) => p.id === id);
      return item ? { key, kind: 'pattern', ko: frameText(item.pattern), render: (r) => <PatternDrill item={item} onRated={r} /> } : null;
    }
    case 'scenario': {
      const scenario = c.scenarios.find((s) => s.id === id);
      const turn = Number(rest[1]);
      const t = scenario?.turns[turn];
      return scenario && t
        ? { key, kind: 'scenario', ko: t.modelAnswer, render: (r) => <ScenarioTurnDrill scenario={scenario} turn={turn} onRated={r} /> }
        : null;
    }
    case 'interpret':
    case 'interpret-ko': {
      const item = c.interpret.find((x) => x.id === id);
      const direction = type === 'interpret' ? 'vi-ko' : 'ko-vi';
      return item
        ? {
            key,
            kind: 'interpret',
            ko: direction === 'vi-ko' ? item.vi : item.ko,
            render: (r) => <InterpretCard item={item} direction={direction} onRated={r} />,
          }
        : null;
    }
    case 'vocab-speak': {
      const v = c.vocab.find((x) => x.id === id);
      return v ? { key, kind: 'vocab', ko: v.ko, render: (r) => lineDrill(key, v.ko, v.vi, r) } : null;
    }
    case 'message': {
      const m = c.messages.find((x) => x.id === id);
      return m ? { key, kind: 'message', ko: m.model, render: (r) => <MessageCard item={m} onRated={r} /> } : null;
    }
    case 'listen': {
      // listen:<source>:<id>[:turn[:part]] — see practice/listening.ts.
      const [src, sid, a, b] = rest;
      if (src === 'meeting') {
        const m = c.meetings.find((x) => x.id === sid);
        return m
          ? { key, kind: 'meeting', ko: m.lines[0].ko, render: (r) => <MeetingCard meeting={m} onDone={r} /> }
          : null;
      }
      let line: { ko: string; vi: string } | undefined;
      if (src === 'vocab') {
        const v = c.vocab.find((x) => x.id === sid);
        line = v && { ko: v.example.ko, vi: v.example.vi };
      } else if (src === 'shadowing') {
        const s = c.shadowing.find((x) => x.id === sid);
        line = s && { ko: s.ko, vi: s.vi };
      } else if (src === 'number') {
        const n = c.numbers.find((x) => x.id === sid);
        line = n && { ko: n.ko, vi: n.vi };
      } else if (src === 'scenario') {
        const t = scenarioTurn(sid, a);
        line = t && { ko: t.modelAnswer, vi: t.modelAnswerVi };
      } else if (src === 'client') {
        const t = scenarioTurn(sid, a);
        line = t && { ko: t.client, vi: '' };
      } else if (src === 'part') {
        const t = scenarioTurn(sid, a);
        const p = t && splitParts(t.modelAnswer)[Number(b)];
        line = p ? { ko: p, vi: '' } : undefined;
      }
      return line ? { key, kind: 'listen', ko: line.ko, render: (r) => lineDrill(key, line.ko, line.vi, r) } : null;
    }
    default:
      return null;
  }
}

export function WeakPage() {
  const shadowing = useContent('shadowing');
  const patterns = useContent('patterns');
  const scenarios = useContent('scenarios');
  const vocab = useContent('vocab');
  const numbers = useContent('numbers');
  const interpret = useContent('interpret');
  const messages = useContent('messages');
  const meetings = useContent('meetings');
  const states = [shadowing, patterns, scenarios, vocab, numbers, interpret, messages, meetings];

  return (
    <div className="stack">
      <Link to="/progress" className="back-link">
        ← {vi.common.back}
      </Link>
      <h1>{vi.weak.title}</h1>
      {shadowing.status === 'ready' &&
      patterns.status === 'ready' &&
      scenarios.status === 'ready' &&
      vocab.status === 'ready' &&
      numbers.status === 'ready' &&
      interpret.status === 'ready' &&
      messages.status === 'ready' &&
      meetings.status === 'ready' ? (
        <WeakSession
          content={{
            shadowing: shadowing.items,
            patterns: patterns.items,
            scenarios: scenarios.items,
            vocab: vocab.items,
            numbers: numbers.items,
            interpret: interpret.items,
            messages: messages.items,
            meetings: meetings.items,
          }}
        />
      ) : states.some((s) => s.status === 'error') ? (
        <p className="error">{vi.common.loadError}</p>
      ) : (
        <p className="muted">{vi.common.loading}</p>
      )}
    </div>
  );
}

function WeakSession({ content }: { content: Content }) {
  // Frozen at the start so items don't vanish while they're being re-rated. Keys whose
  // content is gone are dropped before the limit so they don't take a slot.
  const [items] = useState(() =>
    weakKeys(getProgressSnapshot().srs, Infinity)
      .map((k) => resolve(k, content))
      .filter((x): x is WeakItem => x !== null)
      .slice(0, WEAK_LIMIT),
  );
  const [index, setIndex] = useState<number | null>(null);
  const [rated, setRated] = useState(false);

  if (items.length === 0) {
    return (
      <section className="card center stack-sm">
        <h2>{vi.weak.emptyTitle}</h2>
        <p className="muted">{vi.weak.empty}</p>
        <Link to="/daily" className="btn">
          {vi.home.dailyTitle}
        </Link>
      </section>
    );
  }

  if (index === null) {
    return (
      <>
        <p className="muted">{vi.weak.intro(items.length)}</p>
        <button type="button" className="btn" onClick={() => setIndex(0)}>
          {vi.weak.start}
        </button>
        <ul className="list weak-list">
          {items.map((it, i) => (
            <li key={it.key}>
              <button type="button" className="card weak-item" onClick={() => setIndex(i)}>
                <span className="badge">{vi.weak.kinds[it.kind]}</span>
                <span lang="ko" className="weak-ko">
                  {it.ko}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </>
    );
  }

  if (index >= items.length) {
    return (
      <section className="card center stack-sm">
        <h2>{vi.weak.doneTitle}</h2>
        <p className="muted">{vi.weak.done}</p>
        <Link to="/progress" className="btn btn--ghost">
          {vi.weak.toProgress}
        </Link>
      </section>
    );
  }

  const item = items[index];
  const next = () => {
    setIndex(index + 1);
    setRated(false);
  };
  return (
    <>
      <div className="row-between">
        <span className="badge">{vi.weak.kinds[item.kind]}</span>
        <span className="muted small">{vi.practice.of(index + 1, items.length)}</span>
      </div>
      <div className="bar" aria-hidden>
        <div className="bar-fill" style={{ width: `${(100 * index) / items.length}%` }} />
      </div>
      <div key={item.key}>{item.render(() => setRated(true))}</div>
      <div className="row daily-nav">
        <button type="button" className="btn btn--ghost" onClick={next}>
          {vi.daily.skip}
        </button>
        <button type="button" className="btn" disabled={!rated} onClick={next}>
          {index + 1 === items.length ? vi.common.finish : vi.daily.next}
        </button>
      </div>
    </>
  );
}
