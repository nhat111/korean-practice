// Microphone recording with MediaRecorder. Recordings stay in memory as
// object URLs (they are too big for localStorage) and are dropped when the
// component unmounts.

import { useCallback, useEffect, useRef, useState } from 'react';
import { vi } from '../i18n/vi';
import { playRecording } from '../speech';
import { addRecordingTime } from '../storage/progress';

/** Auto-stop so a forgotten recording doesn't run forever. */
const MAX_RECORDING_MS = 30_000;

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

function createAnalyser(stream: MediaStream): { analyser: AnalyserNode; close: () => void } | null {
  const Ctx =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  try {
    const ctx = new Ctx();
    void ctx.resume().catch(() => undefined);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    return { analyser, close: () => void ctx.close().catch(() => undefined) };
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

  // Revoke the previous object URL whenever it changes or on unmount.
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current);
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

  const start = useCallback(async () => {
    if (!isRecordingSupported() || recorderRef.current) return;
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
      return;
    }
    if (stopRequestedRef.current) {
      // Released before the microphone opened: nothing to record.
      stream.getTracks().forEach((t) => t.stop());
      setStatus('idle');
      return;
    }

    const recorder = new MediaRecorder(stream);
    const meter = createAnalyser(stream);
    const chunks: Blob[] = [];
    let startedAt = 0;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      meter?.close();
      setAnalyser(null);
      setStartedAt(null);
      recorderRef.current = null;
      const ms = startedAt ? Date.now() - startedAt : 0;
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      setUrl(blob.size > 0 ? URL.createObjectURL(blob) : null);
      setDurationMs(ms);
      if (blob.size > 0) addRecordingTime(ms);
      setStatus('idle');
    };

    recorderRef.current = recorder;
    recorder.start();
    startedAt = Date.now();
    setStartedAt(startedAt);
    setAnalyser(meter?.analyser ?? null);
    setStatus('recording');
    timerRef.current = window.setTimeout(stop, MAX_RECORDING_MS);
  }, [stop]);

  const clear = useCallback(() => setUrl(null), []);

  return { status, url, error, errorKind, analyser, startedAt, durationMs, start, stop, clear };
}

/** Plays a recording and resolves when playback ends (or fails). */
export function playAudio(url: string): Promise<void> {
  return playRecording(url);
}
