import { Link } from 'react-router';
import { Icon, type IconName } from '../components/Icon';
import { InstallHint } from '../components/InstallHint';
import { Welcome } from '../components/Welcome';
import { useContent } from '../data/content';
import { vi } from '../i18n/vi';
import { streak } from '../practice/plan';
import { weakKeys } from '../practice/weak';
import { isDue, todayKey } from '../srs/sm2';
import { useBackendSettings } from '../storage/backend';
import { usePrefs, type Role } from '../storage/prefs';
import { useProgress } from '../storage/progress';

interface Section {
  to: string;
  icon: IconName;
  title: string;
  desc: string;
}

/** Optional feedback form (e.g. a Google Form), set at build time; hidden when unset. */
const FEEDBACK_URL: string | undefined =
  typeof import.meta.env.VITE_FEEDBACK_URL === 'string' && import.meta.env.VITE_FEEDBACK_URL
    ? import.meta.env.VITE_FEEDBACK_URL
    : undefined;

/** "Gợi ý cho bạn" per role from the welcome screen. */
const SUGGESTIONS: Record<Role, { to: string; icon: IconName }> = {
  dev: { to: '/shadowing?topic=tech', icon: 'waves' },
  brse: { to: '/interpret', icon: 'languages' },
  tester: { to: '/scenarios?cat=qa', icon: 'chat' },
  interview: { to: '/scenarios?cat=interview', icon: 'chat' },
};

// Six main entries; the rest (patterns, songs, progress…) live under the tabs.
const SECTIONS: Section[] = [
  { to: '/shadowing', icon: 'waves', title: vi.shadowing.title, desc: vi.home.sections.shadowing },
  { to: '/listening', icon: 'headphones', title: vi.listening.title, desc: vi.listening.homeDesc },
  { to: '/interpret', icon: 'languages', title: vi.interpret.title, desc: vi.interpret.homeDesc },
  { to: '/scenarios', icon: 'chat', title: vi.nav.scenarios, desc: vi.home.sections.scenarios },
  { to: '/flashcards', icon: 'cards', title: vi.nav.flashcards, desc: vi.home.sections.flashcards },
  { to: '/emails', icon: 'mail', title: vi.nav.emails, desc: vi.home.sections.emails },
]

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
  const prefs = usePrefs();
  if (!prefs.onboarded) return <Welcome />;
  const minutes = prefs.profile?.minutes ?? 5;
  const suggestion = prefs.profile ? SUGGESTIONS[prefs.profile.role] : null;
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
          <h2>{vi.growth.dailyTitle(minutes)}</h2>
          <p className="muted">
            {(todayStats?.spoken ?? 0) > 0
              ? vi.home.dailyDone
              : minutes > 5
                ? vi.growth.dailyMinutes(minutes)
                : vi.home.dailyDesc}
          </p>
        </div>
      </Link>
      {suggestion && prefs.profile && (
        <Link to={suggestion.to} className="card card--link suggest-card">
          <span className="card-icon">
            <Icon name={suggestion.icon} />
          </span>
          <div>
            <h2>{vi.growth.suggestTitle}</h2>
            <p className="muted">{vi.growth.suggest[prefs.profile.role]}</p>
          </div>
        </Link>
      )}
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
      <InstallHint />
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
      {FEEDBACK_URL && (
        <a href={FEEDBACK_URL} target="_blank" rel="noreferrer" className="link-btn small center feedback-link">
          {vi.growth.feedback}
        </a>
      )}
    </div>
  );
}
