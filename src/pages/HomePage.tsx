import { Link } from 'react-router';
import { Icon, type IconName } from '../components/Icon';
import { useContent } from '../data/content';
import { vi } from '../i18n/vi';
import { isDue, todayKey } from '../srs/sm2';
import { useBackendSettings } from '../storage/backend';
import { useProgress } from '../storage/progress';

interface Section {
  to: string;
  icon: IconName;
  title: string;
  desc: string;
}

const SECTIONS: Section[] = [
  { to: '/scenarios', icon: 'chat', title: vi.nav.scenarios, desc: vi.home.sections.scenarios },
  { to: '/emails', icon: 'mail', title: vi.nav.emails, desc: vi.home.sections.emails },
  { to: '/flashcards', icon: 'cards', title: vi.nav.flashcards, desc: vi.home.sections.flashcards },
  { to: '/speaking', icon: 'mic', title: vi.nav.speaking, desc: vi.home.sections.speaking },
  { to: '/progress', icon: 'chart', title: vi.nav.progress, desc: vi.home.sections.progress },
];

// Shown only when an optional backend is configured.
const AI_SECTION: Section = { to: '/ai-roleplay', icon: 'bot', title: vi.aiRoleplay.title, desc: vi.aiRoleplay.homeDesc };

export function HomePage() {
  const backend = useBackendSettings();
  const sections = backend.url ? [...SECTIONS, AI_SECTION] : SECTIONS;
  const vocab = useContent('vocab');
  const progress = useProgress();
  const today = todayKey();
  const due =
    vocab.status === 'ready'
      ? vocab.items.filter((v) => isDue(progress.cards[v.id], today)).length
      : 0;
  const stats = [
    { value: due, label: vi.home.statDue },
    { value: Object.keys(progress.cards).length, label: vi.home.statLearned },
    { value: Object.keys(progress.scenarios).length, label: vi.home.statScenarios },
  ];

  return (
    <div className="stack">
      <section className="hero">
        <h1>{vi.home.greeting}</h1>
        <p>{vi.home.intro}</p>
        <div className="hero-stats">
          {stats.map((s) => (
            <div key={s.label} className="hero-stat">
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
        {vocab.status === 'ready' && (
          <Link to="/flashcards" className="pill">
            {due > 0 ? vi.home.dueToday(due) : vi.home.noDue}
          </Link>
        )}
      </section>
      <h2 className="section-title">{vi.home.practice}</h2>
      <div className="grid">
        {sections.map((s) => (
          <Link key={s.to} to={s.to} className="card card--link">
            <span className="card-icon">
              <Icon name={s.icon} />
            </span>
            <h2>{s.title}</h2>
            <p className="muted">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
