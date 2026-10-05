// Microphone recording with MediaRecorder. Recordings stay in memory as
// object URLs (they are too big for localStorage) and are dropped when the
// component unmounts.

import { useCallback, useEffect, useRef, useState } from 'react';
import { vi } from '../i18n/vi';
import { playRecording } from '../speech';
import { addRecordingTime } from '../storage/progress';

/** Auto-stop so a forgotten recording doesn't run forever. */
const MAX_RECORDING_MS = 30_000;

// autoStop: end the recording when the speaker goes quiet.
const SILENCE_STOP_MS = 1300; // quiet this long after speech → stop
const NO_VOICE_STOP_MS = 7000; // nothing heard at all → stop
const CALIBRATE_MS = 300; // first samples estimate the background noise

export interface StartOptions {
  /** Stop automatically after the speaker pauses (needs the level meter). */
  autoStop?: boolean;
}

/** Root-mean-square level (0-1) of the analyser's current waveform. */
function rmsLevel(analyser: AnalyserNode, data: Uint8Array<ArrayBuffer>): number {
  analyser.getByteTimeDomainData(data);
  let sum = 0;
  for (const v of data) sum += ((v - 128) / 128) ** 2;
  return Math.sqrt(sum / data.length);
}

export function isRecordingSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'
  );
}

export type RecorderStatus = 'idle' | 'requesting' | 'recording' | 'error';

/** Why recording failed; 'denied' shows the microphone permission help. */
export type RecorderErrorKind = 'denied' | 'no-mic';

// One AudioContext for the level meter and silence detection. Browsers (iOS
// above all) only let it run if it is resumed during a tap, so it is unlocked
// synchronously in start() and in unlockAudioInput(), before any await.
let sharedCtx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (sharedCtx) return sharedCtx;
  const Ctx =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  try {
    sharedCtx = new Ctx();
  } catch {
    return null;
  }
  return sharedCtx;
}

/** Call from a tap handler when recording will start later (after an await). */
export function unlockAudioInput(): void {
  const ctx = audioContext();
  if (ctx && ctx.state !== 'running') void ctx.resume().catch(() => undefined);
}

function createAnalyser(stream: MediaStream): { analyser: AnalyserNode; close: () => void } | null {
  const ctx = audioContext();
  if (!ctx) return null;
  try {
    void ctx.resume().catch(() => undefined);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    return { analyser, close: () => source.disconnect() };
  } catch {
    return null; // the level meter is optional
  }
}

export function useRecorder() {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<RecorderErrorKind | null>(null);
  /** Live input level source while recording (for <LevelMeter>), else null. */
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  /** Date.now() when the current recording started, else null. */
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  // stop() pressed while the permission prompt was still open.
  const stopRequestedRef = useRef(false);
  const silenceRef = useRef<number | undefined>(undefined);

  // Revoke the previous object URL whenever it changes or on unmount.
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current);
      window.clearInterval(silenceRef.current);
      const r = recorderRef.current;
      if (r && r.state !== 'inactive') r.stop();
    },
    [],
  );

  const stop = useCallback(() => {
    window.clearTimeout(timerRef.current);
    const r = recorderRef.current;
    if (r && r.state !== 'inactive') r.stop();
    else stopRequestedRef.current = true;
  }, []);

  /**
   * Starts recording. Resolves with the recording's URL once it stops
   * (null if nothing was recorded or the microphone failed).
   */
  const start = useCallback(async (options: StartOptions = {}): Promise<string | null> => {
    if (!isRecordingSupported() || recorderRef.current) return null;
    unlockAudioInput();
    setError(null);
    setErrorKind(null);
    setStatus('requesting');
    stopRequestedRef.current = false;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const denied = e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
      setError(denied ? vi.speaking.errMicDenied : vi.speaking.errNoMic);
      setErrorKind(denied ? 'denied' : 'no-mic');
      setStatus('error');
      return null;
    }
    if (stopRequestedRef.current) {
      // Released before the microphone opened: nothing to record.
      stream.getTracks().forEach((t) => t.stop());
      setStatus('idle');
      return null;
    }

    const recorder = new MediaRecorder(stream);
    const meter = createAnalyser(stream);
    const chunks: Blob[] = [];
    let startedAt = 0;
    let resolveDone: (url: string | null) => void = () => undefined;
    const done = new Promise<string | null>((resolve) => {
      resolveDone = resolve;
    });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      window.clearInterval(silenceRef.current);
      stream.getTracks().forEach((t) => t.stop());
      meter?.close();
      setAnalyser(null);
      setStartedAt(null);
      recorderRef.current = null;
      const ms = startedAt ? Date.now() - startedAt : 0;
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      const newUrl = blob.size > 0 ? URL.createObjectURL(blob) : null;
      setUrl(newUrl);
      setDurationMs(ms);
      if (blob.size > 0) addRecordingTime(ms);
      setStatus('idle');
      resolveDone(newUrl);
    };

    recorderRef.current = recorder;
    recorder.start();
    startedAt = Date.now();
    setStartedAt(startedAt);
    setAnalyser(meter?.analyser ?? null);
    setStatus('recording');
    timerRef.current = window.setTimeout(stop, MAX_RECORDING_MS);
    if (options.autoStop && meter) watchSilence(meter.analyser, startedAt);
    return done;

    function watchSilence(analyser: AnalyserNode, since: number) {
      const data = new Uint8Array(analyser.fftSize);
      let floor = 0;
      let samples = 0;
      let heardAt = 0; // last time the level was above the threshold
      silenceRef.current = window.setInterval(() => {
        const level = rmsLevel(analyser, data);
        const now = Date.now();
        if (now - since < CALIBRATE_MS) {
          floor = (floor * samples + level) / ++samples;
          return;
        }
        const threshold = Math.max(0.03, floor * 2.5);
        if (level > threshold) heardAt = now;
        if (heardAt ? now - heardAt > SILENCE_STOP_MS : now - since > NO_VOICE_STOP_MS) stop();
      }, 100);
    }
  }, [stop]);

  const clear = useCallback(() => setUrl(null), []);

  return { status, url, error, errorKind, analyser, startedAt, durationMs, start, stop, clear };
}

/** Plays a recording and resolves when playback ends (or fails). */
export function playAudio(url: string): Promise<void> {
  return playRecording(url);
}
