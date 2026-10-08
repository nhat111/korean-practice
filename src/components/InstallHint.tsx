import { trackEvent } from '../analytics';
import { vi } from '../i18n/vi';
import { isIos, isStandalone, promptInstall, useCanPromptInstall } from '../install';
import { dismissInstallHint, usePrefs } from '../storage/prefs';
import { Icon } from './Icon';

/** Home card suggesting installing the PWA; hidden once installed or closed. */
export function InstallHint() {
  const { installHintDismissed } = usePrefs();
  const canPrompt = useCanPromptInstall();
  const ios = isIos();
  if (installHintDismissed || isStandalone() || (!canPrompt && !ios)) return null;

  return (
    <section className="card install-hint">
      <span className="card-icon">
        <Icon name="download" />
      </span>
      <div className="stack-xs">
        <h2>{vi.growth.installTitle}</h2>
        <p className="muted small">{ios && !canPrompt ? vi.growth.installIos : vi.growth.installDesc}</p>
        <div className="row">
          {canPrompt && (
            <button
              type="button"
              className="btn"
              onClick={() =>
                void promptInstall().then((ok) => trackEvent('install_hint', { accepted: ok }))
              }
            >
              {vi.growth.installButton}
            </button>
          )}
          <button type="button" className="link-btn small" onClick={dismissInstallHint}>
            {vi.growth.installClose}
          </button>
        </div>
      </div>
    </section>
  );
}
