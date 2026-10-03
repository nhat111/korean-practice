import { describe, expect, it } from 'vitest';
import { addDays, INITIAL_EF, isDue, MIN_EF, review } from './sm2';

const today = '2026-01-30';

describe('addDays', () => {
  it('crosses month boundaries', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('review', () => {
  it('follows the 1 → 6 → interval × EF schedule', () => {
    const first = review(undefined, 4, today);
    expect(first).toMatchObject({ reps: 1, interval: 1, due: '2026-01-31' });
    expect(first.ef).toBeCloseTo(INITIAL_EF);

    const second = review(first, 4, first.due);
    expect(second).toMatchObject({ reps: 2, interval: 6 });

    const third = review(second, 4, second.due);
    expect(third.interval).toBe(Math.round(6 * second.ef));
  });

  it('resets repetitions on a failed grade', () => {
    let card = review(undefined, 5, today);
    card = review(card, 5, card.due);
    const failed = review(card, 1, card.due);
    expect(failed.reps).toBe(0);
    expect(failed.interval).toBe(1);
    expect(failed.ef).toBeLessThan(card.ef);
  });

  it('never lets EF fall below the minimum', () => {
    let card = review(undefined, 0, today);
    for (let i = 0; i < 20; i++) card = review(card, 0, card.due);
    expect(card.ef).toBe(MIN_EF);
  });

  it('increases EF on easy answers', () => {
    expect(review(undefined, 5, today).ef).toBeGreaterThan(INITIAL_EF);
  });
});

describe('isDue', () => {
  it('treats cards due today or earlier as due', () => {
    const card = review(undefined, 4, today);
    expect(isDue(card, today)).toBe(false);
    expect(isDue(card, card.due)).toBe(true);
    expect(isDue(undefined, today)).toBe(false);
  });
});
