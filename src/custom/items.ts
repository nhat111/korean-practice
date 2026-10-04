// Pure model for the learner's own interview questions: validation of stored or
// imported data, ids, and merging without duplicates. No storage access here
// (that lives in src/storage/custom.ts) so everything can be unit-tested.

import type { ParsedItem } from './parse';

export interface CustomItem {
  /** "custom-<random>". Progress is keyed by it (source "custom:<id>"), so never reuse. */
  id: string;
  /** Question (Korean). */
  q: string;
  /** Model answer (Korean). */
  a: string;
  /** Vietnamese meaning of the answer, optional. */
  vi?: string;
  /** ISO timestamp. */
  createdAt: string;
}

export interface CustomData {
  version: 1;
  items: CustomItem[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function text(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export function newId(): string {
  return `custom-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Two questions count as the same when they only differ in case or spacing. */
export function questionKey(q: string): string {
  return q.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Validates stored or imported data. Returns null if it is not custom-question
 * data at all; otherwise the usable items plus how many entries were dropped
 * (wrong shape, empty Q or A, or a repeated id).
 */
export function readCustomData(
  data: unknown,
  now: string = new Date().toISOString(),
): { items: CustomItem[]; invalid: number } | null {
  if (!isRecord(data) || data.version !== 1 || !Array.isArray(data.items)) return null;
  const items: CustomItem[] = [];
  const ids = new Set<string>();
  let invalid = 0;
  for (const raw of data.items) {
    if (!isRecord(raw)) {
      invalid++;
      continue;
    }
    const q = text(raw.q);
    const a = text(raw.a);
    const id = text(raw.id) || newId();
    if (!q || !a || ids.has(id)) {
      invalid++;
      continue;
    }
    ids.add(id);
    const viText = text(raw.vi);
    const createdAt =
      typeof raw.createdAt === 'string' && !Number.isNaN(Date.parse(raw.createdAt)) ? raw.createdAt : now;
    items.push(viText ? { id, q, a, vi: viText, createdAt } : { id, q, a, createdAt });
  }
  return { items, invalid };
}

/** Turns parsed blocks into stored items with fresh ids. */
export function toItems(parsed: ParsedItem[], now: string = new Date().toISOString()): CustomItem[] {
  return parsed.map((p) => ({ id: newId(), ...p, createdAt: now }));
}

export interface MergeResult {
  items: CustomItem[];
  added: number;
  /** Incoming questions skipped because the same question already exists. */
  duplicates: number;
}

/** Appends `incoming` to `existing`, skipping questions that are already there. */
export function mergeItems(existing: CustomItem[], incoming: CustomItem[]): MergeResult {
  const keys = new Set(existing.map((i) => questionKey(i.q)));
  const ids = new Set(existing.map((i) => i.id));
  const items = [...existing];
  let duplicates = 0;
  for (const item of incoming) {
    const key = questionKey(item.q);
    if (keys.has(key)) {
      duplicates++;
      continue;
    }
    keys.add(key);
    const id = ids.has(item.id) ? newId() : item.id;
    ids.add(id);
    items.push({ ...item, id });
  }
  return { items, added: items.length - existing.length, duplicates };
}
