// Builds listening questions from existing content (all lines have natural-voice
// MP3s). Pure, unit-tested; the page only renders what these return.

import { splitParts } from '../speaking/segments';
import type { NumberItem, Scenario, ShadowingItem, VocabItem } from '../types';

export interface ListenLine {
  /** Stable source key, e.g. "vocab:t-gaebal"; SRS key is `listen:<key>`. */
  key: string;
  ko: string;
  /** Vietnamese meaning; '' when the source has none (client lines). */
  vi: string;
  /** Lines in the same group make better distractors (same topic). */
  group: string;
}

export interface ListenContent {
  vocab: VocabItem[];
  shadowing: ShadowingItem[];
  scenarios: Scenario[];
}

/** Dictation lines longer than this (characters, spaces excluded) are too long to type on a phone. */
export const MAX_DICTATION = 28;

const size = (s: string) => s.replace(/\s/g, '').length;

/** "Chọn ý" lines longer than this make options too long to read on a phone. */
export const MAX_MEANING = 40;

/** Lines with an exact Vietnamese meaning, for "nghe chọn ý". */
export function meaningPool(c: ListenContent): ListenLine[] {
  return allMeaningLines(c).filter((l) => size(l.ko) <= MAX_MEANING);
}

function allMeaningLines(c: ListenContent): ListenLine[] {
  return [
    ...c.shadowing.map((s) => ({ key: `shadowing:${s.id}`, ko: s.ko, vi: s.vi, group: s.topic })),
    ...c.vocab.map((v) => ({ key: `vocab:${v.id}`, ko: v.example.ko, vi: v.example.vi, group: v.tags[0] ?? '' })),
    ...c.scenarios.flatMap((s) =>
      s.turns.map((t, i) => ({ key: `scenario:${s.id}:${i}`, ko: t.modelAnswer, vi: t.modelAnswerVi, group: s.category })),
    ),
  ];
}

/** Short lines for "nghe chép": client lines, shadowing, vocab examples and parts of model answers. */
export function dictationPool(c: ListenContent): ListenLine[] {
  const lines: ListenLine[] = [
    ...c.scenarios.flatMap((s) =>
      s.turns.flatMap((t, i) => [
        { key: `client:${s.id}:${i}`, ko: t.client, vi: '', group: s.category },
        ...splitParts(t.modelAnswer).map((p, j) => ({
          key: `part:${s.id}:${i}:${j}`,
          ko: p,
          vi: '',
          group: s.category,
        })),
      ]),
    ),
    ...allMeaningLines({ ...c, scenarios: [] }),
  ];
  const seen = new Set<string>();
  return lines.filter((l) => size(l.ko) <= MAX_DICTATION && !seen.has(l.ko) && (seen.add(l.ko), true));
}

export function shuffle<T>(items: readonly T[], rand: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface ChoiceQuestion {
  /** Source key (SRS key is `listen:<key>`). */
  key: string;
  ko: string;
  vi: string;
  options: string[];
  /** Index of the correct option. */
  answer: number;
}

/**
 * Correct meaning + 2 distractors, preferring lines from the same group and of
 * similar length (so the answer can't be spotted by its length).
 */
export function meaningQuestion(pool: ListenLine[], line: ListenLine, rand: () => number = Math.random): ChoiceQuestion {
  const others = pool.filter((l) => l.key !== line.key && l.vi && l.vi !== line.vi);
  const close = (l: ListenLine) => Math.abs(l.vi.length - line.vi.length) <= Math.max(12, line.vi.length * 0.4);
  const same = shuffle(
    others.filter((l) => l.group === line.group && close(l)),
    rand,
  );
  const rest = [
    ...shuffle(
      others.filter((l) => l.group !== line.group && close(l)),
      rand,
    ),
    ...shuffle(
      others.filter((l) => !close(l)),
      rand,
    ),
  ];
  const distractors: string[] = [];
  for (const l of [...same, ...rest]) {
    if (distractors.length === 2) break;
    if (!distractors.includes(l.vi)) distractors.push(l.vi);
  }
  const options = shuffle([line.vi, ...distractors], rand);
  return { key: line.key, ko: line.ko, vi: line.vi, options, answer: options.indexOf(line.vi) };
}

/** A numbers item with its choices shuffled. */
export function numberQuestion(item: NumberItem, rand: () => number = Math.random): ChoiceQuestion {
  const correct = item.choices[item.answer];
  const options = shuffle(item.choices, rand);
  return { key: `number:${item.id}`, ko: item.ko, vi: item.vi, options, answer: options.indexOf(correct) };
}

/** `n` random items (all of them, shuffled, when there are fewer). */
export function sample<T>(items: readonly T[], n: number, rand: () => number = Math.random): T[] {
  return shuffle(items, rand).slice(0, n);
}
