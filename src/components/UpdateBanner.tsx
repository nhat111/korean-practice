import { vi } from '../i18n/vi';
import { useUpdateReady } from '../registerSW';

/** Asks the user to reload once a new deploy has taken over the page. */
export function UpdateBanner() {
  const ready = useUpdateReady();
  if (!ready) return null;
  return (
    <div className="backend-banner backend-banner--update" role="status">
      <span>{vi.update.message}</span>
      <button type="button" className="link-btn" onClick={() => window.location.reload()}>
        {vi.update.reload}
      </button>
    </div>
  );
}
