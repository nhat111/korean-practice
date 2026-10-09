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
          <img className="brand-mark" src="/favicon.svg" alt="" width="32" height="32" />
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
