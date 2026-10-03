import { vi } from '../i18n/vi';
import { guessGender, isSpeechSupported, speakKorean, useKoreanVoices } from '../speech';
import { setDeepVoice, setVoiceURI, usePrefs } from '../storage/prefs';
import { VoiceGuide } from './VoiceGuide';

const SAMPLE = '안녕하세요. 오늘 배포 일정 공유드리겠습니다.';

/** "Microsoft InJoon Online (Natural) - Korean (Korea)" → "Microsoft InJoon". */
function shortName(name: string): string {
  return name.replace(/\s*-\s*Korean.*$/i, '').replace(/\s*Online \(Natural\)/i, '').trim() || name;
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
              </option>
            );
          })}
        </select>
      </label>
      {voices.length === 0 && <p className="muted small">{vi.voice.none}</p>}
      {chosen && (
        <p className="muted small">
          {vi.voice.selectedInfo(shortName(chosen.name), chosen.lang, chosen.localService)}
        </p>
      )}
      <label className="switch">
        <input type="checkbox" checked={prefs.deepVoice} onChange={(e) => setDeepVoice(e.target.checked)} />
        <span>{vi.voice.deep}</span>
      </label>
      <button type="button" className="btn btn--ghost" onClick={() => void speakKorean(SAMPLE)}>
        {vi.voice.test}
      </button>
      <VoiceGuide open={!hasMale || voices.length === 0} />
    </div>
  );
}
