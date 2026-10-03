// Per-device preferences (separate from learning progress).

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'kp:prefs:v1';

export const MIN_RATE = 0.7;
export const MAX_RATE = 1;
const DEFAULT_RATE = 0.9;

interface Prefs {
  speechRate: number;
}

function clampRate(r: number): number {
  return Math.min(MAX_RATE, Math.max(MIN_RATE, r));
}

function read(): Prefs {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (typeof data === 'object' && data !== null && 'speechRate' in data) {
      const rate = (data as { speechRate: unknown }).speechRate;
      if (typeof rate === 'number' && Number.isFinite(rate)) return { speechRate: clampRate(rate) };
    }
  } catch {
    // Fall through to defaults.
  }
  return { speechRate: DEFAULT_RATE };
}

let current: Prefs = read();
const listeners = new Set<() => void>();

export function getSpeechRate(): number {
  return current.speechRate;
}

export function setSpeechRate(rate: number): void {
  current = { ...current, speechRate: clampRate(rate) };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Keep the in-memory value.
  }
  listeners.forEach((l) => l());
}

export function useSpeechRate(): number {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current.speechRate,
  );
}
