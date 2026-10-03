import { Link } from 'react-router';
import { ContentGate } from '../components/ContentGate';
import { useContent } from '../data/content';
import { vi } from '../i18n/vi';
import { useProgress } from '../storage/progress';

export function EmailsPage() {
  const state = useContent('emails');
  const progress = useProgress();

  return (
    <div className="stack">
      <h1>{vi.emails.title}</h1>
      <ContentGate state={state}>
        {(items) =>
          items.length === 0 ? (
            <p className="muted">{vi.common.empty}</p>
          ) : (
            <ul className="list">
              {items.map((e) => {
                const result = progress.emails[e.id];
                return (
                  <li key={e.id}>
                    <Link to={`/emails/${e.id}`} className="card card--link">
                      <h2>{e.title}</h2>
                      <p className="muted">{e.situation}</p>
                      <div className="meta">
                        <span className="badge" lang="ko">
                          {vi.politeness[e.politeness]}
                        </span>
                        <span className={result ? 'badge badge--ok' : 'badge'}>
                          {result ? vi.emails.done(result.attempts) : vi.emails.notDone}
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
