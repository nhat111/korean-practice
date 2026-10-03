// Microphone recording with MediaRecorder. Recordings stay in memory as
// object URLs (they are too big for localStorage) and are dropped when the
// component unmounts.

import { useCallback, useEffect, useRef, useState } from 'react';
import { vi } from '../i18n/vi';

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

export function useRecorder() {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

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
  }, []);

  const start = useCallback(async () => {
    if (!isRecordingSupported()) return;
    setError(null);
    setStatus('requesting');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const denied = e instanceof DOMException && e.name === 'NotAllowedError';
      setError(denied ? vi.speaking.errMicDenied : vi.speaking.errNoMic);
      setStatus('error');
      return;
    }

    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      recorderRef.current = null;
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      setUrl(blob.size > 0 ? URL.createObjectURL(blob) : null);
      setStatus('idle');
    };

    recorderRef.current = recorder;
    recorder.start();
    setStatus('recording');
    timerRef.current = window.setTimeout(stop, MAX_RECORDING_MS);
  }, [stop]);

  const clear = useCallback(() => setUrl(null), []);

  return { status, url, error, start, stop, clear };
}

/** Plays an audio URL and resolves when playback ends (or fails). */
export function playAudio(url: string): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio(url);
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    audio.play().catch(() => resolve());
  });
}
