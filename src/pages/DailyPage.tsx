import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { InterpretCard } from '../components/InterpretCard';
import { ListenChoice } from '../components/ListenChoice';
import { saveListenResult } from '../practice/listenResult';
import { ListenPlayer } from '../components/ListenPlayer';
import { trackEvent } from '../analytics';
import { PatternDrill } from '../components/PatternDrill';
import { ScenarioTurnDrill } from '../components/ScenarioTurnDrill';
import { ShadowingCard } from '../components/ShadowingCard';
import { useContent } from '../data/content';
import { vi } from '../i18n/vi';
import { numberQuestion } from '../practice/listening';
import { ROLE_FOCUS } from '../practice/decks';
import { buildDailyPlan, type DailyContent, type DailyStep } from '../practice/plan';
import { todayKey } from '../srs/sm2';
import { getPrefs } from '../storage/prefs';
import { getProgressSnapshot, useProgress } from '../storage/progress';
import type { NumberItem } from '../types';

export function DailyPage() {
  const shadowing = useContent('shadowing');
  const patterns = useContent('patterns');
  const scenarios = useContent('scenarios');
  const numbers = useContent('numbers');
  const interpret = useContent('interpret');
  const states = [shadowing, patterns, scenarios, numbers, interpret];

  return (
    <div className="stack">
      <h1>{vi.growth.dailyTitle(getPrefs().profile?.minutes ?? 5)}</h1>
      {shadowing.status === 'ready' &&
      patterns.status === 'ready' &&
      scenarios.status === 'ready' &&
      numbers.status === 'ready' &&
      interpret.status === 'ready' ? (
        <DailySession
          content={{
            shadowing: shadowing.items,
            patterns: patterns.items,
            scenarios: scenarios.items,
            numbers: numbers.items,
            interpret: interpret.items,
          }}
        />
      ) : states.some((s) => s.status === 'error') ? (
        <p className="error">{vi.daily.empty}</p>
      ) : (
        <p className="muted">{vi.common.loading}</p>
      )}
    </div>
  );
}

function DailySession({ content }: { content: DailyContent }) {
  const profile = getPrefs().profile;
  const scale = (profile?.minutes ?? 5) / 5;
  const focus = profile ? ROLE_FOCUS[profile.role] : undefined;
  const [round, setRound] = useState(0);
  // The plan is fixed for the session; "again" builds a new one.
  const [plan, setPlan] = useState(() => buildDailyPlan(content, getProgressSnapshot().srs, todayKey(), Math.random, scale, focus));
  const [index, setIndex] = useState(0);
  const [rated, setRated] = useState(false);

  function next() {
    setIndex((i) => i + 1);
    setRated(false);
  }

  function again() {
    setPlan(buildDailyPlan(content, getProgressSnapshot().srs, todayKey(), Math.random, scale, focus));
    setIndex(0);
    setRated(false);
    setRound((r) => r + 1);
  }

  if (plan.length === 0) return <p className="muted">{vi.daily.empty}</p>;
  if (index >= plan.length) return <DailyDone onAgain={again} />;

  const step = plan[index];
  return (
    <>
      <p className="muted small">{vi.daily.intro}</p>
      <div className="row-between">
        <span className="badge">{vi.daily.kind[step.kind]}</span>
        <span className="muted small">{vi.daily.step(index + 1, plan.length)}</span>
      </div>
      <div className="bar" aria-hidden>
        <div className="bar-fill" style={{ width: `${(100 * index) / plan.length}%` }} />
      </div>
      <Step key={`${round}:${index}`} step={step} content={content} onRated={() => setRated(true)} />
      <div className="row daily-nav">
        <button type="button" className="btn btn--ghost" onClick={next}>
          {vi.daily.skip}
        </button>
        <button type="button" className="btn" disabled={!rated} onClick={next}>
          {index + 1 === plan.length ? vi.common.finish : vi.daily.next}
        </button>
      </div>
      {!rated && <p className="muted small">{vi.daily.rateFirst}</p>}
    </>
  );
}

function Step({ step, content, onRated }: { step: DailyStep; content: DailyContent; onRated: () => void }) {
  switch (step.kind) {
    case 'shadowing':
    case 'survival': {
      const item = content.shadowing.find((s) => s.id === step.id);
      return item ? <ShadowingCard item={item} onRated={onRated} /> : null;
    }
    case 'pattern': {
      const item = content.patterns.find((p) => p.id === step.id);
      return item ? <PatternDrill item={item} onRated={onRated} /> : null;
    }
    case 'listen': {
      const item = content.numbers?.find((n) => n.id === step.id);
      return item ? <ListenStep item={item} onDone={onRated} /> : null;
    }
    case 'interpret': {
      const item = content.interpret?.find((i) => i.id === step.id);
      return item ? <InterpretCard item={item} direction="vi-ko" onRated={onRated} /> : null;
    }
    case 'scenario': {
      const scenario = content.scenarios.find((s) => s.id === step.id);
      return scenario?.turns[step.turn] ? (
        <ScenarioTurnDrill scenario={scenario} turn={step.turn} onRated={onRated} />
      ) : null;
    }
  }
}

/** One "Số, ngày giờ" question; answering it (right or wrong) completes the step. */
function ListenStep({ item, onDone }: { item: NumberItem; onDone: () => void }) {
  const [q] = useState(() => numberQuestion(item));
  return (
    <section className="card stack-sm">
      <ListenPlayer ko={q.ko} />
      <ListenChoice
        q={q}
        prompt={vi.listening.pickNumber}
        onAnswer={(ok) => {
          saveListenResult(q.key, ok);
          onDone();
        }}
      />
    </section>
  );
}

function DailyDone({ onAgain }: { onAgain: () => void }) {
  const { daily } = useProgress();
  useEffect(() => trackEvent('daily_done', { minutes: getPrefs().profile?.minutes ?? 5 }), []);
  const today = daily[todayKey()];
  const minutes = ((today?.recordMs ?? 0) / 60000).toFixed(1);
  return (
    <section className="card center stack-sm">
      <h2>{vi.daily.doneTitle}</h2>
      <p>{vi.daily.doneStats(today?.spoken ?? 0, minutes)}</p>
      <div className="row row--center">
        <button type="button" className="btn" onClick={onAgain}>
          {vi.daily.again}
        </button>
        <Link to="/" className="btn btn--ghost">
          {vi.daily.home}
        </Link>
      </div>
    </section>
  );
}
