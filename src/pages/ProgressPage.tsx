import { useContent } from '../data/content';
import { vi } from '../i18n/vi';
import { isDue, isMastered, todayKey } from '../srs/sm2';
import { resetProgress, useProgress } from '../storage/progress';

export function ProgressPage() {
  const progress = useProgress();
  const vocab = useContent('vocab');
  const scenarios = useContent('scenarios');
  const emails = useContent('emails');
  const today = todayKey();

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

  const total = (s: { status: string; items?: unknown[] }) =>
    s.status === 'ready' && s.items ? s.items.length : '…';

  return (
    <div className="stack">
      <h1>{vi.progress.title}</h1>

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
