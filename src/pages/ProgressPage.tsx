import { useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '../components/Icon';
import { ProgressRing } from '../components/ProgressRing';
import { WeekChart } from '../components/WeekChart';
import { useContent } from '../data/content';
import { vi } from '../i18n/vi';
import { streak } from '../practice/plan';
import { overallPercent, skillProgress, type SkillProgress } from '../practice/today';
import { lastDays, weakKeys } from '../practice/weak';
import { isDue, isMastered, todayKey } from '../srs/sm2';
import { resetProgress, useProgress } from '../storage/progress';

export function ProgressPage() {
  const progress = useProgress();
  const vocab = useContent('vocab');
  const scenarios = useContent('scenarios');
  const emails = useContent('emails');
  const shadowing = useContent('shadowing');
  const patterns = useContent('patterns');
  const numbers = useContent('numbers');
  const meetings = useContent('meetings');
  const interpret = useContent('interpret');
  const messages = useContent('messages');
  const today = todayKey();
  const ids = (st: { status: string; items?: { id: string }[] }) =>
    st.status === 'ready' && st.items ? st.items.map((x) => x.id) : null;
  const all = [shadowing, patterns, scenarios, numbers, meetings, interpret, messages, vocab].map(ids);
  const skills: SkillProgress[] | null = all.every((x) => x !== null)
    ? skillProgress(
        {
          shadowing: all[0] ?? [],
          patterns: all[1] ?? [],
          scenarios: all[2] ?? [],
          numbers: all[3] ?? [],
          meetings: all[4] ?? [],
          interpret: all[5] ?? [],
          messages: all[6] ?? [],
          vocab: all[7] ?? [],
        },
        { srs: progress.srs, cards: progress.cards, scenarios: progress.scenarios },
      )
    : null;
  const week = lastDays(progress.daily, today);
  const weak = weakKeys(progress.srs).length;

  const vocabIds = vocab.status === 'ready' ? vocab.items.map((v) => v.id) : [];
  const cards = vocabIds.map((id) => progress.cards[id]).filter((c) => c !== undefined);
  const learned = cards.length;
  const mastered = cards.filter(isMastered).length;
  const due = cards.filter((c) => isDue(c, today)).length;

  const scenarioResults = Object.values(progress.scenarios);
  const avg =
    scenarioResults.length > 0
      ? Math.round(
          (100 * scenarioResults.reduce((s, r) => s + r.bestScore / r.totalTurns, 0)) /
            scenarioResults.length,
        )
      : 0;

  const [weekAgo] = useState(() => Date.now() - 7 * 24 * 60 * 60 * 1000);
  const speakingWeek = progress.speaking.filter((a) => Date.parse(a.at) >= weekAgo).length;
  const scored = progress.speaking.filter((a) => a.score !== undefined);
  const avgSpeaking =
    scored.length > 0
      ? `${Math.round(scored.reduce((s, a) => s + (a.score ?? 0), 0) / scored.length)}%`
      : '–';

  const drills = Object.entries(progress.srs).filter(([k]) => k.startsWith('shadowing:') || k.startsWith('pattern:'));
  const drillsDue = drills.filter(([, c]) => isDue(c, today)).length;
  const recordMinutes = Math.round(Object.values(progress.daily).reduce((n, d) => n + (d.recordMs || 0), 0) / 60000);

  const total = (s: { status: string; items?: unknown[] }) =>
    s.status === 'ready' && s.items ? s.items.length : '…';

  return (
    <div className="stack">
      <h1>{vi.progress.title}</h1>

      {skills && <Overview skills={skills} />}

      <section className="card stack-sm">
        <h2>{vi.progress.week}</h2>
        {week.some((d) => d.minutes > 0) ? (
          <WeekChart days={week} />
        ) : (
          <p className="muted small">{vi.progress.weekEmpty}</p>
        )}
      </section>

      <Link to="/weak" className="card card--link weak-cta">
        <span className="card-icon">
          <Icon name="target" />
        </span>
        <div>
          <h2>{vi.weak.title}</h2>
          <p className="muted">{weak > 0 ? vi.weak.count(weak) : vi.weak.none}</p>
        </div>
      </Link>

      <section className="card stack-sm">
        <h2>{vi.progress.vocab}</h2>
        <div className="stats">
          <Stat label={vi.progress.learned} value={`${learned}/${total(vocab)}`} />
          <Stat label={vi.progress.mastered} value={mastered} />
          <Stat label={vi.progress.dueToday} value={due} />
        </div>
        {vocab.status === 'ready' && vocab.items.length > 0 && (
          <div className="bar" aria-hidden>
            <div className="bar-fill" style={{ width: `${(100 * learned) / vocab.items.length}%` }} />
          </div>
        )}
      </section>

      <section className="card stack-sm">
        <h2>{vi.progress.scenarios}</h2>
        <div className="stats">
          <Stat label={vi.progress.completed} value={`${scenarioResults.length}/${total(scenarios)}`} />
          <Stat label={vi.progress.avgScore} value={`${avg}%`} />
        </div>
      </section>

      <section className="card stack-sm">
        <h2>{vi.progress.emails}</h2>
        <div className="stats">
          <Stat
            label={vi.progress.completed}
            value={`${Object.keys(progress.emails).length}/${total(emails)}`}
          />
        </div>
      </section>

      <section className="card stack-sm">
        <h2>{vi.progress.speaking}</h2>
        <div className="stats">
          <Stat label={vi.progress.attempts} value={progress.speaking.length} />
          <Stat label={vi.progress.last7Days} value={speakingWeek} />
          <Stat label={vi.progress.avgSpeakingScore} value={avgSpeaking} />
        </div>
        <div className="stats">
          <Stat label={vi.progress.streak} value={streak(progress.daily, today)} />
          <Stat label={vi.progress.minutesTotal} value={recordMinutes} />
        </div>
      </section>

      <section className="card stack-sm">
        <h2>{vi.progress.drills}</h2>
        <div className="stats">
          <Stat label={vi.progress.drillsPracticed} value={drills.length} />
          <Stat label={vi.progress.drillsDue} value={drillsDue} />
        </div>
      </section>

      <p className="muted small">{vi.progress.storageNote}</p>
      <button
        type="button"
        className="btn btn--ghost btn--danger"
        onClick={() => {
          if (window.confirm(vi.progress.resetConfirm)) resetProgress();
        }}
      >
        {vi.progress.reset}
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function Overview({ skills }: { skills: SkillProgress[] }) {
  const percent = overallPercent(skills);
  const done = skills.reduce((n, x) => n + x.done, 0);
  const total = skills.reduce((n, x) => n + x.total, 0);
  return (
    <section className="card stack-sm">
      <h2>{vi.progress.overview}</h2>
      <div className="overview-head">
        <ProgressRing percent={percent} label={vi.progress.overviewLabel} />
        <div className="stack-xs">
          <strong className="overview-title">{done === 0 ? vi.progress.overviewStart : vi.progress.overviewTitle(done)}</strong>
          <p className="muted small">{done === 0 ? vi.progress.overviewStartDesc : vi.progress.overviewDesc(total)}</p>
        </div>
      </div>
      <ul className="skill-bars">
        {skills.map((x) => (
          <li key={x.key} className="skill-bar">
            <span>{vi.progress.skills[x.key]}</span>
            <span className="bar" aria-hidden>
              <span className="bar-fill" style={{ width: `${x.total ? (100 * x.done) / x.total : 0}%` }} />
            </span>
            <span className="muted small skill-count">
              {x.done}/{x.total}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
