import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseBasics } from '../data/validate';
import type { CardState } from '../srs/sm2';
import { basicProgress, basicQuestions } from './basics';

const { items } = parseBasics(JSON.parse(readFileSync('public/data/basics.json', 'utf8')));
const lesson = items[0];

describe('basicQuestions', () => {
  it('asks every line once with three options from the same lesson', () => {
    const qs = basicQuestions(lesson, () => 0.3);
    expect(qs.map((q) => q.key).sort()).toEqual(lesson.lines.map((_, i) => `basic:${lesson.id}:${i}`).sort());
    const meanings = lesson.lines.map((l) => l.vi);
    for (const q of qs) {
      expect(q.options).toHaveLength(3);
      expect(q.options[q.answer]).toBe(q.vi);
      for (const o of q.options) expect(meanings).toContain(o);
    }
  });

  it('works for every lesson', () => {
    for (const l of items) for (const q of basicQuestions(l)) expect(q.options).toHaveLength(3);
  });
});

describe('basicProgress', () => {
  it('counts a line once whether it was spoken or heard', () => {
    const card = {} as CardState;
    const srs = {
      [`basic:${lesson.id}:0`]: card,
      [`listen:basic:${lesson.id}:0`]: card,
      [`listen:basic:${lesson.id}:2`]: card,
      'basic:other:1': card,
    };
    expect(basicProgress(lesson, srs)).toEqual({ done: 2, total: lesson.lines.length });
  });
});
