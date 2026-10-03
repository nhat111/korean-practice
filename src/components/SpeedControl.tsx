import { vi } from '../i18n/vi';
import { isSpeechSupported, speakKorean } from '../speech';
import { MAX_RATE, MIN_RATE, setSpeechRate, useSpeechRate } from '../storage/prefs';

const SAMPLE = '이번 주 금요일까지 수정해서 배포하겠습니다.';

/** Slider for the text-to-speech rate (0.5x-1.2x), saved per device. */
export function SpeedControl() {
  const rate = useSpeechRate();
  return (
    <div className="speed-row">
      <label className="speed">
        <span>
          {vi.speaking.speed}: <strong>{rate.toFixed(1)}x</strong>
        </span>
        <input
          type="range"
          min={MIN_RATE}
          max={MAX_RATE}
          step={0.1}
          value={rate}
          onChange={(e) => setSpeechRate(Number(e.target.value))}
        />
      </label>
      {isSpeechSupported() && (
        <button type="button" className="link-btn small" onClick={() => void speakKorean(SAMPLE)}>
          {vi.voice.test}
        </button>
      )}
    </div>
  );
}
