// Per-device preferences (separate from learning progress).
// Fields were added over time; missing ones fall back to defaults, so older
// saved prefs keep working.

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'kp:prefs:v1';

export const MIN_RATE = 0.5;
export const MAX_RATE = 1.2;
const DEFAULT_RATE = 0.9;

/** Natural pre-generated voices (public/audio) or the device's own TTS. */
export type VoiceSource = 'male' | 'female' | 'device';
const VOICE_SOURCES: readonly VoiceSource[] = ['male', 'female', 'device'];

export interface Prefs {
  speechRate: number;
  voiceSource: VoiceSource;
  /** SpeechSynthesisVoice.voiceURI of the chosen Korean voice; '' = automatic. */
  voiceURI: string;
  /** Lower pitch, to approximate a male voice when the device only has female ones. */
  deepVoice: boolean;
  /** Show the actual pronunciation ([화긴]) and romanization under Korean lines. */
  showPron: boolean;
  /** Seconds to answer in scenario "Tự nói" mode; 0 = no countdown. */
  answerTimer: AnswerTimer;
}

export const ANSWER_TIMERS = [0, 10, 15, 20] as const;
export type AnswerTimer = (typeof ANSWER_TIMERS)[number];

const DEFAULTS: Prefs = {
  speechRate: DEFAULT_RATE,
  voiceSource: 'male',
  voiceURI: '',
  deepVoice: false,
  showPron: true,
  answerTimer: 0,
};

function clampRate(r: number): number {
  return Math.min(MAX_RATE, Math.max(MIN_RATE, r));
}

function read(): Prefs {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (typeof data === 'object' && data !== null) {
      const { speechRate, voiceSource, voiceURI, deepVoice, showPron, answerTimer } = data as Record<string, unknown>;
      return {
        speechRate:
          typeof speechRate === 'number' && Number.isFinite(speechRate) ? clampRate(speechRate) : DEFAULT_RATE,
        voiceSource: VOICE_SOURCES.find((v) => v === voiceSource) ?? DEFAULTS.voiceSource,
        voiceURI: typeof voiceURI === 'string' ? voiceURI : '',
        deepVoice: deepVoice === true,
        showPron: showPron !== false,
        answerTimer: ANSWER_TIMERS.find((t) => t === answerTimer) ?? DEFAULTS.answerTimer,
      };
    }
  } catch {
    // Fall through to defaults.
  }
  return DEFAULTS;
}

let current: Prefs = read();
const listeners = new Set<() => void>();

function save(next: Prefs): void {
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Keep the in-memory value.
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getPrefs(): Prefs {
  return current;
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, () => current);
}

export function getSpeechRate(): number {
  return current.speechRate;
}

export function setSpeechRate(rate: number): void {
  save({ ...current, speechRate: clampRate(rate) });
}

export function useSpeechRate(): number {
  return useSyncExternalStore(subscribe, () => current.speechRate);
}

export function setVoiceSource(voiceSource: VoiceSource): void {
  save({ ...current, voiceSource });
}

export function setVoiceURI(voiceURI: string): void {
  save({ ...current, voiceURI });
}

export function setDeepVoice(deepVoice: boolean): void {
  save({ ...current, deepVoice });
}

export function setShowPron(showPron: boolean): void {
  save({ ...current, showPron });
}

export function setAnswerTimer(answerTimer: AnswerTimer): void {
  save({ ...current, answerTimer });
}
