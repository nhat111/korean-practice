// Practice results for custom questions are speaking attempts with source
// "custom:<id>". These helpers read them back; nothing is stored separately.

import { PASS_SCORE } from '../speaking/compare';

export const customSource = (id: string) => `custom:${id}`;

/** Best similarity score over scored attempts (voice or typed); null if never scored. */
export function bestScore(attempts: readonly { source: string; score?: number }[], id: string): number | null {
  const source = customSource(id);
  let best: number | null = null;
  for (const a of attempts) {
    if (a.source !== source || a.score === undefined) continue;
    if (best === null || a.score > best) best = a.score;
  }
  return best;
}

/** "Chưa thuộc": never scored, or the best score is below the pass mark. */
export function isWeak(best: number | null): boolean {
  return best === null || best < PASS_SCORE;
}
