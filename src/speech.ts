// Reads Korean text aloud with the browser's SpeechSynthesis (ko-KR).

import { getSpeechRate } from './storage/prefs';

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function findKoreanVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === 'ko-KR') ?? voices.find((v) => v.lang.toLowerCase().startsWith('ko'))
  );
}

// Some browsers load voices asynchronously; touching getVoices() early helps.
if (isSpeechSupported()) {
  window.speechSynthesis.getVoices();
}

/**
 * Speaks `text` at the given rate (default: the user's saved speed) and
 * resolves when speech ends, fails or is cancelled.
 */
export function speakKorean(text: string, rate = getSpeechRate()): Promise<void> {
  if (!isSpeechSupported()) return Promise.resolve();
  const synth = window.speechSynthesis;
  synth.cancel();
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = rate;
    const voice = findKoreanVoice();
    if (voice) utterance.voice = voice;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    synth.speak(utterance);
  });
}

export function stopSpeaking(): void {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}
