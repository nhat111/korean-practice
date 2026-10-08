import { useState } from 'react';
import { useNavigate } from 'react-router';
import { trackEvent } from '../analytics';
import { vi } from '../i18n/vi';
import {
  completeOnboarding,
  DAILY_MINUTES,
  LEVELS,
  ROLES,
  type DailyMinutes,
  type Level,
  type Role,
} from '../storage/prefs';
import { Icon, type IconName } from './Icon';

const BENEFITS: { icon: IconName; key: 'speak' | 'listen' | 'interpret' }[] = [
  { icon: 'mic', key: 'speak' },
  { icon: 'headphones', key: 'listen' },
  { icon: 'languages', key: 'interpret' },
];

/** First-run screen: what the app does, then role, TOPIK level and daily minutes. */
export function Welcome() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role | null>(null);
  const [level, setLevel] = useState<Level | null>(null);

  function skip() {
    completeOnboarding(null);
    trackEvent('onboarding', { skipped: true });
  }

  function finish(minutes: DailyMinutes) {
    if (!role || !level) return;
    completeOnboarding({ role, level, minutes });
    trackEvent('onboarding', { role, level, minutes });
    navigate('/daily');
  }

  if (step === 0) {
    return (
      <div className="stack welcome">
        <section className="hero stack-sm">
          <img className="welcome-logo" src="/favicon.svg" alt="" width="56" height="56" />
          <h1>{vi.welcome.title}</h1>
          <p>{vi.welcome.subtitle}</p>
        </section>
        <button type="button" className="btn" onClick={() => setStep(1)}>
          {vi.welcome.start}
        </button>
        <button type="button" className="link-btn center" onClick={skip}>
          {vi.welcome.skip}
        </button>
        <ul className="list welcome-benefits">
          {BENEFITS.map((b) => (
            <li key={b.key} className="card welcome-benefit">
              <span className="card-icon">
                <Icon name={b.icon} />
              </span>
              <div>
                <h2>{vi.welcome.benefits[b.key].title}</h2>
                <p className="muted small">{vi.welcome.benefits[b.key].desc}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="muted small center">{vi.welcome.free}</p>
      </div>
    );
  }

  const progress = <p className="muted small">{vi.welcome.stepOf(step, 3)}</p>;

  if (step === 1) {
    return (
      <div className="stack welcome">
        {progress}
        <h1>{vi.welcome.roleQuestion}</h1>
        <div className="welcome-options">
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              className={role === r ? 'welcome-option welcome-option--on' : 'welcome-option'}
              aria-pressed={role === r}
              onClick={() => {
                setRole(r);
                setStep(2);
              }}
            >
              <strong>{vi.welcome.roles[r].title}</strong>
              <span className="muted small">{vi.welcome.roles[r].desc}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="stack welcome">
        {progress}
        <h1>{vi.welcome.levelQuestion}</h1>
        <div className="welcome-options">
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              className={level === l ? 'welcome-option welcome-option--on' : 'welcome-option'}
              aria-pressed={level === l}
              onClick={() => {
                setLevel(l);
                setStep(3);
              }}
            >
              <strong>{vi.welcome.levels[l].title}</strong>
              <span className="muted small">{vi.welcome.levels[l].desc}</span>
            </button>
          ))}
        </div>
        <button type="button" className="link-btn" onClick={() => setStep(1)}>
          ← {vi.common.back}
        </button>
      </div>
    );
  }

  return (
    <div className="stack welcome">
      {progress}
      <h1>{vi.welcome.minutesQuestion}</h1>
      <div className="welcome-options">
        {DAILY_MINUTES.map((m) => (
          <button key={m} type="button" className="welcome-option" onClick={() => finish(m)}>
            <strong>{vi.welcome.minutes(m)}</strong>
            <span className="muted small">{vi.welcome.minutesDesc(m)}</span>
          </button>
        ))}
      </div>
      <button type="button" className="link-btn" onClick={() => setStep(2)}>
        ← {vi.common.back}
      </button>
    </div>
  );
}
