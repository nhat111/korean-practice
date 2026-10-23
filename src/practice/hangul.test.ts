import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseHangul } from '../data/validate';
import type { CardState } from '../srs/sm2';
import { composeSyllable, finalSound, hangulItem, hangulProgress, hangulQuestions } from './hangul';

const { items } = parseHangul(JSON.parse(readFileSync('public/data/hangul.json', 'utf8')));
const lesson = items[0];

describe('hangulQuestions', () => {
  it('asks every letter, then every word, with the answer among unique options', () => {
    const qs = hangulQuestions(lesson, () => 0.3);
    expect(qs).toHaveLength(lesson.letters.length + lesson.words.length);
    expect(qs.slice(0, lesson.letters.length).every((q) => q.key.includes(':l'))).toBe(true);
    for (const q of qs) {
      expect(q.options[q.answer]).toBe(q.ko);
      expect(new Set(q.options).size).toBe(q.options.length);
    }
  });

  it('puts the listed look-alikes first', () => {
    const q = hangulQuestions(lesson).find((x) => x.ko === '어');
    expect(q?.options).toContain('오');
  });

  it('gives three options for every item in the content', () => {
    for (const l of items) for (const q of hangulQuestions(l)) expect(q.options).toHaveLength(3);
  });
});

describe('hangulProgress', () => {
  it('counts letters and words heard at least once', () => {
    const card = {} as CardState;
    const srs = {
      [`listen:hangul:${lesson.id}:l0`]: card,
      [`listen:hangul:${lesson.id}:w1`]: card,
      'listen:hangul:other:l0': card,
    };
    expect(hangulProgress(lesson, srs)).toEqual({ done: 2, total: lesson.letters.length + lesson.words.length });
  });
});

describe('hangulItem', () => {
  it('resolves quiz refs back to content', () => {
    expect(hangulItem(lesson, 'l0')?.ko).toBe(lesson.letters[0].syllable);
    expect(hangulItem(lesson, 'w0')?.ko).toBe(lesson.words[0].ko);
    expect(hangulItem(lesson, 'w99')).toBeUndefined();
  });
});

describe('composeSyllable', () => {
  it('builds syllable blocks', () => {
    expect(composeSyllable('ㄱ', 'ㅏ')).toBe('가');
    expect(composeSyllable('ㅎ', 'ㅏ', 'ㄴ')).toBe('한');
    expect(composeSyllable('ㄱ', 'ㅜ', 'ㄱ')).toBe('국');
    expect(composeSyllable('ㅇ', 'ㅢ')).toBe('의');
    expect(composeSyllable('ㅏ', 'ㄱ')).toBe('');
  });

  it('reads finals as one of seven sounds', () => {
    expect(finalSound('ㅅ')).toBe('t');
    expect(finalSound('ㅍ')).toBe('p');
    expect(finalSound('ㅇ')).toBe('ng');
    expect(finalSound('')).toBe('');
  });
});

describe('hangul.json', () => {
  it('uses only syllables the lesson can read aloud as quiz options', () => {
    for (const l of items) {
      for (const x of l.letters) for (const c of x.confuse ?? []) expect(c).toMatch(/^[가-힣]+$/);
      expect(l.id.startsWith('hg-')).toBe(true);
    }
  });
});
