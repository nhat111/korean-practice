import { describe, expect, it } from 'vitest';
import { dailyTarget, greetingSlot, itemOfDay, overallPercent, planRecipe, skillProgress, weekDays } from './today';

describe('dailyTarget', () => {
  it('counts the 5-minute steps and adds a meeting from 10 minutes', () => {
    expect(dailyTarget(1)).toBe(11);
    expect(dailyTarget(2)).toBe(23);
    expect(dailyTarget(3)).toBe(34);
  });
});

describe('planRecipe', () => {
  it('lists the session steps and adds up to dailyTarget', () => {
    for (const scale of [1, 2, 3]) {
      expect(planRecipe(scale).reduce((n, r) => n + r.count, 0)).toBe(dailyTarget(scale));
    }
    expect(planRecipe(1).some((r) => r.kind === 'meeting')).toBe(false);
    expect(planRecipe(2).at(-1)).toEqual({ kind: 'meeting', count: 1 });
  });
});

describe('weekDays', () => {
  it('runs Monday to Sunday around today and marks active, today and future days', () => {
    // 2026-10-14 is a Wednesday.
    const days = weekDays({ '2026-10-12': { spoken: 2 }, '2026-10-13': { reviews: 0 }, '2026-10-14': { reviews: 1 } }, '2026-10-14');
    expect(days.map((d) => d.date)).toEqual([
      '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18',
    ]);
    expect(days.map((d) => d.active)).toEqual([true, false, true, false, false, false, false]);
    expect(days.findIndex((d) => d.isToday)).toBe(2);
    expect(days.filter((d) => d.future)).toHaveLength(4);
  });

  it('treats Sunday as the last day of its week', () => {
    expect(weekDays({}, '2026-10-18')[0].date).toBe('2026-10-12');
  });
});

describe('itemOfDay', () => {
  it('is stable within a day and empty-safe', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    expect(itemOfDay(items, '2026-10-12')).toBe(itemOfDay(items, '2026-10-12'));
    const week = ['12', '13', '14', '15', '16', '17', '18'].map((d) => itemOfDay(items, `2026-10-${d}`));
    expect(new Set(week).size).toBeGreaterThan(1);
    expect(itemOfDay([], '2026-10-12')).toBeUndefined();
  });
});

describe('skillProgress', () => {
  it('counts items practiced once per skill, ignoring keys of removed content', () => {
    const skills = skillProgress(
      {
        shadowing: ['sh-1', 'sh-2'],
        patterns: ['pt-1'],
        scenarios: ['s1', 's2', 's3'],
        numbers: ['n1'],
        meetings: ['m1'],
        interpret: ['ip-1', 'ip-2'],
        messages: ['msg-1'],
        vocab: ['v1', 'v2'],
      },
      {
        srs: {
          'shadowing:sh-1': {},
          'shadowing:gone': {},
          'scenario:s2:0': {},
          'listen:meeting:m1': {},
          'interpret-ko:ip-2': {},
        },
        cards: { v1: {} },
        scenarios: { s1: {} },
      },
    );
    expect(Object.fromEntries(skills.map((s) => [s.key, `${s.done}/${s.total}`]))).toEqual({
      shadowing: '1/2',
      patterns: '0/1',
      scenarios: '2/3',
      listening: '1/2',
      interpret: '1/2',
      messages: '0/1',
      vocab: '1/2',
    });
    expect(overallPercent(skills)).toBe(Math.round((100 * 6) / 13));
    expect(overallPercent([])).toBe(0);
  });
});

describe('greetingSlot', () => {
  it('maps the hour to a workplace greeting', () => {
    expect([4, 5, 10, 11, 13, 14, 17, 18, 23].map(greetingSlot)).toEqual([
      'evening', 'morning', 'morning', 'lunch', 'lunch', 'afternoon', 'afternoon', 'evening', 'evening',
    ]);
  });
});
