import { useState, type FormEvent } from 'react';
import { checkBackend, getRemoteProgress, putRemoteProgress, useBackendStatus } from '../api/client';
import { apiErrorMessage } from '../api/messages';
import { SpeedControl } from '../components/SpeedControl';
import { VoiceControl } from '../components/VoiceControl';
import { vi } from '../i18n/vi';
import { normalizeUrl, setBackendSettings, useBackendSettings } from '../storage/backend';
import { exportProgress, importProgress } from '../storage/progress';
import { isSpeechSupported } from '../speech';

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || (u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname));
  } catch {
    return false;
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('vi-VN');
}

export function SettingsPage() {
  const settings = useBackendSettings();
  const status = useBackendStatus();
  const [url, setUrl] = useState(settings.url);
  const [accessKey, setAccessKey] = useState(settings.accessKey);
  const [formMsg, setFormMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [syncing, setSyncing] = useState(false);

  function save(e: FormEvent) {
    e.preventDefault();
    const clean = normalizeUrl(url);
    if (clean && !isValidUrl(clean)) {
      setFormMsg({ ok: false, text: vi.settings.invalidUrl });
      return;
    }
    setBackendSettings({ url: clean, accessKey });
    setUrl(clean);
    setFormMsg({ ok: true, text: vi.settings.saved });
    void checkBackend();
  }

  function disable() {
    setBackendSettings({ url: '', accessKey: '' });
    setUrl('');
    setAccessKey('');
    setFormMsg({ ok: true, text: vi.settings.saved });
    setSyncMsg(null);
    void checkBackend();
  }

  async function upload() {
    if (!window.confirm(vi.settings.uploadConfirm)) return;
    setSyncing(true);
    setSyncMsg(null);
    try {
      const r = await putRemoteProgress(exportProgress());
      setSyncMsg({ ok: true, text: vi.settings.uploaded(formatTime(r.updatedAt)) });
    } catch (e) {
      setSyncMsg({ ok: false, text: apiErrorMessage(e) });
    } finally {
      setSyncing(false);
    }
  }

  async function download() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const remote = await getRemoteProgress();
      if (!remote) {
        setSyncMsg({ ok: false, text: vi.settings.noRemote });
      } else if (window.confirm(vi.settings.downloadConfirm(formatTime(remote.updatedAt)))) {
        const ok = importProgress(remote.progress);
        setSyncMsg(ok ? { ok: true, text: vi.settings.downloaded } : { ok: false, text: vi.settings.invalidRemote });
      }
    } catch (e) {
      setSyncMsg({ ok: false, text: apiErrorMessage(e) });
    } finally {
      setSyncing(false);
    }
  }

  const statusText =
    status.state === 'disabled'
      ? vi.settings.statusDisabled
      : status.state === 'checking'
        ? status.slow
          ? vi.settings.statusWaking
          : vi.settings.statusChecking
        : status.state === 'online'
          ? vi.settings.statusOnline(status.aiProvider, status.aiEnabled)
          : vi.settings.statusOffline;

  return (
    <div className="stack">
      <h1>{vi.settings.title}</h1>

      {isSpeechSupported() && (
        <section className="card stack-sm">
          <h2>{vi.voice.title}</h2>
          <SpeedControl />
          <VoiceControl />
        </section>
      )}

      <section className="card stack-sm">
        <h2>{vi.settings.backendTitle}</h2>
        <p className="muted small">{vi.settings.backendHelp}</p>
        <form className="stack-sm" onSubmit={save}>
          <label className="field">
            <span>{vi.settings.url}</span>
            <input
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder={vi.settings.urlPlaceholder}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
          <label className="field">
            <span>{vi.settings.accessKey}</span>
            <input
              type="password"
              autoComplete="off"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
            />
            <small className="muted">{vi.settings.accessKeyHelp}</small>
          </label>
          <div className="row">
            <button type="submit" className="btn">
              {vi.settings.save}
            </button>
            {settings.url && (
              <button type="button" className="btn btn--ghost" onClick={disable}>
                {vi.settings.disable}
              </button>
            )}
          </div>
          {formMsg && <p className={formMsg.ok ? 'muted small' : 'error'}>{formMsg.text}</p>}
        </form>
        <div className="row-between">
          <p>
            <strong>{vi.settings.status}:</strong> <span className="backend-status">{statusText}</span>
          </p>
          {settings.url && status.state !== 'checking' && (
            <button type="button" className="link-btn" onClick={() => void checkBackend()}>
              {vi.settings.checkAgain}
            </button>
          )}
        </div>
      </section>

      {settings.url && (
        <section className="card stack-sm">
          <h2>{vi.settings.syncTitle}</h2>
          <p className="muted small">{vi.settings.syncHelp}</p>
          {status.state === 'online' ? (
            <div className="stack-sm">
              <button type="button" className="btn btn--ghost" disabled={syncing} onClick={() => void upload()}>
                {vi.settings.upload}
              </button>
              <button type="button" className="btn btn--ghost" disabled={syncing} onClick={() => void download()}>
                {vi.settings.download}
              </button>
            </div>
          ) : (
            <p className="muted small">{vi.settings.needOnline}</p>
          )}
          {syncMsg && <p className={syncMsg.ok ? 'muted small' : 'error'}>{syncMsg.text}</p>}
        </section>
      )}
    </div>
  );
}
