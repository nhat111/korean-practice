import { useState } from 'react';
import { vi } from '../i18n/vi';
import { checkForUpdate, type UpdateCheck } from '../registerSW';

/** Current build plus a manual update check (the service worker caches the app). */
export function AppVersion() {
  const [state, setState] = useState<UpdateCheck | 'checking' | 'error' | null>(null);

  async function check() {
    setState('checking');
    try {
      setState(await checkForUpdate());
    } catch {
      setState('error');
    }
  }

  return (
    <section className="card stack-sm">
      <h2>{vi.update.title}</h2>
      <p className="muted small">
        {vi.update.current}: <code>{__APP_VERSION__}</code>
      </p>
      <button type="button" className="btn btn--ghost" onClick={() => void check()} disabled={state === 'checking'}>
        {state === 'checking' || state === 'reloading' ? vi.update.checking : vi.update.check}
      </button>
      {state === 'latest' && <p className="muted small">{vi.update.latest}</p>}
      {state === 'unavailable' && <p className="muted small">{vi.update.unavailable}</p>}
      {state === 'error' && <p className="error">{vi.update.error}</p>}
    </section>
  );
}
