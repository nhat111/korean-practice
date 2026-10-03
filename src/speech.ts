// Reads Korean text aloud with the browser's SpeechSynthesis (ko-KR).

import { useEffect, useState } from 'react';
import { getPrefs } from './storage/prefs';

/** Pitch used for the "deep voice" option (approximates a male voice). */
const DEEP_PITCH = 0.7;

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Korean voices installed on this device, ko-KR first. */
export function getKoreanVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('ko'))
    .sort((a, b) => Number(b.lang === 'ko-KR') - Number(a.lang === 'ko-KR'));
}

/** Korean voices, updated when the browser finishes loading its voice list. */
export function useKoreanVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState(getKoreanVoices);
  useEffect(() => {
    if (!isSpeechSupported()) return;
    const update = () => setVoices(getKoreanVoices());
    window.speechSynthesis.addEventListener('voiceschanged', update);
    update();
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update);
  }, []);
  return voices;
}

// Browsers don't expose a voice's gender; guess from well-known voice names.
const MALE_HINTS = ['male', '남성', 'injoon', 'hyunsu', 'minsu', 'jinho', 'bongjin', 'gookmin', 'jiwon', 'sangchul'];
const FEMALE_HINTS = ['female', '여성', 'sunhi', 'yuna', 'sora', 'jimin', 'seoyeon', 'heami', 'yujin', 'seohyeon', 'soonbok'];

export type VoiceGender = 'male' | 'female' | 'unknown';

export function guessGender(voice: SpeechSynthesisVoice): VoiceGender {
  const name = voice.name.toLowerCase();
  if (MALE_HINTS.some((h) => name.includes(h))) return 'male';
  if (FEMALE_HINTS.some((h) => name.includes(h))) return 'female';
  return 'unknown';
}

function pickVoice(voiceURI: string): SpeechSynthesisVoice | undefined {
  const voices = getKoreanVoices();
  return (voiceURI ? voices.find((v) => v.voiceURI === voiceURI) : undefined) ?? voices[0];
}

// Some browsers load voices asynchronously; touching getVoices() early helps.
if (isSpeechSupported()) {
  window.speechSynthesis.getVoices();
}

/**
 * Speaks `text` with the learner's saved voice, pitch and speed (or the given
 * rate) and resolves when speech ends, fails or is cancelled.
 */
export function speakKorean(text: string, rate?: number): Promise<void> {
  if (!isSpeechSupported()) return Promise.resolve();
  const prefs = getPrefs();
  const synth = window.speechSynthesis;
  synth.cancel();
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = rate ?? prefs.speechRate;
    utterance.pitch = prefs.deepVoice ? DEEP_PITCH : 1;
    const voice = pickVoice(prefs.voiceURI);
    if (voice) utterance.voice = voice;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    synth.speak(utterance);
  });
}

export function stopSpeaking(): void {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}
