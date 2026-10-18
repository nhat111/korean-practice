// Numbers for the shareable progress card. Pure and tested; drawing lives in ShareCard.tsx.

import { streak } from './plan';

export interface ShareStats {
  /** Days in a row with any practice. */
  streak: number;
  /** Lines spoken (speaking attempts) over all stored days. */
  lines: number;
  /** Minutes recorded over all stored days. */
  minutes: number;
  /** Share of all content practiced at least once, 0-100. */
  percent: number;
  /** Best typing speed (타/phút), 0 if never typed. */
  typingBest: number;
}

export function shareStats(
  daily: Record<string, { spoken: number; reviews: number; recordMs?: number }>,
  typingBest: number,
  percent: number,
  today: string,
): ShareStats {
  const days = Object.values(daily);
  return {
    streak: streak(daily, today),
    lines: days.reduce((n, d) => n + (d.spoken || 0), 0),
    minutes: Math.round(days.reduce((n, d) => n + (d.recordMs || 0), 0) / 60000),
    percent,
    typingBest,
  };
}

/** Card worth sharing: some practice exists. */
export function hasShareableProgress(s: ShareStats): boolean {
  return s.streak > 0 || s.lines > 0 || s.percent > 0 || s.typingBest > 0;
}
