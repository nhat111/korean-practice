import { describe, expect, it } from 'vitest';
import type { CardState } from '../srs/sm2';
import type { PatternItem, Scenario, ShadowingItem } from '../types';
import { buildDailyPlan, pickKeys, streak } from './plan';

const card = (due: string): CardState => ({ ef: 2.5, interval: 1, reps: 1, due, lastReviewed: due });
const today = '2026-10-05';

describe('pickKeys', () => {
  it('puts due keys first (most overdue first), then new, then later', () => {
    const srs = { a: card('2026-10-07'), b: card('2026-10-05'), c: card('2026-10-01') };
    expect(pickKeys(['a', 'b', 'c', 'd'], srs, today, 4)).toEqual(['c', 'b', 'd', 'a']);
  });
  it('returns at most n keys', () => {
    expect(pickKeys(['a', 'b', 'c'], {}, today, 2)).toHaveLength(2);
  });
});

const sh = (id: string, topic: string): ShadowingItem => ({ id, level: 1, topic, ko: id, pron: '[x]', vi: id });
const pattern = (id: string): PatternItem => ({ id, pattern: '{n}', vi: '{n}', slots: { n: [{ ko: '1', vi: '1' }] } });
const scenario: Scenario = {
  id: 'standup-001',
  title: '',
  titleKo: '',
  description: '',
  category: 'meeting',
  tags: [],
  turns: [
    { client: '', hint: '', choices: [], modelAnswer: 'a', modelAnswerVi: '' },
    { client: '', hint: '', choices: [], modelAnswer: 'b', modelAnswerVi: '' },
  ],
};

describe('buildDailyPlan', () => {
  const content = {
    shadowing: [sh('sh-01', 'progress'), sh('sh-02', 'bug'), sh('sh-03', 'request'), sh('sh-04', 'bug'), sh('sv-01', 'survival')],
    patterns: [pattern('pt-01'), pattern('pt-02'), pattern('pt-03'), pattern('pt-04')],
    scenarios: [scenario],
  };

  it('mixes 3 shadowing, 3 patterns, 1 survival and 1 scenario turn', () => {
    const plan = buildDailyPlan(content, {}, today);
    expect(plan.map((s) => s.kind)).toEqual([
      'shadowing', 'shadowing', 'shadowing', 'pattern', 'pattern', 'pattern', 'survival', 'scenario',
    ]);
    expect(plan.filter((s) => s.kind === 'shadowing').map((s) => s.id)).not.toContain('sv-01');
    expect(plan[6]).toEqual({ kind: 'survival', id: 'sv-01' });
    expect(plan[7]).toMatchObject({ kind: 'scenario', id: 'standup-001' });
  });

  it('prefers due items', () => {
    const plan = buildDailyPlan(content, { 'shadowing:sh-04': card('2026-10-01'), 'scenario:standup-001:1': card(today) }, today);
    expect(plan[0]).toEqual({ kind: 'shadowing', id: 'sh-04' });
    expect(plan[7]).toEqual({ kind: 'scenario', id: 'standup-001', turn: 1 });
  });

  it('adds one listening (numbers) and one interpreting step when that content exists', () => {
    const plan = buildDailyPlan(
      {
        ...content,
        numbers: [{ id: 'n-01', kind: 'money', ko: 'x', vi: 'y', choices: ['a', 'b'], answer: 0 }],
        interpret: [{ id: 'ip-01', topic: 'meeting', vi: 'v', ko: 'k' }],
      },
      { 'listen:number:n-01': card(today) },
      today,
    );
    expect(plan.slice(-2)).toEqual([
      { kind: 'listen', id: 'n-01' },
      { kind: 'interpret', id: 'ip-01' },
    ]);
  });

  it('scales every part for longer sessions', () => {
    const plan = buildDailyPlan(content, {}, today, Math.random, 2);
    expect(plan.filter((s) => s.kind === 'shadowing')).toHaveLength(4); // only 4 non-survival lines exist
    expect(plan.filter((s) => s.kind === 'pattern')).toHaveLength(4);
    expect(plan.filter((s) => s.kind === 'scenario')).toHaveLength(2);
  });

  it('skips parts with no content', () => {
    expect(buildDailyPlan({ shadowing: [], patterns: [], scenarios: [] }, {}, today)).toEqual([]);
  });
});

describe('streak', () => {
  const day = (spoken: number, reviews = 0) => ({ spoken, reviews, recordMs: 0 });
  it('counts consecutive active days ending today', () => {
    expect(streak({ '2026-10-05': day(1), '2026-10-04': day(2), '2026-10-03': day(0, 1), '2026-10-01': day(1) }, today)).toBe(3);
  });
  it('still counts from yesterday before practicing today', () => {
    expect(streak({ '2026-10-04': day(1), '2026-10-03': day(1) }, today)).toBe(2);
  });
  it('is 0 after a missed day', () => {
    expect(streak({ '2026-10-03': day(1) }, today)).toBe(0);
    expect(streak({}, today)).toBe(0);
  });
});
