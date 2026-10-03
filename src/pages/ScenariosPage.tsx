import { Link } from 'react-router';
import { ContentGate } from '../components/ContentGate';
import { useContent } from '../data/content';
import { vi } from '../i18n/vi';
import { useProgress } from '../storage/progress';

export function ScenariosPage() {
  const state = useContent('scenarios');
  const progress = useProgress();

  return (
    <div className="stack">
      <h1>{vi.scenarios.title}</h1>
      <ContentGate state={state}>
        {(items) =>
          items.length === 0 ? (
            <p className="muted">{vi.common.empty}</p>
          ) : (
            <ul className="list">
              {items.map((s) => {
                const result = progress.scenarios[s.id];
                return (
                  <li key={s.id}>
                    <Link to={`/scenarios/${s.id}`} className="card card--link">
                      <h2>{s.title}</h2>
                      <p lang="ko" className="ko-sub">
                        {s.titleKo}
                      </p>
                      <p className="muted">{s.description}</p>
                      <div className="meta">
                        <span className="badge">{vi.scenarios.turns(s.turns.length)}</span>
                        <span className={result ? 'badge badge--ok' : 'badge'}>
                          {result
                            ? vi.scenarios.best(result.bestScore, result.totalTurns)
                            : vi.scenarios.notPlayed}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )
        }
      </ContentGate>
    </div>
  );
}
