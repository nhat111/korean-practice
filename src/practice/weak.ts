// "Câu cần luyện lại": SRS items the learner keeps getting wrong, and the
// last-7-days activity for the progress chart. Pure, unit-tested.

import { addDays, type CardState } from '../srs/sm2';

/** Below this easiness the item has been hard several times. */
const HARD_EF = 2.0;

export const WEAK_LIMIT = 20;

/** An item is weak if its last rating failed (reps reset to 0) or it has been hard repeatedly. */
export function isWeak(card: CardState): boolean {
  return card.reps === 0 || card.ef < HARD_EF;
}

/** Weak SRS keys: last failed first, then hardest (lowest EF), then most recent. */
export function weakKeys(srs: Record<string, CardState>, limit = WEAK_LIMIT): string[] {
  return Object.entries(srs)
    .filter(([, c]) => isWeak(c))
    .sort(
      ([, a], [, b]) =>
        Number(a.reps !== 0) - Number(b.reps !== 0) ||
        a.ef - b.ef ||
        b.lastReviewed.localeCompare(a.lastReviewed),
    )
    .slice(0, limit)
    .map(([k]) => k);
}

export interface DayPoint {
  /** Local date YYYY-MM-DD. */
  date: string;
  minutes: number;
  spoken: number;
}

/** The last `n` days ending today, oldest first; days without activity are 0. */
export function lastDays(
  daily: Record<string, { spoken?: number; recordMs?: number }>,
  today: string,
  n = 7,
): DayPoint[] {
  return Array.from({ length: n }, (_, i) => {
    const date = addDays(today, i - n + 1);
    const d = daily[date];
    return { date, minutes: Math.round(((d?.recordMs || 0) / 60000) * 10) / 10, spoken: d?.spoken || 0 };
  });
}
