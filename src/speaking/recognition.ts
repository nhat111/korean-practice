// Web Speech API recognition (ko-KR). Chrome/Edge/Safari expose it (Chrome as
// webkitSpeechRecognition); Firefox does not, so callers must check
// `isRecognitionSupported()` and fall back to recording + self-comparison.

import { useCallback, useEffect, useRef, useState } from 'react';
import { vi } from '../i18n/vi';

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

export function isRecognitionSupported(): boolean {
  return getCtor() !== undefined;
}

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

  useEffect(() => () => recRef.current?.abort(), []);

  const start = useCallback((onFinal: (transcript: string) => void) => {
    const Ctor = getCtor();
    if (!Ctor) return;
    recRef.current?.abort();

    const rec = new Ctor();
    rec.lang = 'ko-KR';
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    let finalText = '';
    let failed = false;
    rec.onresult = (e) => {
      let partial = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else partial += r[0].transcript;
      }
      setInterim(finalText + partial);
    };
    rec.onerror = (e) => {
      if (e.error === 'aborted') return;
      failed = true;
      setError(errorMessage(e.error));
      setStatus('error');
    };
    rec.onend = () => {
      recRef.current = null;
      if (failed) return;
      setStatus('idle');
      const text = finalText.trim();
      if (text) onFinal(text);
      else {
        setError(vi.speaking.errNoSpeech);
        setStatus('error');
      }
    };

    recRef.current = rec;
    setInterim('');
    setError(null);
    setStatus('listening');
    try {
      rec.start();
    } catch (e) {
      recRef.current = null;
      setError(`${vi.speaking.errRecognition} (${e instanceof Error ? e.message : String(e)})`);
      setStatus('error');
    }
  }, []);

  /** Stop listening and process what was heard so far. */
  const stop = useCallback(() => recRef.current?.stop(), []);

  return { status, interim, error, start, stop };
}
