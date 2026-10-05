import { describe, expect, it } from 'vitest';
import type { PatternItem } from '../types';
import { allFills, fillPattern, patternProblems, randomChoice } from './fill';

const item: PatternItem = {
  id: 'pt-test',
  pattern: '{noun}{은/는} 현재 {n}% 진행되었습니다.',
  vi: '{noun} hiện đã xong khoảng {n}%.',
  slots: {
    noun: [
      { ko: '결제 기능', vi: 'chức năng thanh toán' },
      { ko: 'API 연동', vi: 'kết nối API' },
      { ko: '관리자 화면', vi: 'màn hình quản trị' },
    ],
    n: [
      { ko: '30', vi: '30' },
      { ko: '70', vi: '70' },
    ],
  },
};

describe('fillPattern', () => {
  it('fills slots and picks the particle by batchim', () => {
    expect(fillPattern(item, { noun: 0, n: 1 }).ko).toBe('결제 기능은 현재 70% 진행되었습니다.');
    expect(fillPattern(item, { noun: 1, n: 0 }).ko).toBe('API 연동은 현재 30% 진행되었습니다.');
  });
  it('fills the Vietnamese frame with meanings', () => {
    expect(fillPattern(item, { noun: 2, n: 0 }).vi).toBe('màn hình quản trị hiện đã xong khoảng 30%.');
  });
  it('splits the sentence into text, slot and particle parts', () => {
    const { parts } = fillPattern(item, { noun: 0, n: 0 });
    expect(parts.slice(0, 3)).toEqual([
      { text: '결제 기능', kind: 'slot' },
      { text: '은', kind: 'josa' },
      { text: ' 현재 ', kind: 'text' },
    ]);
  });
  it('uses vowel forms after a vowel', () => {
    const p: PatternItem = {
      id: 'x',
      pattern: '혹시 {noun}{을/를} 공유해 주실 수 있을까요?',
      vi: '{noun}',
      slots: { noun: [{ ko: '테스트 데이터', vi: 'dữ liệu test' }] },
    };
    expect(fillPattern(p, {}).ko).toBe('혹시 테스트 데이터를 공유해 주실 수 있을까요?');
  });
});

describe('allFills', () => {
  it('returns every combination', () => {
    expect(allFills(item)).toHaveLength(6);
    expect(new Set(allFills(item).map((f) => f.ko)).size).toBe(6);
  });
});

describe('randomChoice', () => {
  it('differs from the previous choice', () => {
    for (let i = 0; i < 20; i++) {
      const prev = randomChoice(item);
      const next = randomChoice(item, prev);
      expect(next).not.toEqual(prev);
    }
  });
  it('changes something even when the random source is stuck', () => {
    const next = randomChoice(item, { noun: 0, n: 0 }, () => 0);
    expect(next).not.toEqual({ noun: 0, n: 0 });
  });
});

describe('patternProblems', () => {
  it('accepts a valid pattern', () => {
    expect(patternProblems(item)).toEqual([]);
  });
  it('reports unknown slots and particle pairs', () => {
    expect(patternProblems({ ...item, pattern: '{date}{에/에서} 해요' })).toHaveLength(2);
  });
});
