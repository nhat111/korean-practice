// The learner's own interview questions, kept in one versioned localStorage key
// (kp:custom:v1). Like progress.ts, this is the only module that touches it.
// Practice results are NOT stored here: they go into progress as speaking
// attempts with source "custom:<id>".

import { useSyncExternalStore } from 'react';
import {
  mergeItems,
  readCustomData,
  toItems,
  type CustomData,
  type CustomItem,
} from '../custom/items';
import type { ParsedItem } from '../custom/parse';

const STORAGE_KEY = 'kp:custom:v1';

function read(): CustomItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return readCustomData(JSON.parse(raw))?.items ?? [];
  } catch {
    return [];
  }
}

function write(items: CustomItem[]): void {
  try {
    const data: CustomData = { version: 1, items };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable: keep the questions in memory for this session.
  }
}

let current: CustomItem[] = read();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function update(items: CustomItem[]): void {
  current = items;
  write(current);
  listeners.forEach((l) => l());
}

export function useCustomItems(): CustomItem[] {
  return useSyncExternalStore(subscribe, () => current);
}

/** Saves parsed questions, skipping ones that already exist. */
export function addCustomItems(parsed: ParsedItem[]): { added: number; duplicates: number } {
  const result = mergeItems(current, toItems(parsed));
  if (result.added > 0) update(result.items);
  return { added: result.added, duplicates: result.duplicates };
}

export function removeCustomItem(id: string): void {
  update(current.filter((i) => i.id !== id));
}

/** All questions as the text of a .json file (same shape as the stored key). */
export function exportCustomJson(): string {
  const data: CustomData = { version: 1, items: current };
  return JSON.stringify(data, null, 2);
}

export type ImportResult =
  | { ok: true; added: number; duplicates: number; invalid: number }
  | { ok: false; reason: 'notJson' | 'invalid' };

/** Adds the questions from an exported file; the same validation as reading storage. */
export function importCustomJson(fileText: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(fileText);
  } catch {
    return { ok: false, reason: 'notJson' };
  }
  const parsed = readCustomData(data);
  if (!parsed) return { ok: false, reason: 'invalid' };
  const result = mergeItems(current, parsed.items);
  if (result.added > 0) update(result.items);
  return { ok: true, added: result.added, duplicates: result.duplicates, invalid: parsed.invalid };
}

// Keep tabs in sync when the questions change in another tab.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return;
    current = read();
    listeners.forEach((l) => l());
  });
}
