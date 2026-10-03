import { useEffect } from 'react';
import { checkBackend, ensureBackendChecked, useBackendStatus } from '../api/client';
import { vi } from '../i18n/vi';

/**
 * Notice shown while the optional backend is waking up or unreachable.
 * Renders nothing when no backend is configured (static mode) or it is online.
 */
export function BackendBanner() {
  const status = useBackendStatus();

  useEffect(() => {
    ensureBackendChecked();
  }, []);

  if (status.state === 'checking' && status.slow) {
    return (
      <div className="backend-banner" role="status">
        <span className="spinner" aria-hidden /> {vi.backend.banner.waking}
      </div>
    );
  }
  if (status.state === 'offline') {
    return (
      <div className="backend-banner backend-banner--offline" role="status">
        <span>{vi.backend.banner.offline}</span>
        <button type="button" className="link-btn" onClick={() => void checkBackend()}>
          {vi.backend.banner.retry}
        </button>
      </div>
    );
  }
  return null;
}
