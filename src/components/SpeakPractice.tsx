import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { vi } from '../i18n/vi';
import { gradeFor } from '../practice/decks';
import { isSpeechSupported, speakKorean, stopSpeaking } from '../speech';
import { compareAnswer, type Comparison } from '../speaking/compare';
import { isRecognitionSupported, useSpeechRecognition } from '../speaking/recognition';
import { isRecordingSupported, playAudio, useRecorder } from '../speaking/recorder';
import { review, todayKey } from '../srs/sm2';
import { setSpeechRate, useSpeechRate } from '../storage/prefs';
import { getProgressSnapshot, saveReview, saveSpeakingAttempt, type SelfRating, type SpeakingMode } from '../storage/progress';
import { ComparisonView } from './ComparisonView';
import { Icon } from './Icon';

type Recorder = ReturnType<typeof useRecorder>;

/** Holding the button longer than this means "hold to talk": release stops. */
const HOLD_MS = 450;

/** Big record button: tap to start/stop, or hold to talk and release. */
export function RecordControl({ recorder, onStart }: { recorder: Recorder; onStart?: () => void }) {
  const pressedAt = useRef(0);
  const [now, setNow] = useState(0);
  const recording = recorder.status === 'recording';
  const busy = recorder.status === 'requesting';
  const elapsed = recorder.startedAt ? Math.max(0, Math.floor((now - recorder.startedAt) / 1000)) : 0;

  useEffect(() => {
    if (!recording) return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [recording]);

  function down(e: PointerEvent<HTMLButtonElement>) {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (recording) {
      pressedAt.current = 0;
      recorder.stop();
      return;
    }
    if (busy) return;
    pressedAt.current = Date.now();
    onStart?.();
    void recorder.start();
  }

  function up() {
    if (pressedAt.current && Date.now() - pressedAt.current > HOLD_MS) recorder.stop();
    pressedAt.current = 0;
  }

  return (
    <div className="record-control">
      <button
        type="button"
        className={recording ? 'record-btn record-btn--on' : 'record-btn'}
        aria-pressed={recording}
        aria-label={recording ? vi.practice.stop : vi.practice.record}
        disabled={busy}
        onPointerDown={down}
        onPointerUp={up}
        onPointerCancel={up}
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => {
          // Keyboard activation (pointer presses are handled above).
          if (e.detail !== 0) return;
          if (recording) recorder.stop();
          else {
            onStart?.();
            void recorder.start();
          }
        }}
      >
        <Icon name={recording ? 'stop' : 'mic'} size={30} />
      </button>
      <div className="record-side">
        {recording ? (
          <>
            <LevelMeter analyser={recorder.analyser} />
            <span className="small">{vi.practice.seconds(elapsed)}</span>
          </>
        ) : (
          <span className="muted small">
            {busy ? vi.practice.requesting : recorder.url ? vi.practice.recordAgain : vi.practice.recordHint}
          </span>
        )}
      </div>
    </div>
  );
}

const BARS = 7;

/** Live microphone level, drawn without React re-renders. */
function LevelMeter({ analyser }: { analyser: AnalyserNode | null }) {
  const barsRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!analyser) return;
    const data = new Uint8Array(analyser.fftSize);
    let frame = 0;
    const draw = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) sum += ((v - 128) / 128) ** 2;
      const level = Math.min(1, Math.sqrt(sum / data.length) * 4);
      const bars = barsRef.current?.children;
      if (bars) {
        for (let i = 0; i < bars.length; i++) {
          // Middle bars move most, like a voice wave.
          const shape = 1 - Math.abs(i - (BARS - 1) / 2) / BARS;
          (bars[i] as HTMLElement).style.transform = `scaleY(${Math.max(0.12, level * shape * 1.4)})`;
        }
      }
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [analyser]);

  return (
    <span className={analyser ? 'level' : 'level level--idle'} ref={barsRef} aria-hidden>
      {Array.from({ length: BARS }, (_, i) => (
        <span key={i} />
      ))}
    </span>
  );
}

const RATES = [0.7, 0.85, 1] as const;

/** Model audio speed: 0.7x / 0.85x / 1x (stored as the global speech rate). */
export function RateChips() {
  const rate = useSpeechRate();
  return (
    <div className="chips" role="group" aria-label={vi.practice.speed}>
      <span className="muted small">{vi.practice.speed}</span>
      {RATES.map((r) => (
        <button
          key={r}
          type="button"
          className={Math.abs(rate - r) < 0.01 ? 'chip chip--on' : 'chip'}
          aria-pressed={Math.abs(rate - r) < 0.01}
          onClick={() => setSpeechRate(r)}
        >
          {r}x
        </button>
      ))}
    </div>
  );
}

const RATINGS: { value: SelfRating; className: string }[] = [
  { value: 'bad', className: 'btn btn--bad' },
  { value: 'ok', className: 'btn btn--warn' },
  { value: 'good', className: 'btn btn--ok' },
];

/** "Chưa được / Gần đúng / Tốt". Saves to history and, with `srsKey`, schedules the next review. */
export function SelfRate({
  ko,
  source,
  mode,
  srsKey,
  onRated,
}: {
  ko: string;
  source: string;
  mode: SpeakingMode;
  srsKey?: string;
  onRated?: (rating: SelfRating) => void;
}) {
  const [rated, setRated] = useState<{ rating: SelfRating; days: number } | null>(null);

  function rate(rating: SelfRating) {
    let days = 0;
    if (srsKey) {
      const next = review(getProgressSnapshot().srs[srsKey], gradeFor(rating), todayKey());
      saveReview(srsKey, next);
      days = next.interval;
    }
    saveSpeakingAttempt({ mode, source, target: ko, selfRating: rating });
    setRated({ rating, days });
    onRated?.(rating);
  }

  return (
    <div className="stack-xs">
      <p className="muted small">{vi.practice.rateTitle}</p>
      <div className="row rate-row">
        {RATINGS.map((r) => (
          <button
            key={r.value}
            type="button"
            className={rated === null || rated.rating === r.value ? r.className : 'btn btn--ghost'}
            disabled={rated !== null}
            onClick={() => rate(r.value)}
          >
            {vi.practice.rate[r.value]}
          </button>
        ))}
      </div>
      {rated && <p className="muted small">{srsKey ? vi.practice.rated(rated.days) : `✓ ${vi.speaking.saved}`}</p>}
    </div>
  );
}

