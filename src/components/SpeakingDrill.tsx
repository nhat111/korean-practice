import { Link } from 'react-router';
import { vi } from '../i18n/vi';
import { isSpeechSupported } from '../speech';
import { SpeakPractice } from './SpeakPractice';
import { VoiceSourceSwitch } from './VoiceSourceSwitch';

export interface SpeakingLine {
  /** e.g. "scenario:<id>:<turn>" or "vocab:<id>" */
  source: string;
  ko: string;
  vi: string;
}

/** Shadowing (listen → record → replay → self-rate, optional speech check) for one line. */
export function SpeakingDrill({ line }: { line: SpeakingLine }) {
  return (
    <div className="stack">
      <section className="card stack-sm">
        <p lang="ko" className="drill-line">
          {line.ko}
        </p>
        <p className="muted">{line.vi}</p>
        {isSpeechSupported() && (
          <>
            <VoiceSourceSwitch />
            <Link to="/settings" className="link-btn small">
              {vi.voice.change}
            </Link>
          </>
        )}
      </section>
      <section className="card stack-sm">
        <h2>{vi.speaking.shadowing}</h2>
        <p className="muted small">{vi.speaking.shadowingHelp}</p>
        <SpeakPractice ko={line.ko} source={line.source} />
      </section>
    </div>
  );
}
