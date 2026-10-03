// SM-2 spaced repetition (SuperMemo 2).
// https://super-memory.com/english/ol/sm2.htm

export interface CardState {
  /** Easiness factor, >= 1.3. */
  ef: number;
  /** Current interval in days. */
  interval: number;
  /** Consecutive successful reviews. */
  reps: number;
  /** Next review date, local YYYY-MM-DD. */
  due: string;
  /** Last review date, local YYYY-MM-DD. */
  lastReviewed: string;
}

/** Answer quality 0-5. The UI uses 1 (forgot), 3 (hard), 4 (good), 5 (easy). */
export type Grade = 0 | 1 | 2 | 3 | 4 | 5;

export const MIN_EF = 1.3;
export const INITIAL_EF = 2.5;

/** Local date as YYYY-MM-DD. */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return toDateKey(new Date(y, m - 1, d + days));
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function review(card: CardState | undefined, grade: Grade, today: string): CardState {
  const prev = card ?? { ef: INITIAL_EF, interval: 0, reps: 0, due: today, lastReviewed: today };

  let reps: number;
  let interval: number;
  if (grade < 3) {
    reps = 0;
    interval = 1;
  } else {
    reps = prev.reps + 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 6;
    else interval = Math.round(prev.interval * prev.ef);
  }

  const ef = Math.max(MIN_EF, prev.ef + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));

  return { ef, interval, reps, due: addDays(today, interval), lastReviewed: today };
}

export function isDue(card: CardState | undefined, today: string): boolean {
  return card !== undefined && card.due <= today;
}

/** A card counts as mastered once its interval reaches three weeks. */
export function isMastered(card: CardState | undefined): boolean {
  return card !== undefined && card.interval >= 21;
}
