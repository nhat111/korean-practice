import { vi } from '../i18n/vi';
import { MAX_RATE, MIN_RATE, setSpeechRate, useSpeechRate } from '../storage/prefs';

/** Slider for the text-to-speech rate (0.7x-1x), saved per device. */
export function SpeedControl() {
  const rate = useSpeechRate();
  return (
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
  );
}
