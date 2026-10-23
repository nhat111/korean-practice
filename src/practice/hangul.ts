// Hangul alphabet lessons (from zero to TOPIK 1): listening questions, per-lesson
// progress and the syllable builder. Pure, unit-tested.

import type { CardState } from '../srs/sm2';
import { FINALS, INITIALS, MEDIALS } from '../typing/hangul';
import type { HangulLesson } from '../types';
import { shuffle, type ChoiceQuestion } from './listening';

/** Listening source key of a letter or word; its SRS key is `listen:<this>`. */
export const hangulSource = (id: string, kind: 'l' | 'w', index: number) => `hangul:${id}:${kind}${index}`;

const OPTIONS = 3;

/** The answer, its listed look-alikes, then other items of the lesson (closest length first). */
function pickOptions(answer: string, confuse: string[], pool: string[], rand: () => number): string[] {
  const out = [answer];
  for (const c of confuse) if (out.length < OPTIONS && !out.includes(c)) out.push(c);
  const rest = shuffle(
    pool.filter((p) => !out.includes(p)),
    rand,
  ).sort((a, b) => Math.abs(a.length - answer.length) - Math.abs(b.length - answer.length));
  for (const p of rest) if (out.length < OPTIONS && !out.includes(p)) out.push(p);
  return out;
}

function question(key: string, ko: string, viText: string, note: string | undefined, options: string[], rand: () => number): ChoiceQuestion {
  const shuffled = shuffle(options, rand);
  return { key, ko, vi: viText, note, options: shuffled, answer: shuffled.indexOf(ko) };
}

/** Hear a syllable or word, pick how it is written: letters first, then words, each group shuffled. */
export function hangulQuestions(lesson: HangulLesson, rand: () => number = Math.random): ChoiceQuestion[] {
  const syllables = lesson.letters.map((l) => l.syllable);
  const words = lesson.words.map((w) => w.ko);
  const letterQs = lesson.letters.map((l, i) =>
    question(
      hangulSource(lesson.id, 'l', i),
      l.syllable,
      `${l.char}${l.name ? ` (${l.name})` : ''} · ${l.sound}`,
      l.note,
      pickOptions(l.syllable, l.confuse ?? [], syllables, rand),
      rand,
    ),
  );
  const wordQs = lesson.words.map((w, i) =>
    question(
      hangulSource(lesson.id, 'w', i),
      w.ko,
      w.vi,
      [w.pron, w.note].filter(Boolean).join(' ') || undefined,
      pickOptions(w.ko, w.confuse ?? [], words, rand),
      rand,
    ),
  );
  return [...shuffle(letterQs, rand), ...shuffle(wordQs, rand)];
}

/** Letters and words heard at least once in the quiz. */
export function hangulProgress(lesson: HangulLesson, srs: Record<string, CardState>): { done: number; total: number } {
  const keys = [
    ...lesson.letters.map((_, i) => hangulSource(lesson.id, 'l', i)),
    ...lesson.words.map((_, i) => hangulSource(lesson.id, 'w', i)),
  ];
  return { done: keys.filter((k) => srs[`listen:${k}`]).length, total: keys.length };
}

/** Letter or word behind a quiz key ("l3" / "w0"), for "Câu cần luyện lại". */
export function hangulItem(lesson: HangulLesson, ref: string): { ko: string; vi: string } | undefined {
  const i = Number(ref.slice(1));
  if (ref[0] === 'l') {
    const l = lesson.letters[i];
    return l && { ko: l.syllable, vi: `${l.char} · ${l.sound}` };
  }
  const w = lesson.words[i];
  return w && { ko: w.ko, vi: w.vi };
}

/** Builder choices: every initial and vowel, and the common finals ('' = none). */
export const BUILDER_INITIALS = [...INITIALS];
export const BUILDER_VOWELS = [...MEDIALS];
export const BUILDER_FINALS = ['', 'ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ', 'ㄲ', 'ㅆ'];

/** One syllable block from its jamo; '' when a part is not a valid jamo in that position. */
export function composeSyllable(initial: string, vowel: string, final = ''): string {
  const i = INITIALS.indexOf(initial);
  const v = MEDIALS.indexOf(vowel);
  const f = FINALS.indexOf(final);
  if (i < 0 || v < 0 || f < 0 || initial.length !== 1 || vowel.length !== 1) return '';
  return String.fromCharCode(0xac00 + i * 588 + v * 28 + f);
}

const FINAL_SOUNDS: [string, string][] = [
  ['ㄱㅋㄲ', 'k'],
  ['ㄴ', 'n'],
  ['ㄷㅅㅆㅈㅊㅌㅎ', 't'],
  ['ㄹ', 'l'],
  ['ㅁ', 'm'],
  ['ㅂㅍ', 'p'],
  ['ㅇ', 'ng'],
];

/** Which of the 7 final sounds a final consonant is read as ('' for none or unknown). */
export function finalSound(final: string): string {
  if (!final) return '';
  return FINAL_SOUNDS.find(([letters]) => letters.includes(final))?.[1] ?? '';
}
