import { useState } from 'react';
import { Link } from 'react-router';
import { Icon, type IconName } from '../components/Icon';
import { InstallHint } from '../components/InstallHint';
import { PathCard } from '../components/PathCard';
import { KoreanLine, SpeakButton } from '../components/SpeakButton';
import { WeekDots } from '../components/WeekDots';
import { Welcome } from '../components/Welcome';
import { useContent, type ContentKind } from '../data/content';
import { vi } from '../i18n/vi';
import { streak } from '../practice/plan';
import { dailyTarget, greetingSlot, itemOfDay, planRecipe, weekDays, type RecipeKind } from '../practice/today';
import { weakKeys } from '../practice/weak';
import { isDue, todayKey } from '../srs/sm2';
import { useBackendSettings } from '../storage/backend';
import { usePrefs, type Role } from '../storage/prefs';
import { useProgress } from '../storage/progress';
import type { VocabItem } from '../types';

/** Icon colour per skill (`.card-icon--<tone>` in index.css). */
type Tone = 'blue' | 'teal' | 'violet' | 'red' | 'amber' | 'green';

interface Section {
  to: string;
  icon: IconName;
  title: string;
  desc: string;
  tone: Tone;
  /** Content files whose item counts show as a badge. */
  count?: { kinds: ContentKind[]; label: (n: number) => string };
}

const RECIPE_ICONS: Record<RecipeKind, IconName> = {
  shadowing: 'waves',
  pattern: 'puzzle',
  survival: 'lifebuoy',
  scenario: 'chat',
  listen: 'headphones',
  interpret: 'languages',
  message: 'mail',
  grammar: 'book',
  meeting: 'headphones',
};

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

// Six main entries; the rest (patterns, grammar, progress…) live under the tabs.
const SECTIONS: Section[] = [
  { to: '/shadowing', icon: 'waves', title: vi.shadowing.title, desc: vi.home.cards.shadowing, tone: 'blue',
    count: { kinds: ['shadowing'], label: vi.home.counts.sentences } },
  { to: '/listening', icon: 'headphones', title: vi.listening.title, desc: vi.home.cards.listening, tone: 'teal',
    count: { kinds: ['numbers', 'meetings'], label: vi.home.counts.lessons } },
  { to: '/interpret', icon: 'languages', title: vi.interpret.title, desc: vi.home.cards.interpret, tone: 'violet',
    count: { kinds: ['interpret'], label: vi.home.counts.sentences } },
  { to: '/scenarios', icon: 'chat', title: vi.nav.scenarios, desc: vi.home.cards.scenarios, tone: 'red',
    count: { kinds: ['scenarios'], label: vi.home.counts.lessons } },
  { to: '/flashcards', icon: 'cards', title: vi.nav.flashcards, desc: vi.home.cards.flashcards, tone: 'amber',
    count: { kinds: ['vocab'], label: vi.home.counts.words } },
  { to: '/emails', icon: 'mail', title: vi.nav.emails, desc: vi.home.cards.emails, tone: 'green',
    count: { kinds: ['emails'], label: vi.home.counts.lessons } },
];

// Shown only when an optional backend is configured.
const AI_SECTION: Section = { to: '/ai-roleplay', icon: 'bot', title: vi.aiRoleplay.title, desc: vi.home.cards.ai, tone: 'blue' };

