import { describe, expect, it } from 'vitest';
import type { Scenario } from '../types';
import { filterAndSortScenarios, fold, type ScenarioQuery } from './scenarioFilter';

function sc(id: string, title: string, category: string, client = '안녕하세요'): Scenario {
  return {
    id,
    title,
    titleKo: id,
    description: '',
    category,
    tags: [],
    turns: [{ client, hint: '', choices: [], modelAnswer: '', modelAnswerVi: '' }],
  };
}

const items = [
  sc('a', 'Báo cáo tiến độ', 'pm', '진행 상황이 어떻게 되나요?'),
  sc('b', 'Xử lý sự cố', 'incident', '장애가 발생했습니다.'),
  sc('c', 'Ăn tối với khách', 'daily-life'),
];
const label = (c: string) => ({ pm: 'Quản lý dự án', incident: 'Sự cố' })[c] ?? c;
const q = (over: Partial<ScenarioQuery>): ScenarioQuery => ({ q: '', category: '', status: 'all', sort: 'default', ...over });

describe('fold', () => {
  it('removes Vietnamese diacritics and đ', () => {
    expect(fold('Đặt lịch Báo Cáo')).toBe('dat lich bao cao');
  });
});

describe('filterAndSortScenarios', () => {
  it('searches without diacritics, in Korean lines and category labels', () => {
    expect(filterAndSortScenarios(items, {}, q({ q: 'bao cao' }), label).map((s) => s.id)).toEqual(['a']);
    expect(filterAndSortScenarios(items, {}, q({ q: '장애' }), label).map((s) => s.id)).toEqual(['b']);
    expect(filterAndSortScenarios(items, {}, q({ q: 'su co' }), label).map((s) => s.id)).toEqual(['b']);
  });

  it('filters by category and status', () => {
    const results = { a: { bestScore: 3, totalTurns: 3, attempts: 1, lastPlayed: '2026-10-01' } };
    expect(filterAndSortScenarios(items, results, q({ category: 'pm' }), label).map((s) => s.id)).toEqual(['a']);
    expect(filterAndSortScenarios(items, results, q({ status: 'new' }), label).map((s) => s.id)).toEqual(['b', 'c']);
    expect(filterAndSortScenarios(items, results, q({ status: 'done' }), label).map((s) => s.id)).toEqual(['a']);
    expect(filterAndSortScenarios(items, results, q({ status: 'improve' }), label)).toEqual([]);
  });

  it('sorts by score, recency and title', () => {
    const results = {
      a: { bestScore: 3, totalTurns: 3, attempts: 1, lastPlayed: '2026-10-01T00:00:00Z' },
      b: { bestScore: 1, totalTurns: 3, attempts: 2, lastPlayed: '2026-10-02T00:00:00Z' },
    };
    expect(filterAndSortScenarios(items, results, q({ sort: 'low-score' }), label).map((s) => s.id)).toEqual(['c', 'b', 'a']);
    expect(filterAndSortScenarios(items, results, q({ sort: 'recent' }), label).map((s) => s.id)).toEqual(['b', 'a', 'c']);
    expect(filterAndSortScenarios(items, results, q({ sort: 'new-first' }), label).map((s) => s.id)).toEqual(['c', 'a', 'b']);
    expect(filterAndSortScenarios(items, {}, q({ sort: 'title' }), label).map((s) => s.title)).toEqual([
      'Ăn tối với khách',
      'Báo cáo tiến độ',
      'Xử lý sự cố',
    ]);
  });
});
