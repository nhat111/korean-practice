import { useState } from 'react';
import { Link } from 'react-router';
import { vi } from '../i18n/vi';
import { isSpeechSupported, speakKorean } from '../speech';
import { compareAnswer, type Comparison } from '../speaking/compare';
import { isRecognitionSupported, useSpeechRecognition } from '../speaking/recognition';
import { isRecordingSupported, playAudio, useRecorder } from '../speaking/recorder';
import { saveSpeakingAttempt, type SelfRating } from '../storage/progress';
import { ComparisonView } from './ComparisonView';
import { SpeedControl } from './SpeedControl';

export interface SpeakingLine {
  /** e.g. "scenario:<id>:<turn>" or "vocab:<id>" */
  source: string;
  ko: string;
  vi: string;
}

/** Shadowing (listen → record → replay) and speech check for one line. */
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
            <SpeedControl />
            <Link to="/settings" className="link-btn small">
              {vi.voice.change}
            </Link>
          </>
        )}
      </section>
      <Shadowing line={line} />
      <SpeechCheck line={line} />
    </div>
  );
}

const RATINGS: { value: SelfRating; label: string; className: string }[] = [
  { value: 'good', label: vi.speaking.rateGood, className: 'btn btn--ok' },
  { value: 'ok', label: vi.speaking.rateOk, className: 'btn btn--warn' },
  { value: 'bad', label: vi.speaking.rateBad, className: 'btn btn--bad' },
];

function Shadowing({ line }: { line: SpeakingLine }) {
  const recorder = useRecorder();
  const [rated, setRated] = useState<SelfRating | null>(null);

  async function playBoth(url: string) {
    await speakKorean(line.ko);
    await playAudio(url);
  }

  function rate(value: SelfRating) {
    setRated(value);
    saveSpeakingAttempt({ mode: 'shadowing', source: line.source, target: line.ko, selfRating: value });
  }

  return (
    <section className="card stack-sm">
      <h2>{vi.speaking.shadowing}</h2>
      <p className="muted small">{vi.speaking.shadowingHelp}</p>
      <div className="row">
        {isSpeechSupported() && (
          <button type="button" className="btn btn--ghost" onClick={() => void speakKorean(line.ko)}>
            {vi.speaking.listen}
          </button>
        )}
        {isRecordingSupported() && <RecordButton recorder={recorder} onStart={() => setRated(null)} />}
      </div>
      {!isRecordingSupported() && <p className="muted small">{vi.speaking.recordingUnsupported}</p>}
      {recorder.error && <p className="error">{recorder.error}</p>}
      {recorder.status === 'recording' && <p className="recording-dot">{vi.speaking.recording}</p>}

      {recorder.url && recorder.status === 'idle' && (
        <>
          <div className="row">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => recorder.url && void playAudio(recorder.url)}
            >
              {vi.speaking.playRecording}
            </button>
            {isSpeechSupported() && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => recorder.url && void playBoth(recorder.url)}
              >
                {vi.speaking.playBoth}
              </button>
            )}
          </div>
          <p className="muted small">{vi.speaking.selfRate}</p>
          <div className="row">
            {RATINGS.map((r) => (
              <button
                key={r.value}
                type="button"
                className={rated === null || rated === r.value ? r.className : 'btn btn--ghost'}
                onClick={() => rate(r.value)}
                disabled={rated !== null}
              >
                {r.label}
              </button>
            ))}
          </div>
          {rated && <p className="muted small">✓ {vi.speaking.saved}</p>}
        </>
      )}
    </section>
  );
}

export function RecordButton({
  recorder,
  onStart,
}: {
  recorder: ReturnType<typeof useRecorder>;
  onStart?: () => void;
}) {
  if (recorder.status === 'recording') {
    return (
      <button type="button" className="btn btn--bad" onClick={recorder.stop}>
        {vi.speaking.stopRecording}
      </button>
    );
  }
  return (
    <button
      type="button"
      className="btn"
      disabled={recorder.status === 'requesting'}
      onClick={() => {
        onStart?.();
        void recorder.start();
      }}
    >
      {recorder.status === 'requesting' ? vi.speaking.requesting : vi.speaking.record}
    </button>
  );
}

function SpeechCheck({ line }: { line: SpeakingLine }) {
  const recognition = useSpeechRecognition();
  const [result, setResult] = useState<Comparison | null>(null);

  if (!isRecognitionSupported()) {
    return (
      <section className="card stack-sm">
        <h2>{vi.speaking.check}</h2>
        <p className="muted small">{vi.speaking.recognitionUnsupported}</p>
      </section>
    );
  }

  function start() {
    setResult(null);
    recognition.start((transcript) => {
      const r = compareAnswer(line.ko, transcript);
      setResult(r);
      saveSpeakingAttempt({
        mode: 'check',
        source: line.source,
        target: line.ko,
        transcript,
        score: r.score,
      });
    });
  }

  return (
    <section className="card stack-sm">
      <h2>{vi.speaking.check}</h2>
      <p className="muted small">{vi.speaking.checkHelp}</p>
      <ListenButton recognition={recognition} onStart={start} again={result !== null} />
      {recognition.status === 'listening' && (
        <p lang="ko" className="interim">
          {recognition.interim || vi.speaking.listening}
        </p>
      )}
      {recognition.error && <p className="error">{recognition.error}</p>}
      {result && <ComparisonView result={result} />}
      <p className="muted small">{vi.speaking.recognitionNote}</p>
    </section>
  );
}

export function ListenButton({
  recognition,
  onStart,
  again,
  label,
}: {
  recognition: ReturnType<typeof useSpeechRecognition>;
  onStart: () => void;
  again?: boolean;
  label?: string;
}) {
  if (recognition.status === 'listening') {
    return (
      <button type="button" className="btn btn--bad" onClick={recognition.stop}>
        {vi.speaking.stopListening}
      </button>
    );
  }
  return (
    <button type="button" className="btn" onClick={onStart}>
      {again ? vi.speaking.tryAgain : (label ?? vi.speaking.speak)}
    </button>
  );
}
