import { describe, expect, it } from 'vitest';
import { hasShareableProgress, shareStats } from './share';

describe('shareStats', () => {
  it('sums lines and minutes and counts the streak', () => {
    const daily = {
      '2026-10-16': { spoken: 4, reviews: 2, recordMs: 60000 },
      '2026-10-17': { spoken: 6, reviews: 0, recordMs: 90000 },
      '2026-10-18': { spoken: 0, reviews: 3, recordMs: 0 },
    };
    expect(shareStats(daily, 210, 12, '2026-10-18')).toEqual({ streak: 3, lines: 10, minutes: 3, percent: 12, typingBest: 210 });
  });

  it('is not worth sharing before any practice', () => {
    const s = shareStats({}, 0, 0, '2026-10-18');
    expect(hasShareableProgress(s)).toBe(false);
    expect(hasShareableProgress({ ...s, lines: 1 })).toBe(true);
  });
});
