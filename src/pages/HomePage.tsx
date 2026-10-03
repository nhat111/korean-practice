import { Link } from 'react-router';
import { useContent } from '../data/content';
import { vi } from '../i18n/vi';
import { isDue, todayKey } from '../srs/sm2';
import { useProgress } from '../storage/progress';

const SECTIONS = [
  { to: '/scenarios', icon: '💬', title: vi.nav.scenarios, desc: vi.home.sections.scenarios },
  { to: '/emails', icon: '✉️', title: vi.nav.emails, desc: vi.home.sections.emails },
  { to: '/flashcards', icon: '🃏', title: vi.nav.flashcards, desc: vi.home.sections.flashcards },
  { to: '/progress', icon: '📈', title: vi.nav.progress, desc: vi.home.sections.progress },
];

export function HomePage() {
  const vocab = useContent('vocab');
  const progress = useProgress();
  const today = todayKey();
  const due =
    vocab.status === 'ready'
      ? vocab.items.filter((v) => isDue(progress.cards[v.id], today)).length
      : 0;

  return (
    <div className="stack">
      <section className="hero">
        <h1>{vi.home.greeting}</h1>
        <p>{vi.home.intro}</p>
        {vocab.status === 'ready' && (
          <Link to="/flashcards" className="pill">
            {due > 0 ? vi.home.dueToday(due) : vi.home.noDue}
          </Link>
        )}
      </section>
      <div className="grid">
        {SECTIONS.map((s) => (
          <Link key={s.to} to={s.to} className="card card--link">
            <span className="card-icon" aria-hidden>
              {s.icon}
            </span>
            <h2>{s.title}</h2>
            <p className="muted">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
