import { Link, NavLink, Outlet } from 'react-router';
import { BackendBanner } from './BackendBanner';
import { vi } from '../i18n/vi';

const NAV = [
  { to: '/', label: vi.nav.home, icon: '🏠', end: true },
  { to: '/scenarios', label: vi.nav.scenarios, icon: '💬', end: false },
  { to: '/emails', label: vi.nav.emails, icon: '✉️', end: false },
  { to: '/flashcards', label: vi.nav.flashcards, icon: '🃏', end: false },
  { to: '/speaking', label: vi.nav.speaking, icon: '🎤', end: false },
  { to: '/progress', label: vi.nav.progress, icon: '📈', end: false },
];

export function Layout() {
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
          ⚙️
        </Link>
      </header>
      <BackendBanner />
      <main className="main">
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="Điều hướng chính">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
          >
            <span className="nav-icon" aria-hidden>
              {item.icon}
            </span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
