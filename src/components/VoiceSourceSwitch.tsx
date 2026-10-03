import { vi } from '../i18n/vi';
import { setVoiceSource, usePrefs, type VoiceSource } from '../storage/prefs';

const SOURCES: VoiceSource[] = ['male', 'female', 'device'];

/** Natural male / natural female / device voice. Switch freely to practise listening to both. */
export function VoiceSourceSwitch() {
  const { voiceSource } = usePrefs();
  return (
    <div className="stack-sm">
      <span className="small muted">{vi.voice.sourceLabel}</span>
      <div className="segmented" role="radiogroup" aria-label={vi.voice.sourceLabel}>
        {SOURCES.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={voiceSource === s}
            className={voiceSource === s ? 'active' : ''}
            onClick={() => setVoiceSource(s)}
          >
            {vi.voice.source[s]}
          </button>
        ))}
      </div>
    </div>
  );
}
