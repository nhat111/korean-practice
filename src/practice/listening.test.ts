import { describe, expect, it } from 'vitest';
import type { NumberItem, Scenario, ShadowingItem, VocabItem } from '../types';
import { MAX_DICTATION, dictationPool, meaningPool, meaningQuestion, numberQuestion, sample } from './listening';

const sh = (id: string, topic: string, ko: string, vi: string): ShadowingItem => ({ id, level: 1, topic, ko, pron: '[x]', vi });
const voc = (id: string, tag: string, ko: string, vi: string): VocabItem => ({
  id,
  ko: id,
  vi: id,
  example: { ko, vi },
  tags: [tag],
});
const scenario: Scenario = {
  id: 's1',
  title: '',
  titleKo: '',
  description: '',
  category: 'meeting',
  tags: [],
  turns: [
    {
      client: '진행 상황 어떻게 되나요?',
      hint: '',
      choices: [],
      modelAnswer: '현재 약 70% 진행되었습니다. 백엔드 API는 완료했고, 지금은 프론트엔드 연동 작업을 하고 있습니다.',
      modelAnswerVi: 'Hiện đã xong khoảng 70%.',
    },
  ],
};
const content = {
  shadowing: [sh('a', 'bug', '확인해 보겠습니다.', 'Để tôi kiểm tra.'), sh('b', 'bug', '수정했습니다.', 'Đã sửa.')],
  vocab: [voc('v1', 'db', '쿼리가 느립니다.', 'Query chậm.'), voc('v2', 'bug', '로그를 봤습니다.', 'Đã xem log.')],
  scenarios: [scenario],
};

describe('meaningPool', () => {
  it('collects shadowing, vocab examples and model answers with their meanings', () => {
    const pool = meaningPool(content);
    // The long model answer is left out (over MAX_MEANING).
    expect(pool.map((l) => l.key)).toEqual(['shadowing:a', 'shadowing:b', 'vocab:v1', 'vocab:v2']);
    expect(pool.every((l) => l.vi)).toBe(true);
  });
});

describe('dictationPool', () => {
  it('keeps short lines only, including client lines and parts of long answers', () => {
    const pool = dictationPool(content);
    expect(pool.every((l) => l.ko.replace(/\s/g, '').length <= MAX_DICTATION)).toBe(true);
    expect(pool.map((l) => l.ko)).toContain('진행 상황 어떻게 되나요?');
    expect(pool.map((l) => l.ko)).toContain('현재 약 70% 진행되었습니다.');
    expect(pool.map((l) => l.ko)).not.toContain(scenario.turns[0].modelAnswer);
  });
});

describe('meaningQuestion', () => {
  it('has the right meaning plus distinct distractors, same group first', () => {
    const pool = meaningPool(content);
    const q = meaningQuestion(pool, pool[0]);
    expect(q.options).toHaveLength(3);
    expect(new Set(q.options).size).toBe(3);
    expect(q.options[q.answer]).toBe('Để tôi kiểm tra.');
    expect(q.options).toContain('Đã sửa.'); // same group "bug"
  });
});

describe('numberQuestion', () => {
  it('shuffles choices and tracks the answer', () => {
    const item: NumberItem = { id: 'n', kind: 'money', ko: 'x', vi: 'y', choices: ['A', 'B', 'C'], answer: 1 };
    for (let i = 0; i < 10; i++) {
      const q = numberQuestion(item);
      expect(q.options[q.answer]).toBe('B');
      expect(q.key).toBe('number:n');
    }
  });
});

describe('sample', () => {
  it('returns at most n distinct items', () => {
    expect(sample([1, 2, 3, 4], 2)).toHaveLength(2);
    expect(sample([1, 2], 5).sort()).toEqual([1, 2]);
  });
});
