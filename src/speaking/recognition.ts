// Web Speech API recognition (ko-KR). Chrome/Edge/Safari expose it (Chrome as
// webkitSpeechRecognition); Firefox does not, so callers must check
// `isRecognitionSupported()` and fall back to recording + self-comparison.

import { useCallback, useEffect, useRef, useState } from 'react';
import { vi } from '../i18n/vi';
import { stopSpeaking } from '../speech';

// lib.dom has the event types but not the recognizer itself.
interface Recognizer extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

type RecognizerCtor = new () => Recognizer;

function getCtor(): RecognizerCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as {
    SpeechRecognition?: RecognizerCtor;
    webkitSpeechRecognition?: RecognizerCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/**
 * iOS opened from the Home Screen (standalone web app). WebKit exposes the
 * recognizer there, but it can hang and freeze the page, so we fall back to
 * recording instead.
 */
export function isIosStandalone(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches === true;
  return ios && standalone;
}

function isAndroid(): boolean {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
}

export function isRecognitionSupported(): boolean {
  return getCtor() !== undefined && !isIosStandalone();
}

/** Why recognition is unavailable, for the fallback notice. */
export function recognitionUnsupportedMessage(): string {
  return isIosStandalone() ? vi.speaking.recognitionIosApp : vi.speaking.recognitionUnsupported;
}

// Some engines (notably iOS WebKit) occasionally never fire `end`, which
// would leave the UI stuck in "listening". These timers force an end.
const NO_SPEECH_MS = 8000; // nothing heard at all since start
const SILENCE_MS = 2500; // no new result since the last one
const STOP_GRACE_MS = 1500; // after stop(), wait this long for `end`

export type RecognitionStatus = 'idle' | 'listening' | 'error';

function errorMessage(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return vi.speaking.errMicDenied;
    case 'no-speech':
      return vi.speaking.errNoSpeech;
    case 'audio-capture':
      return vi.speaking.errNoMic;
    case 'network':
      return vi.speaking.errNetwork;
    default:
      return `${vi.speaking.errRecognition} (${code})`;
  }
}

/**
 * Listens once (until the speaker pauses) and calls `onFinal` with the whole
 * transcript. `interim` shows partial text while listening.
 */
export function useSpeechRecognition() {
  const [status, setStatus] = useState<RecognitionStatus>('idle');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<Recognizer | null>(null);
  const stopRef = useRef<() => void>(() => undefined);

  useEffect(
    () => () => {
      const rec = recRef.current;
      if (!rec) return;
      rec.onresult = rec.onerror = rec.onend = null;
      rec.abort();
    },
    [],
  );

  const start = useCallback((onFinal: (transcript: string) => void) => {
    const Ctor = getCtor();
    if (!Ctor) return;
    stopRef.current();
    // Speech output and recognition share the audio session on iOS.
    stopSpeaking();

    const rec = new Ctor();
    rec.lang = 'ko-KR';
    // Keep listening through short pauses so long answers aren't cut after the
    // first phrase; our silence timer ends the session. Android Chrome repeats
    // results in continuous mode, so it ends at the first pause instead.
    rec.continuous = !isAndroid();
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    let finalText = '';
    let partialText = '';
    let done = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Ends the session exactly once, whether the engine fired `end` or not.
    const finish = (errorCode?: string) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      rec.onresult = rec.onerror = rec.onend = null;
      try {
        rec.abort();
      } catch {
        // already stopped
      }
      if (recRef.current === rec) {
        recRef.current = null;
        stopRef.current = () => undefined;
      }
      const text = (finalText + partialText).trim();
      if (!errorCode && text) {
        setStatus('idle');
        onFinal(text);
        return;
      }
      setError(errorMessage(errorCode ?? 'no-speech'));
      setStatus('error');
    };
    const arm = (ms: number, then: () => void) => {
      clearTimeout(timer);
      timer = setTimeout(then, ms);
    };

    rec.onresult = (e) => {
      // e.results holds the whole session: rebuild instead of appending, so a
      // re-delivered result is never counted twice.
      let final = '';
      let partial = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else partial += r[0].transcript;
      }
      finalText = final;
      partialText = partial;
      setInterim(finalText + partial);
      arm(SILENCE_MS, () => finish());
    };
    rec.onerror = (e) => {
      if (e.error !== 'aborted') finish(e.error);
    };
    rec.onend = () => finish();

    recRef.current = rec;
    stopRef.current = () => {
      try {
        rec.stop();
      } catch {
        // ignore
      }
      arm(STOP_GRACE_MS, () => finish());
    };
    setInterim('');
    setError(null);
    setStatus('listening');
    arm(NO_SPEECH_MS, () => finish());
    try {
      rec.start();
    } catch (e) {
      done = true;
      clearTimeout(timer);
      recRef.current = null;
      stopRef.current = () => undefined;
      setError(`${vi.speaking.errRecognition} (${e instanceof Error ? e.message : String(e)})`);
      setStatus('error');
    }
  }, []);

  /** Stop listening and process what was heard so far. */
  const stop = useCallback(() => stopRef.current(), []);

  return { status, interim, error, start, stop };
}