/** Listen to the model, the recording, or both interleaved (model → mine → model). */
export function ComparePlayback({ ko, url }: { ko: string; url: string | null }) {
  const canSpeak = isSpeechSupported();
  async function interleave(u: string) {
    await speakKorean(ko);
    await playAudio(u);
    await speakKorean(ko);
  }
  return (
    <div className="stack-xs">
      <div className="row play-row">
        {canSpeak && (
          <button type="button" className="btn btn--ghost" onClick={() => void speakKorean(ko)}>
            {vi.practice.playModel}
          </button>
        )}
        {url && (
          <button type="button" className="btn btn--ghost" onClick={() => void playAudio(url)}>
            {vi.practice.playMine}
          </button>
        )}
        {url && canSpeak && (
          <button type="button" className="btn btn--ghost" onClick={() => void interleave(url)}>
            {vi.practice.playInterleave}
          </button>
        )}
      </div>
      {url && canSpeak && <p className="muted small">{vi.practice.interleaveHelp}</p>}
    </div>
  );
}

export function MicHelp() {
  return (
    <details className="guide">
      <summary>{vi.practice.micHelpTitle}</summary>
      <ul className="stack-xs">
        {vi.practice.micHelp.map((line) => (
          <li key={line} className="small">
            {line}
          </li>
        ))}
      </ul>
    </details>
  );
}

interface Props {
  /** The Korean line to say. */
  ko: string;
  /** History source, e.g. "shadowing:sh-01". */
  source: string;
  mode?: SpeakingMode;
  /** When set, the self-rating schedules this item in the SRS. */
  srsKey?: string;
  onRated?: (rating: SelfRating) => void;
  /** Hide the self-rating (the parent rates, e.g. a scenario turn). */
  noRating?: boolean;
  /** Offer the optional recognition check. */
  autoCheck?: boolean;
  /**
   * False while the learner should answer from memory (patterns, scenario
   * turns): the model audio, speed and rating stay hidden until revealed.
   */
  revealed?: boolean;
}

/**
 * Shared speaking core: record (tap or hold, with a level meter), compare
 * model and own voice, set the model speed, self-rate into the SRS. Speech
 * recognition is an optional extra; everything works with recording alone,
 * and without a microphone the learner can still listen, repeat and rate.
 */
export function SpeakPractice({
  ko,
  source,
  mode = 'shadowing',
  srsKey,
  onRated,
  noRating,
  autoCheck = true,
  revealed = true,
}: Props) {
  const recorder = useRecorder();
  const canRecord = isRecordingSupported();
  const hasRecording = recorder.url !== null && recorder.status === 'idle';

  useEffect(() => stopSpeaking, []);

  return (
    <div className="speak-practice stack-sm">
      {revealed && <RateChips />}
      {canRecord ? (
        <RecordControl recorder={recorder} onStart={stopSpeaking} />
      ) : (
        <p className="muted small">{vi.practice.noRecording}</p>
      )}
      {recorder.error && <p className="error">{recorder.error}</p>}
      {recorder.errorKind === 'denied' && <MicHelp />}
      {revealed ? (
        <ComparePlayback ko={ko} url={hasRecording ? recorder.url : null} />
      ) : (
        hasRecording && (
          <div className="row play-row">
            <button type="button" className="btn btn--ghost" onClick={() => recorder.url && void playAudio(recorder.url)}>
              {vi.practice.playMine}
            </button>
          </div>
        )
      )}
      {revealed && !noRating && (hasRecording || !canRecord) && (
        <SelfRate key={recorder.url ?? 'none'} ko={ko} source={source} mode={mode} srsKey={srsKey} onRated={onRated} />
      )}
      {revealed && autoCheck && isRecognitionSupported() && <AutoCheck ko={ko} source={source} />}
    </div>
  );
}

/** Optional: speech recognition compared syllable by syllable with the model. */
function AutoCheck({ ko, source }: { ko: string; source: string }) {
  const recognition = useSpeechRecognition();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<Comparison | null>(null);

  if (!open) {
    return (
      <button type="button" className="link-btn small" onClick={() => setOpen(true)}>
        {vi.practice.autoCheck}
      </button>
    );
  }

  function start() {
    setResult(null);
    recognition.start((transcript) => {
      const r = compareAnswer(ko, transcript);
      setResult(r);
      saveSpeakingAttempt({ mode: 'check', source, target: ko, transcript, score: r.score });
    });
  }

  return (
    <div className="stack-sm auto-check">
      <p className="muted small">{vi.practice.autoCheckHelp}</p>
      <ListenButton recognition={recognition} onStart={start} again={result !== null} />
      {recognition.status === 'listening' && (
        <p lang="ko" className="interim">
          {recognition.interim || vi.speaking.listening}
        </p>
      )}
      {recognition.error && <p className="error">{recognition.error}</p>}
      {result && <ComparisonView result={result} />}
      <p className="muted small">{vi.speaking.recognitionNote}</p>
    </div>
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
