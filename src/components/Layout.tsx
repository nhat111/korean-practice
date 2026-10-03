import { useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { BackendBanner } from './BackendBanner';
import { Icon, type IconName } from './Icon';
import { UpdateBanner } from './UpdateBanner';
import { vi } from '../i18n/vi';

const NAV: { to: string; label: string; icon: IconName; end: boolean }[] = [
  { to: '/', label: vi.nav.home, icon: 'home', end: true },
  { to: '/scenarios', label: vi.nav.scenarios, icon: 'chat', end: false },
  { to: '/emails', label: vi.nav.emails, icon: 'mail', end: false },
  { to: '/flashcards', label: vi.nav.flashcards, icon: 'cards', end: false },
  { to: '/speaking', label: vi.nav.speaking, icon: 'mic', end: false },
  { to: '/progress', label: vi.nav.progress, icon: 'chart', end: false },
];

// Same mark as the app icon (public/favicon.svg): a chat bubble with code brackets.
function BrandMark() {
  return (
    <svg viewBox="0 0 512 512" width="32" height="32">
      <path
        fill="#fff"
        d="M168 112h176a72 72 0 0 1 72 72v96a72 72 0 0 1-72 72H238l-74 54a8 8 0 0 1-12.6-7.6L160 352a72 72 0 0 1-64-72v-96a72 72 0 0 1 72-72z"
      />
      <path
        fill="none"
        stroke="#4f46e5"
        strokeWidth="30"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M206 186l-44 46 44 46M306 186l44 46-44 46M276 178l-40 108"
      />
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
        <span className="brand">
          <span className="brand-mark" aria-hidden>
            <BrandMark />
          </span>
          {vi.appName}
        </span>
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
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
          >
            <span className="nav-icon">
              <Icon name={item.icon} size={22} />
            </span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
