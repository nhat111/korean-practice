import { useState } from 'react';
import { Link } from 'react-router';
import { Icon, type IconName } from './Icon';
import { useContent } from '../data/content';
import { vi } from '../i18n/vi';
import {
  buildPath,
  currentWeek,
  stepLink,
  stepProgress,
  type PathContent,
  type PathStep,
  type StepKind,
} from '../practice/path';
import { todayKey } from '../srs/sm2';
import { setPathStart, usePrefs } from '../storage/prefs';
import { useProgress } from '../storage/progress';

const KIND_ICON: Record<StepKind, { icon: IconName; tone: string }> = {
  shadowing: { icon: 'waves', tone: 'blue' },
  scenarios: { icon: 'chat', tone: 'red' },
  interpret: { icon: 'languages', tone: 'violet' },
  messages: { icon: 'mail', tone: 'amber' },
  numbers: { icon: 'headphones', tone: 'teal' },
  meetings: { icon: 'headphones', tone: 'teal' },
};

/** Home "Lộ trình 4 tuần": start it once, then a week at a time with per-step progress. */
export function PathCard() {
  const prefs = usePrefs();
  const start = prefs.pathStart;

  if (!start) {
    return (
      <section className="card stack-sm path-card">
        <h2>{vi.path.title}</h2>
        <p className="muted small">{vi.path.intro}</p>
        <ol className="path-preview">
          {vi.path.weeks.map((w, i) => (
            <li key={w.title}>
              <span className="path-week-no">{i + 1}</span>
              {w.title}
            </li>
          ))}
        </ol>
        <button type="button" className="btn btn--ghost" onClick={() => setPathStart(todayKey())}>
          <Icon name="flag" size={18} /> {vi.path.start}
        </button>
      </section>
    );
  }
  return <PathWeeks start={start} role={prefs.profile?.role} />;
}

function PathWeeks({ start, role }: { start: string; role: string | undefined }) {
  const now = currentWeek(start, todayKey());
  const [week, setWeek] = useState(now);
  const content = usePathContent();
  const progress = useProgress();
  const steps = buildPath(role)[week];
  const info = vi.path.weeks[week];
  const rows = content
    ? steps.map((s) => ({ step: s, p: stepProgress(s, content, { srs: progress.srs, scenarios: progress.scenarios }) }))
    : null;
  const doneCount = rows?.filter((r) => r.p.complete).length ?? 0;

  return (
    <section className="card stack-sm path-card">
      <div className="row-between">
        <h2>{vi.path.title}</h2>
        <span className="badge">{vi.path.weekOf(now + 1, vi.path.weeks.length)}</span>
      </div>
      <div className="segmented path-tabs" role="tablist">
        {vi.path.weeks.map((w, i) => (
          <button
            key={w.title}
            type="button"
            role="tab"
            aria-selected={week === i}
            className={week === i ? 'active' : ''}
            onClick={() => setWeek(i)}
          >
            {vi.path.weekTab(i + 1)}
          </button>
        ))}
      </div>
      <div className="stack-xs">
        <div className="row-between">
          <strong>{info.title}</strong>
          {rows && <span className="muted small">{vi.path.weekDone(doneCount, rows.length)}</span>}
        </div>
        <p className="muted small">{info.desc}</p>
      </div>
      {rows && (
        <ul className="path-steps">
          {rows.map(({ step, p }) => (
            <li key={step.id}>
              <StepRow step={step} done={p.done} target={p.target} complete={p.complete} to={stepLink(step, p.nextTopic)} />
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className="link-btn small"
        onClick={() => {
          if (window.confirm(vi.path.restartConfirm)) setPathStart(todayKey());
        }}
      >
        {vi.path.restart}
      </button>
    </section>
  );
}

function StepRow({
  step,
  done,
  target,
  complete,
  to,
}: {
  step: PathStep;
  done: number;
  target: number;
  complete: boolean;
  to: string;
}) {
  const { icon, tone } = KIND_ICON[step.kind];
  return (
    <Link to={to} className={complete ? 'path-step path-step--done' : 'path-step'}>
      <span className={`card-icon card-icon--${tone}`}>
        <Icon name={complete ? 'check' : icon} size={18} />
      </span>
      <span className="path-step-body">
        <span className="path-step-label">{vi.path.steps[step.id]}</span>
        <span className="bar" aria-hidden>
          <span className="bar-fill" style={{ width: `${target ? (100 * done) / target : 0}%` }} />
        </span>
      </span>
      <span className="muted small path-step-count">
        {complete ? <span className="sr-only">{vi.path.stepDone} </span> : null}
        {vi.path.stepCount(done, target)}
      </span>
    </Link>
  );
}

/** Ids and topics of the content the path uses; null until every file is loaded. */
function usePathContent(): PathContent | null {
  const shadowing = useContent('shadowing');
  const scenarios = useContent('scenarios');
  const interpret = useContent('interpret');
  const messages = useContent('messages');
  const numbers = useContent('numbers');
  const meetings = useContent('meetings');
  if (
    shadowing.status !== 'ready' ||
    scenarios.status !== 'ready' ||
    interpret.status !== 'ready' ||
    messages.status !== 'ready' ||
    numbers.status !== 'ready' ||
    meetings.status !== 'ready'
  ) {
    return null;
  }
  return {
    shadowing: shadowing.items,
    scenarios: scenarios.items,
    interpret: interpret.items,
    messages: messages.items,
    numbers: numbers.items,
    meetings: meetings.items,
  };
}
