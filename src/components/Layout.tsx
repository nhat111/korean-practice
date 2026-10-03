import { useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { BackendBanner } from './BackendBanner';
import { Icon, type IconName } from './Icon';
import { vi } from '../i18n/vi';

const NAV: { to: string; label: string; icon: IconName; end: boolean }[] = [
  { to: '/', label: vi.nav.home, icon: 'home', end: true },
  { to: '/scenarios', label: vi.nav.scenarios, icon: 'chat', end: false },
  { to: '/emails', label: vi.nav.emails, icon: 'mail', end: false },
  { to: '/flashcards', label: vi.nav.flashcards, icon: 'cards', end: false },
  { to: '/speaking', label: vi.nav.speaking, icon: 'mic', end: false },
  { to: '/progress', label: vi.nav.progress, icon: 'chart', end: false },
];

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
            한
          </span>
          {vi.appName}
        </span>
        <Link to="/settings" className="icon-btn topbar-settings" aria-label={vi.backend.settingsLink} title={vi.backend.settingsLink}>
          <Icon name="settings" size={22} />
        </Link>
      </header>
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
