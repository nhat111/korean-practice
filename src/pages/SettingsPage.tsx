import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { checkBackend, getRemoteProgress, putRemoteProgress, useBackendStatus } from '../api/client';
import { apiErrorMessage } from '../api/messages';
import { AppVersion } from '../components/AppVersion';
import { SpeedControl } from '../components/SpeedControl';
import { VoiceControl } from '../components/VoiceControl';
import { VoiceSourceSwitch } from '../components/VoiceSourceSwitch';
import { vi } from '../i18n/vi';
import { normalizeUrl, setBackendSettings, useBackendSettings } from '../storage/backend';
import { ANSWER_TIMERS, setAnswerTimer, setShowPron, usePrefs } from '../storage/prefs';
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
          <VoiceSourceSwitch />
          <SpeedControl />
          <VoiceControl />
        </section>
      )}

      <PracticeSettings />
      <BackupSettings />

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

      <AppVersion />
    </div>
  );
}

function PracticeSettings() {
  const { showPron, answerTimer } = usePrefs();
  return (
    <section className="card stack-sm">
      <h2>{vi.settings.practiceTitle}</h2>
      <label className="check">
        <input type="checkbox" checked={showPron} onChange={(e) => setShowPron(e.target.checked)} />
        <span>{vi.settings.showPron}</span>
      </label>
      <label className="field">
        <span>{vi.settings.answerTimer}</span>
        <select
          className="select"
          value={answerTimer}
          onChange={(e) => setAnswerTimer(ANSWER_TIMERS.find((t) => t === Number(e.target.value)) ?? 0)}
        >
          {ANSWER_TIMERS.map((t) => (
            <option key={t} value={t}>
              {t === 0 ? vi.scenarioSpeak.timerOff : vi.scenarioSpeak.timerValue(t)}
            </option>
          ))}
        </select>
      </label>
      <p className="muted small">{vi.settings.themeNote}</p>
    </section>
  );
}

/** Local backup: download progress as JSON and restore it, no backend needed. */
function BackupSettings() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function download() {
    const blob = new Blob([JSON.stringify(exportProgress(), null, 1)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kodevtalk-tien-do-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg({ ok: true, text: vi.settings.exported });
  }

  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    let data: unknown;
    try {
      data = JSON.parse(await file.text());
    } catch {
      setMsg({ ok: false, text: vi.settings.importInvalid });
      return;
    }
    if (!window.confirm(vi.settings.importConfirm)) return;
    const ok = importProgress(data);
    setMsg(ok ? { ok: true, text: vi.settings.imported } : { ok: false, text: vi.settings.importInvalid });
  }

  return (
    <section className="card stack-sm">
      <h2>{vi.settings.backupTitle}</h2>
      <p className="muted small">{vi.settings.backupHelp}</p>
      <div className="stack-sm">
        <button type="button" className="btn btn--ghost" onClick={download}>
          {vi.settings.exportFile}
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
          {vi.settings.importFile}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => void upload(e)}
        />
      </div>
      {msg && <p className={msg.ok ? 'muted small' : 'error'}>{msg.text}</p>}
    </section>
  );
}
