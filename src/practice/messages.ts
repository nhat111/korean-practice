// Chat message drill helpers: which model phrases the learner reused, and the
// model split into marked / unmarked parts for highlighting. Pure, unit-tested.

import type { MessagePhrase } from '../types';

/** Drops spaces and punctuation so "확인 부탁 드립니다." matches "확인 부탁드립니다". */
function normalize(text: string): string {
  return text.normalize('NFC').replace(/[\s.,!?~…·'"()[\]{}:;\-–]/gu, '');
}

/** Whether `text` contains the phrase, ignoring spacing and punctuation. */
export function phraseUsed(text: string, phrase: string): boolean {
  const p = normalize(phrase);
  return p.length > 0 && normalize(text).includes(p);
}

export interface MarkedPart {
  text: string;
  /** Index into `phrases`, or null for plain text. */
  phrase: number | null;
}

/** Splits `model` so each phrase (first occurrence, no overlaps) is its own part. */
export function markPhrases(model: string, phrases: MessagePhrase[]): MarkedPart[] {
  const spans = phrases
    .map((p, i) => ({ i, start: model.indexOf(p.ko), len: p.ko.length }))
    .filter((s) => s.start >= 0 && s.len > 0)
    .sort((a, b) => a.start - b.start);
  const parts: MarkedPart[] = [];
  let pos = 0;
  for (const s of spans) {
    if (s.start < pos) continue; // overlaps an earlier phrase
    if (s.start > pos) parts.push({ text: model.slice(pos, s.start), phrase: null });
    parts.push({ text: model.slice(s.start, s.start + s.len), phrase: s.i });
    pos = s.start + s.len;
  }
  if (pos < model.length) parts.push({ text: model.slice(pos), phrase: null });
  return parts;
}
