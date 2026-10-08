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
  /** From the first-run welcome; null until answered (or skipped). */
  profile: Profile | null;
  /** The welcome screen was finished or skipped. */
  onboarded: boolean;
  /** Anonymous page-view stats (Vercel Analytics); the learner can turn them off. */
  analytics: boolean;
  /** The "install on Home Screen" hint was closed. */
  installHintDismissed: boolean;
}

export const ROLES = ['dev', 'brse', 'tester', 'interview'] as const;
export type Role = (typeof ROLES)[number];
export const LEVELS = [2, 3, 4] as const;
export type Level = (typeof LEVELS)[number];
export const DAILY_MINUTES = [5, 10, 15] as const;
export type DailyMinutes = (typeof DAILY_MINUTES)[number];

export interface Profile {
  role: Role;
  /** TOPIK level. */
  level: Level;
  /** Daily goal; scales the daily session. */
  minutes: DailyMinutes;
}

function parseProfile(v: unknown): Profile | null {
  if (typeof v !== 'object' || v === null) return null;
  const { role, level, minutes } = v as Record<string, unknown>;
  const r = ROLES.find((x) => x === role);
  const l = LEVELS.find((x) => x === level);
  const m = DAILY_MINUTES.find((x) => x === minutes);
  return r && l && m ? { role: r, level: l, minutes: m } : null;
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
  profile: null,
  onboarded: false,
  analytics: true,
  installHintDismissed: false,
};

function clampRate(r: number): number {
  return Math.min(MAX_RATE, Math.max(MIN_RATE, r));
}

function read(): Prefs {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (typeof data === 'object' && data !== null) {
      const { speechRate, voiceSource, voiceURI, deepVoice, showPron, answerTimer, profile, onboarded, analytics, installHintDismissed } =
        data as Record<string, unknown>;
      return {
        speechRate:
          typeof speechRate === 'number' && Number.isFinite(speechRate) ? clampRate(speechRate) : DEFAULT_RATE,
        voiceSource: VOICE_SOURCES.find((v) => v === voiceSource) ?? DEFAULTS.voiceSource,
        voiceURI: typeof voiceURI === 'string' ? voiceURI : '',
        deepVoice: deepVoice === true,
        showPron: showPron !== false,
        answerTimer: ANSWER_TIMERS.find((t) => t === answerTimer) ?? DEFAULTS.answerTimer,
        profile: parseProfile(profile),
        onboarded: onboarded === true,
        analytics: analytics !== false,
        installHintDismissed: installHintDismissed === true,
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

/** Finish the welcome screen; null profile = skipped. A profile also sets a speed that suits the level. */
export function completeOnboarding(profile: Profile | null): void {
  const speechRate = profile ? ({ 2: 0.8, 3: 0.9, 4: 1 } as const)[profile.level] : current.speechRate;
  save({ ...current, profile, onboarded: true, speechRate });
}

/** Show the welcome screen again (from Settings). */
export function restartOnboarding(): void {
  save({ ...current, onboarded: false });
}

export function setAnalytics(analytics: boolean): void {
  save({ ...current, analytics });
}

export function dismissInstallHint(): void {
  save({ ...current, installHintDismissed: true });
}

export function setDailyMinutes(minutes: DailyMinutes): void {
  if (current.profile) save({ ...current, profile: { ...current.profile, minutes } });
}
