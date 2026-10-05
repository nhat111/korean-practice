// Fills a sentence pattern ("{noun}{은/는} 현재 {n}% 진행되었습니다.") with
// slot words and picks particles by batchim. Pure, unit-tested.
// Imports use explicit .ts extensions so scripts/tts-jobs.ts can load this
// module directly with Node.

import { josa, parsePair } from '../speaking/josa.ts';
import type { PatternItem } from '../types.ts';

const TOKEN = /\{([^}]+)\}/g;

export type PartKind = 'text' | 'slot' | 'josa';

export interface FilledPart {
  text: string;
  kind: PartKind;
}

export interface FilledPattern {
  ko: string;
  vi: string;
  /** `ko` split into fixed text, slot words and chosen particles (for highlighting). */
  parts: FilledPart[];
}

/** Index of the chosen filler for each slot. */
export type SlotChoice = Record<string, number>;

/** Slot names and particle pairs used in a frame, in order. */
export function patternTokens(frame: string): { slots: string[]; pairs: string[] } {
  const slots: string[] = [];
  const pairs: string[] = [];
  for (const m of frame.matchAll(TOKEN)) {
    if (m[1].includes('/')) pairs.push(m[1]);
    else slots.push(m[1]);
  }
  return { slots, pairs };
}

/** Problems with a pattern's tokens (unknown slot, unknown particle pair); empty = valid. */
export function patternProblems(item: Pick<PatternItem, 'pattern' | 'vi' | 'slots'>): string[] {
  const problems: string[] = [];
  const { slots, pairs } = patternTokens(item.pattern);
  for (const s of [...slots, ...patternTokens(item.vi).slots]) {
    if (!item.slots[s]?.length) problems.push(`slot "{${s}}" không có trong slots`);
  }
  for (const p of pairs) {
    if (!parsePair(p)) problems.push(`tiểu từ "{${p}}" không hỗ trợ`);
  }
  if (pairs.length > 0 && item.pattern.trimStart().startsWith(`{${pairs[0]}}`)) {
    problems.push('tiểu từ không thể đứng đầu câu');
  }
  return problems;
}

function fill(frame: string, words: Record<string, string>, withParticles: boolean): FilledPart[] {
  const parts: FilledPart[] = [];
  let soFar = '';
  let last = 0;
  const push = (text: string, kind: PartKind) => {
    if (!text) return;
    parts.push({ text, kind });
    soFar += text;
  };
  for (const m of frame.matchAll(TOKEN)) {
    push(frame.slice(last, m.index), 'text');
    const token = m[1];
    if (token.includes('/')) {
      push(withParticles ? josa(soFar, token) : token, 'josa');
    } else {
      push(words[token] ?? token, 'slot');
    }
    last = (m.index ?? 0) + m[0].length;
  }
  push(frame.slice(last), 'text');
  return parts;
}

export function fillPattern(item: PatternItem, choice: SlotChoice): FilledPattern {
  const ko: Record<string, string> = {};
  const vi: Record<string, string> = {};
  for (const [name, fillers] of Object.entries(item.slots)) {
    const f = fillers[choice[name] ?? 0] ?? fillers[0];
    ko[name] = f.ko;
    vi[name] = f.vi;
  }
  const parts = fill(item.pattern, ko, true);
  return {
    ko: parts.map((p) => p.text).join(''),
    vi: fill(item.vi, vi, false)
      .map((p) => p.text)
      .join(''),
    parts,
  };
}

/** A random filler for every slot, different from `previous` when possible. */
export function randomChoice(item: PatternItem, previous?: SlotChoice, rand: () => number = Math.random): SlotChoice {
  const names = Object.keys(item.slots);
  const total = names.reduce((n, s) => n * item.slots[s].length, 1);
  for (let attempt = 0; attempt < 10; attempt++) {
    const choice: SlotChoice = {};
    for (const s of names) choice[s] = Math.floor(rand() * item.slots[s].length);
    if (!previous || total < 2 || names.some((s) => choice[s] !== previous[s])) return choice;
  }
  return Object.fromEntries(names.map((s) => [s, ((previous?.[s] ?? 0) + 1) % item.slots[s].length]));
}

/** Every combination of fillers (for pre-generating audio). */
export function allFills(item: PatternItem): FilledPattern[] {
  let choices: SlotChoice[] = [{}];
  for (const [name, fillers] of Object.entries(item.slots)) {
    choices = choices.flatMap((c) => fillers.map((_, i) => ({ ...c, [name]: i })));
  }
  return choices.map((c) => fillPattern(item, c));
}
