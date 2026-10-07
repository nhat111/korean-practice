// Sentences the learner flagged as wrong or unnatural ("Báo câu sai"), so they
// can be exported and fixed in the content files. Device-only, like prefs.

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'kp:reports:v1';

export interface ContentReport {
  /** Where the line lives, e.g. "shadowing:sh-01" or "scenario:<id>:<turn>". */
  key: string;
  /** The Korean line as shown. */
  ko: string;
  /** Optional note from the learner (what seems wrong). */
  note?: string;
  /** ISO timestamp. */
  at: string;
}

interface ReportsData {
  version: 1;
  items: ContentReport[];
}

function isReport(v: unknown): v is ContentReport {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.key === 'string' &&
    typeof r.ko === 'string' &&
    typeof r.at === 'string' &&
    (r.note === undefined || typeof r.note === 'string')
  );
}

function read(): ContentReport[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (typeof data === 'object' && data !== null && Array.isArray((data as ReportsData).items)) {
      return (data as ReportsData).items.filter(isReport);
    }
  } catch {
    // Corrupted or unavailable: start empty.
  }
  return [];
}

let current: ContentReport[] = read();
const listeners = new Set<() => void>();

function save(next: ContentReport[]): void {
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, items: current } satisfies ReportsData));
  } catch {
    // Keep in memory.
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useReports(): ContentReport[] {
  return useSyncExternalStore(subscribe, () => current);
}

const same = (r: ContentReport, key: string, ko: string) => r.key === key && r.ko === ko;

export function isReported(reports: ContentReport[], key: string, ko: string): boolean {
  return reports.some((r) => same(r, key, ko));
}

export function addReport(key: string, ko: string, note?: string): void {
  const clean = note?.trim();
  const report: ContentReport = { key, ko, at: new Date().toISOString(), ...(clean ? { note: clean } : {}) };
  save([report, ...current.filter((r) => !same(r, key, ko))]);
}

export function removeReport(key: string, ko: string): void {
  save(current.filter((r) => !same(r, key, ko)));
}

export function clearReports(): void {
  save([]);
}

/** Same shape as stored, for the export file. */
export function exportReports(): ReportsData {
  return { version: 1, items: current };
}
