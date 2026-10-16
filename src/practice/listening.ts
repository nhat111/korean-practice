// Builds listening questions from existing content (all lines have natural-voice
// MP3s). Pure, unit-tested; the page only renders what these return.

import { splitParts } from '../speaking/segments';
import type { GrammarLesson, NumberItem, Scenario, ShadowingItem, VocabItem } from '../types';

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
  /** Shown with the answer, e.g. the grammar pattern and its meaning. */
  note?: string;
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

// ---------- "Ngữ pháp": hear an example, pick the grammar pattern it uses ----------

/** `listen:grammar:<lesson id>:<example index>`. */
export function grammarKey(lessonId: string, example: number): string {
  return `grammar:${lessonId}:${example}`;
}

const HANGUL_SYLLABLE = /[\uAC00-\uD7A3]/g;

/**
 * Literal Hangul a pattern must leave in a sentence, one string per variant
 * ("-(으)ㄴ/는데요" → ["데요", "는데요"]), or null when some variant is too short
 * or too changeable to spot (contractions like 해서 for -아/어서, -(으)시-).
 * Used only to keep a pattern out of the wrong options when it might also be in
 * the sentence, so a null (unknown) just means "never a distractor".
 */
export function patternMarkers(pattern: string): string[] | null {
  const variants = pattern.split(' / ').flatMap(expandSlashes);
  const markers: string[] = [];
  for (const v of variants) {
    let t = v.replace(/\(으\)|[-?N\s]/g, '');
    // A leading jamo (ㄴ, ㄹ) merges into the stem's last syllable: drop it.
    t = t.replace(/^[\u3131-\u318E]+/, '');
    // Dictionary-form 다 changes when conjugated (있다 → 있습니다), and so do
    // stems ending in 하/되/이/리/르 (했습니다, 됩니다, 입니다, 드려요, 모릅니다).
    if (t.endsWith('다') && t.length > 2) {
      t = t.slice(0, -1);
      if (/[하되이리르]$/.test(t)) t = t.slice(0, -1);
    }
    // 아/어 at the start is often contracted (해 두다, 봐 주시겠어요).
    if (/^[아어]/.test(t)) t = t.slice(1);
    if ((t.match(HANGUL_SYLLABLE) ?? []).length < 2 || /[^\uAC00-\uD7A3]/.test(t)) return null;
    markers.push(t);
  }
  return markers;
}

/** "아/어 두다" → ["아 두다", "어 두다"]; "ㄴ/는데요" → ["ㄴ데요", "는데요"]. */
function expandSlashes(text: string): string[] {
  const m = /([^\s/()-]+)\/([^\s/()-]+?)(?=[\uAC00-\uD7A3\s?]|$)/.exec(text);
  if (!m) return [text];
  // The alternatives are the shortest units around the slash: one syllable or jamo each.
  const left = m[1].slice(-1);
  const right = m[2].slice(0, 1);
  const before = text.slice(0, m.index + m[1].length - 1);
  const after = text.slice(m.index + m[1].length + 2);
  return [...expandSlashes(before + left + after), ...expandSlashes(before + right + after)];
}

export interface GrammarListenLine {
  key: string;
  ko: string;
  vi: string;
  lessonId: string;
}

/** Every grammar example (lesson examples have natural-voice MP3s). */
export function grammarPool(lessons: GrammarLesson[]): GrammarListenLine[] {
  return lessons.flatMap((l) =>
    l.examples.map((e, i) => ({ key: grammarKey(l.id, i), ko: e.ko, vi: e.vi, lessonId: l.id })),
  );
}

/**
 * The lesson's pattern + 2 other patterns, from the same group when possible.
 * A pattern that might also occur in the sentence is never a wrong option.
 */
export function grammarQuestion(
  lessons: GrammarLesson[],
  line: GrammarListenLine,
  rand: () => number = Math.random,
): ChoiceQuestion {
  const lesson = lessons.find((l) => l.id === line.lessonId);
  if (!lesson) throw new Error(`Unknown grammar lesson ${line.lessonId}`);
  const flat = line.ko.replace(/\s/g, '');
  const safe = lessons.filter((l) => {
    if (l.id === lesson.id || l.pattern === lesson.pattern) return false;
    const markers = patternMarkers(l.pattern);
    return markers !== null && markers.every((m) => !flat.includes(m));
  });
  const ordered = [
    ...shuffle(
      safe.filter((l) => l.group === lesson.group),
      rand,
    ),
    ...shuffle(
      safe.filter((l) => l.group !== lesson.group),
      rand,
    ),
  ];
  const options = shuffle([lesson.pattern, ...ordered.slice(0, 2).map((l) => l.pattern)], rand);
  return {
    key: line.key,
    ko: line.ko,
    vi: line.vi,
    options,
    answer: options.indexOf(lesson.pattern),
    note: `${lesson.pattern}: ${lesson.meaningVi}`,
  };
}
