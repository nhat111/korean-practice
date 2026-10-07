import { Link } from 'react-router';
import { Icon, type IconName } from '../components/Icon';
import { useContent } from '../data/content';
import { vi } from '../i18n/vi';
import { streak } from '../practice/plan';
import { weakKeys } from '../practice/weak';
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
  { to: '/shadowing', icon: 'waves', title: vi.shadowing.title, desc: vi.home.sections.shadowing },
  { to: '/patterns', icon: 'puzzle', title: vi.patterns.title, desc: vi.home.sections.patterns },
  { to: '/listening', icon: 'headphones', title: vi.listening.title, desc: vi.listening.homeDesc },
  { to: '/interpret', icon: 'languages', title: vi.interpret.title, desc: vi.interpret.homeDesc },
  { to: '/scenarios', icon: 'chat', title: vi.nav.scenarios, desc: vi.home.sections.scenarios },
  { to: '/emails', icon: 'mail', title: vi.nav.emails, desc: vi.home.sections.emails },
  { to: '/flashcards', icon: 'cards', title: vi.nav.flashcards, desc: vi.home.sections.flashcards },
  { to: '/speaking', icon: 'mic', title: vi.nav.speaking, desc: vi.home.sections.speaking },
  { to: '/songs', icon: 'music', title: vi.songs.title, desc: vi.home.sections.songs },
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
  const todayStats = progress.daily[today];
  const days = streak(progress.daily, today);
  const weak = weakKeys(progress.srs).length;
  const stats = [
    { value: days, label: vi.home.statStreak },
    { value: todayStats?.spoken ?? 0, label: vi.home.statSpokenToday },
    { value: Math.round(Object.values(progress.daily).reduce((n, d) => n + (d.recordMs || 0), 0) / 60000), label: vi.home.statMinutes },
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
        <p className="streak">
          <Icon name="flame" size={18} /> {vi.home.streak(days)}
        </p>
        {vocab.status === 'ready' && (
          <Link to="/flashcards" className="pill">
            {due > 0 ? vi.home.dueToday(due) : vi.home.noDue}
          </Link>
        )}
      </section>
      <Link to="/daily" className="card card--link daily-cta">
        <span className="card-icon">
          <Icon name="zap" />
        </span>
        <div>
          <h2>{vi.home.dailyTitle}</h2>
          <p className="muted">{(todayStats?.spoken ?? 0) > 0 ? vi.home.dailyDone : vi.home.dailyDesc}</p>
        </div>
      </Link>
      {weak > 0 && (
        <Link to="/weak" className="card card--link weak-cta">
          <span className="card-icon">
            <Icon name="target" />
          </span>
          <div>
            <h2>{vi.weak.title}</h2>
            <p className="muted">{vi.weak.count(weak)}</p>
          </div>
        </Link>
      )}
      <Link to="/shadowing?topic=survival" className="card card--link survival-card">
        <span className="card-icon">
          <Icon name="lifebuoy" />
        </span>
        <div>
          <h2>{vi.home.survivalTitle}</h2>
          <p className="muted">{vi.home.survivalDesc}</p>
        </div>
      </Link>
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
