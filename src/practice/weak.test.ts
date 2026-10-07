import { describe, expect, it } from 'vitest';
import type { CardState } from '../srs/sm2';
import { lastDays, weakKeys } from './weak';

const card = (reps: number, ef: number, lastReviewed = '2026-10-05'): CardState => ({
  ef,
  interval: 1,
  reps,
  due: '2026-10-06',
  lastReviewed,
});

describe('weakKeys', () => {
  it('keeps failed and repeatedly hard items, failed first', () => {
    const srs = {
      good: card(3, 2.6),
      hard: card(2, 1.7),
      failed: card(0, 2.3),
      failedHarder: card(0, 1.5),
    };
    expect(weakKeys(srs)).toEqual(['failedHarder', 'failed', 'hard']);
  });
  it('respects the limit', () => {
    const srs = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`k${i}`, card(0, 2.5)]));
    expect(weakKeys(srs, 5)).toHaveLength(5);
  });
});

describe('lastDays', () => {
  it('returns 7 days ending today with minutes and lines', () => {
    const days = lastDays({ '2026-10-07': { spoken: 4, recordMs: 90000 }, '2026-10-03': { spoken: 1 } }, '2026-10-07');
    expect(days.map((d) => d.date)).toEqual([
      '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07',
    ]);
    expect(days[6]).toEqual({ date: '2026-10-07', minutes: 1.5, spoken: 4 });
    expect(days[2]).toEqual({ date: '2026-10-03', minutes: 0, spoken: 1 });
  });
});
