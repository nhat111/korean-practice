import { vi } from '../i18n/vi';
import { VOICE_SAMPLE as SAMPLE } from '../speaking/audioKey';
import { guessGender, isSpeechSupported, speakKorean, useKoreanVoices } from '../speech';
import { setDeepVoice, setVoiceURI, usePrefs } from '../storage/prefs';
import { VoiceGuide } from './VoiceGuide';


/** "Microsoft InJoon Online (Natural) - Korean (Korea)" → "Microsoft InJoon". */
function shortName(name: string): string {
  return name.replace(/\s*-\s*Korean.*$/i, '').replace(/\s*Online \(Natural\)/i, '').trim() || name;
}

/** iOS/macOS ship the same voice in several qualities; tell them apart. */
function quality(v: SpeechSynthesisVoice): string {
  const id = `${v.voiceURI} ${v.name}`.toLowerCase();
  if (id.includes('premium')) return ` · ${vi.voice.quality.premium}`;
  if (id.includes('enhanced')) return ` · ${vi.voice.quality.enhanced}`;
  if (id.includes('compact')) return ` · ${vi.voice.quality.compact}`;
  return '';
}

/** Choose among the device's Korean voices, plus a lower-pitch option. */
export function VoiceControl() {
  const prefs = usePrefs();
  const voices = useKoreanVoices();
  if (!isSpeechSupported()) return null;

  const hasMale = voices.some((v) => guessGender(v) === 'male');
  const chosen = voices.find((v) => v.voiceURI === prefs.voiceURI);
  const selected = chosen ? prefs.voiceURI : '';

  return (
    <div className="stack-sm">
      <h3 className="small">{vi.voice.deviceTitle}</h3>
      {prefs.voiceSource !== 'device' && <p className="muted small">{vi.voice.deviceFallback}</p>}
      <label className="field">
        <span>{vi.voice.label}</span>
        <select className="select" value={selected} onChange={(e) => setVoiceURI(e.target.value)}>
          <option value="">{vi.voice.auto}</option>
          {voices.map((v) => {
            const g = guessGender(v);
            return (
              <option key={v.voiceURI} value={v.voiceURI}>
                {shortName(v.name)}
                {g !== 'unknown' ? ` (${vi.voice.gender[g]})` : ''}
                {quality(v)}
              </option>
            );
          })}
        </select>
      </label>
      {voices.length === 0 && <p className="muted small">{vi.voice.none}</p>}
      {chosen && (
        <p className="muted small">
          {vi.voice.selectedInfo(shortName(chosen.name) + quality(chosen), chosen.lang, chosen.localService)}
          <br />
          <code className="small">{chosen.voiceURI}</code>
        </p>
      )}
      <label className="switch">
        <input type="checkbox" checked={prefs.deepVoice} onChange={(e) => setDeepVoice(e.target.checked)} />
        <span>{vi.voice.deep}</span>
      </label>
      <button type="button" className="btn btn--ghost" onClick={() => void speakKorean(SAMPLE)}>
        {vi.voice.test}
      </button>
      {voices.length > 0 && (
        <details className="voice-debug">
          <summary>{vi.voice.debugTitle}</summary>
          <p className="muted small">{vi.voice.debugHelp}</p>
          <ul className="stack-sm">
            {voices.map((v) => (
              <li key={v.voiceURI} className="row-between">
                <span className="small">
                  <strong>{shortName(v.name)}</strong>
                  {quality(v)} · {v.lang}
                  {v.default ? ` · ${vi.voice.debugDefault}` : ''}
                  <br />
                  <code>{v.voiceURI}</code>
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`${vi.voice.test} ${v.name}`}
                  onClick={() => void speakKorean(SAMPLE, undefined, v.voiceURI)}
                >
                  ▶
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
      <VoiceGuide open={!hasMale || voices.length === 0} />
    </div>
  );
}
