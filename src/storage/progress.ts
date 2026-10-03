// The only module that touches localStorage. Progress is kept in one
// versioned key and exposed through a tiny store + React hook.

import { useSyncExternalStore } from 'react';
import type { CardState } from '../srs/sm2';

const STORAGE_KEY = 'kp:progress:v1';

export interface ScenarioResult {
  /** Best score (correct turns) across attempts. */
  bestScore: number;
  totalTurns: number;
  attempts: number;
  /** ISO timestamp of the last finished attempt. */
  lastPlayed: string;
}

export interface EmailResult {
  attempts: number;
  /** ISO timestamp of the last time the corrected version was revealed. */
  lastDone: string;
}

export type SpeakingMode = 'shadowing' | 'check' | 'roleplay';
export type SelfRating = 'good' | 'ok' | 'bad';

export interface SpeakingAttempt {
  /** ISO timestamp. */
  at: string;
  mode: SpeakingMode;
  /** Where the line came from, e.g. "scenario:<id>:<turn>" or "vocab:<id>". */
  source: string;
  /** The Korean line the learner tried to say. */
  target: string;
  /** Speech recognition result, when available. */
  transcript?: string;
  /** 0-100 similarity score from speech recognition. */
  score?: number;
  /** Self-assessment when recognition is unavailable. */
  selfRating?: SelfRating;
}

/** Only the most recent attempts are kept to stay well under storage limits. */
const MAX_SPEAKING_HISTORY = 300;

export interface Progress {
  version: 1;
  /** Flashcard SM-2 state keyed by VocabItem id. */
  cards: Record<string, CardState>;
  /** Keyed by Scenario id. */
  scenarios: Record<string, ScenarioResult>;
  /** Keyed by EmailExercise id. */
  emails: Record<string, EmailResult>;
  /** Newest first. Added after v1 shipped; older data reads as []. */
  speaking: SpeakingAttempt[];
}

function emptyProgress(): Progress {
  return { version: 1, cards: {}, scenarios: {}, emails: {}, speaking: [] };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Validates a stored or imported progress object; null if unusable. */
function parse(data: unknown): Progress | null {
  if (!isRecord(data) || data.version !== 1) return null;
  return {
    version: 1,
    cards: isRecord(data.cards) ? (data.cards as Progress['cards']) : {},
    scenarios: isRecord(data.scenarios) ? (data.scenarios as Progress['scenarios']) : {},
    emails: isRecord(data.emails) ? (data.emails as Progress['emails']) : {},
    speaking: Array.isArray(data.speaking) ? (data.speaking as Progress['speaking']) : [],
  };
}

function read(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    return parse(JSON.parse(raw)) ?? emptyProgress();
  } catch {
    return emptyProgress();
  }
}

function write(p: Progress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // Storage full or unavailable: keep progress in memory for this session.
  }
}

let current: Progress = read();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function update(fn: (p: Progress) => Progress): void {
  current = fn(current);
  write(current);
  listeners.forEach((l) => l());
}

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, () => current);
}

export function saveCard(id: string, state: CardState): void {
  update((p) => ({ ...p, cards: { ...p.cards, [id]: state } }));
}

export function saveScenarioResult(id: string, score: number, totalTurns: number): void {
  update((p) => {
    const prev = p.scenarios[id];
    const result: ScenarioResult = {
      bestScore: Math.max(prev?.bestScore ?? 0, score),
      totalTurns,
      attempts: (prev?.attempts ?? 0) + 1,
      lastPlayed: new Date().toISOString(),
    };
    return { ...p, scenarios: { ...p.scenarios, [id]: result } };
  });
}

export function saveEmailDone(id: string): void {
  update((p) => {
    const result: EmailResult = {
      attempts: (p.emails[id]?.attempts ?? 0) + 1,
      lastDone: new Date().toISOString(),
    };
    return { ...p, emails: { ...p.emails, [id]: result } };
  });
}

export function saveSpeakingAttempt(attempt: Omit<SpeakingAttempt, 'at'>): void {
  update((p) => ({
    ...p,
    speaking: [{ ...attempt, at: new Date().toISOString() }, ...p.speaking].slice(
      0,
      MAX_SPEAKING_HISTORY,
    ),
  }));
}

/** Current progress, in the same shape as stored under kp:progress:v1 (for sync). */
export function exportProgress(): Progress {
  return current;
}

/**
 * Replaces local progress with `data` (e.g. downloaded from the backend).
 * Returns false and changes nothing if `data` is not valid progress.
 */
export function importProgress(data: unknown): boolean {
  const parsed = parse(data);
  if (!parsed) return false;
  update(() => parsed);
  return true;
}

export function resetProgress(): void {
  update(() => emptyProgress());
}

// Keep tabs in sync when progress changes in another tab.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return;
    current = read();
    listeners.forEach((l) => l());
  });
}
