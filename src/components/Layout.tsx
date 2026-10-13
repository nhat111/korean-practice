import { useEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { BackendBanner } from './BackendBanner';
import { Icon, type IconName } from './Icon';
import { UpdateBanner } from './UpdateBanner';
import { vi } from '../i18n/vi';

// Five tabs; each also covers related pages (`also`) so the right tab stays
// highlighted. Pages without a tab (songs, emails…) are reached from Home or a tab page.
const NAV: { to: string; label: string; icon: IconName; also: string[] }[] = [
  { to: '/', label: vi.nav.home, icon: 'home', also: ['/daily'] },
  { to: '/speaking', label: vi.nav.speaking, icon: 'mic', also: ['/shadowing', '/patterns', '/listening', '/interpret'] },
  { to: '/scenarios', label: vi.nav.scenarios, icon: 'chat', also: ['/custom', '/emails', '/messages', '/ai-roleplay'] },
  { to: '/flashcards', label: vi.nav.flashcards, icon: 'cards', also: ['/songs'] },
  { to: '/progress', label: vi.nav.progress, icon: 'chart', also: ['/weak'] },
];

function isUnder(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

// Header logo: a simplified, solid version of the app icon that stays crisp at 34px.
function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 64 64" width="34" height="34" aria-hidden="true">
      <defs>
        <linearGradient id="brand-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1360c9" />
          <stop offset="1" stopColor="#0a2a66" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#brand-bg)" />
      <path
        fill="#fff"
        d="M20 14h24a10 10 0 0 1 10 10v12a10 10 0 0 1-10 10H31l-9.5 6.8A1.2 1.2 0 0 1 19.6 51.6L20.6 46A10 10 0 0 1 10 36V24a10 10 0 0 1 10-10z"
      />
      <path
        fill="none"
        stroke="#0a2a66"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M25.5 24.5 20 30l5.5 5.5M38.5 24.5 44 30l-5.5 5.5"
      />
      <path fill="none" stroke="#cd2e3a" strokeWidth="4" strokeLinecap="round" d="M34.5 23.5 29.5 36.5" />
    </svg>
  );
}

export function Layout() {
  // .main is the scroll container, so reset it when the route changes.
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand" aria-label={vi.appName}>
          <BrandMark />
          <span className="brand-text" aria-hidden="true">
            <span className="brand-name">
              <span className="brand-ko">{vi.appName.slice(0, 2)}</span>
              {vi.appName.slice(2)}
            </span>
            <span className="brand-tagline">{vi.appTagline}</span>
          </span>
        </Link>
        <Link to="/settings" className="icon-btn topbar-settings" aria-label={vi.backend.settingsLink} title={vi.backend.settingsLink}>
          <Icon name="settings" size={22} />
        </Link>
      </header>
      <UpdateBanner />
      <BackendBanner />
      <main className="main" ref={mainRef}>
        <div className="main-inner">
          <Outlet />
        </div>
      </main>
      <nav className="bottom-nav" aria-label="Điều hướng chính">
        {NAV.map((item) => {
          const active =
            (item.to === '/' ? pathname === '/' : isUnder(pathname, item.to)) ||
            item.also.some((p) => isUnder(pathname, p));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={active ? 'nav-item active' : 'nav-item'}
              aria-current={active ? 'page' : undefined}
            >
              <span className="nav-icon">
                <Icon name={item.icon} size={22} />
              </span>
              <span className="nav-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
