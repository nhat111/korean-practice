// Beginner lessons (TOPIK 1-2): listening questions and per-lesson progress.
// Pure, unit-tested.

import type { CardState } from '../srs/sm2';
import type { BasicLesson } from '../types';
import { srsKey } from './decks';
import { meaningQuestion, shuffle, type ChoiceQuestion, type ListenLine } from './listening';

/** Listening source key of a line; its SRS key is `listen:<this>`. */
export const basicListenSource = (id: string, line: number) => `basic:${id}:${line}`;

/** One "pick the meaning" question per line, in random order, distractors from the same lesson. */
export function basicQuestions(lesson: BasicLesson, rand: () => number = Math.random): ChoiceQuestion[] {
  const pool: ListenLine[] = lesson.lines.map((l, i) => ({
    key: basicListenSource(lesson.id, i),
    ko: l.ko,
    vi: l.vi,
    group: lesson.id,
  }));
  return shuffle(pool, rand).map((line) => meaningQuestion(pool, line, rand));
}

/** Lines practiced at least once (said aloud or heard in the quiz). */
export function basicProgress(lesson: BasicLesson, srs: Record<string, CardState>): { done: number; total: number } {
  const done = lesson.lines.filter(
    (_, i) => srs[srsKey.basic(lesson.id, i)] || srs[`listen:${basicListenSource(lesson.id, i)}`],
  ).length;
  return { done, total: lesson.lines.length };
}