export function HomePage() {
  const backend = useBackendSettings();
  // Read once per visit: the greeting and date line don't need to tick.
  const [now] = useState(() => new Date());
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
  const target = dailyTarget(minutes / 5);
  const done = todayStats?.reviews ?? 0;
  const ctaLabel = done === 0 ? vi.home.today.start : done < target ? vi.home.today.continue : vi.home.today.more;
  const word = vocab.status === 'ready' ? itemOfDay(vocab.items, today) : undefined;
  const greeting = vi.home.greetings[greetingSlot(now.getHours())];
  const stats = [
    { value: days, label: vi.home.statStreak },
    { value: todayStats?.spoken ?? 0, label: vi.home.statSpokenToday },
    { value: Math.round(Object.values(progress.daily).reduce((n, d) => n + (d.recordMs || 0), 0) / 60000), label: vi.home.statMinutes },
  ];

  return (
    // Two columns on wide screens (.home-layout): today on the left, everything else on the right.
    <div className="home-layout">
      <div className="stack home-col">
        <section className="hero">
          <p className="hero-date mono">{vi.home.heroDate(vi.home.weekdays[(now.getDay() + 6) % 7], `${now.getDate()}/${now.getMonth() + 1}`)}</p>
          <div className="hero-greet">
            <h1 lang="ko">
              {greeting.ko}
              <span className="type-cursor" aria-hidden="true" />
            </h1>
            <SpeakButton text={greeting.ko} small />
          </div>
          <p className="hero-gloss">
            <strong>{greeting.vi}.</strong> {vi.home.heroText}
          </p>
          {stats.some((s) => s.value > 0) && (
            <ul className="hero-stats">
              {stats.map((s) => (
                <li key={s.label}>
                  <strong className="mono">{s.value}</strong> {s.label}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card stack-sm today-card">
          <div className="row-between">
            <h2>{vi.home.today.title}</h2>
            <span className="muted small">{vi.home.today.perDay(minutes)}</span>
          </div>
          <div className="row-between">
            <strong>{vi.home.today.count(done, target)}</strong>
            {done >= target && <span className="badge badge--ok">{vi.home.today.reached}</span>}
          </div>
          <div className="bar" aria-hidden>
            <div className="bar-fill" style={{ width: `${Math.min(100, (100 * done) / target)}%` }} />
          </div>
          <div className="stack-xs">
            <span className="muted small">{vi.home.today.recipeLabel}</span>
            <ul className="recipe">
              {planRecipe(minutes / 5).map((r) => (
                <li key={r.kind}>
                  <Icon name={RECIPE_ICONS[r.kind]} size={15} />
                  {vi.home.today.recipe[r.kind](r.count)}
                </li>
              ))}
            </ul>
          </div>
          <WeekDots days={weekDays(progress.daily, today)} />
          <Link to="/daily" className="btn">
            <Icon name="zap" size={18} /> {ctaLabel}
          </Link>
          {due > 0 && (
            <Link to="/flashcards" className="link-btn small">
              {vi.home.today.vocabDue(due)}
            </Link>
          )}
        </section>
        <PathCard />
      </div>
      <div className="stack home-col">
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
        {word && <WordOfDay word={word} />}
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
        <div className="grid grid--wide-3">
          {sections.map((s) => (
            <SectionCard key={s.to} section={s} />
          ))}
        </div>
        {FEEDBACK_URL && (
          <a href={FEEDBACK_URL} target="_blank" rel="noreferrer" className="link-btn small center feedback-link">
            {vi.growth.feedback}
          </a>
        )}
      </div>
    </div>
  );
}

function SectionCard({ section: s }: { section: Section }) {
  return (
    <Link to={s.to} className="card card--link section-card">
      <div className="row-between">
        <span className={`card-icon card-icon--${s.tone}`}>
          <Icon name={s.icon} />
        </span>
        {s.count && <ItemCount kinds={s.count.kinds} label={s.count.label} />}
      </div>
      <h2>{s.title}</h2>
      <p className="muted">{s.desc}</p>
    </Link>
  );
}

/** Total items in one or two content files; nothing until loaded. */
function ItemCount({ kinds, label }: { kinds: ContentKind[]; label: (n: number) => string }) {
  const a = useContent(kinds[0]);
  const b = useContent(kinds[1] ?? kinds[0]);
  if (a.status !== 'ready' || b.status !== 'ready') return null;
  const n = a.items.length + (kinds[1] ? b.items.length : 0);
  return <span className="count-badge">{label(n)}</span>;
}

function WordOfDay({ word }: { word: VocabItem }) {
  return (
    <section className="card stack-sm word-card">
      <span className="eyebrow">{vi.home.wordTitle}</span>
      <div className="row-between">
        <div className="stack-xs">
          <strong className="word-ko" lang="ko">
            {word.ko}
          </strong>
          {word.pron && (
            <span className="muted small" lang="ko">
              {word.pron}
            </span>
          )}
        </div>
        <SpeakButton text={word.ko} />
      </div>
      <p>{word.vi}</p>
      <KoreanLine text={word.example.ko} />
      <p className="muted small">{word.example.vi}</p>
      <Link to="/flashcards" className="link-btn small">
        {vi.home.wordMore}
      </Link>
    </section>
  );
}
