import { Link } from 'react-router';
import { ContentGate } from '../components/ContentGate';
import { useContent } from '../data/content';
import { vi } from '../i18n/vi';

export function SongsPage() {
  const state = useContent('songs');
  return (
    <div className="stack">
      <header className="stack-xs">
        <h1>{vi.songs.title}</h1>
        <p className="muted">{vi.songs.intro}</p>
      </header>
      <ContentGate state={state}>
        {(items) => (
          <ul className="list">
            {[...items]
              .sort((a, b) => a.year - b.year)
              .map((s) => (
                <li key={s.id}>
                  <Link to={`/songs/${s.id}`} className="card card--link song-card">
                    <span className="song-year">{s.year}</span>
                    <div className="stack-xs">
                      <h2 lang="ko">{s.title}</h2>
                      <p className="muted small">{s.artist}</p>
                      <div className="meta">
                        {s.grammar.map((g) => (
                          <span key={g.pattern} className="badge" lang="ko">
                            {g.pattern}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </ContentGate>
    </div>
  );
}
