// "Luyện 5 phút hôm nay": picks a short mixed session from the SRS state, and
// computes the streak shown on the home page. Pure, unit-tested.

import { addDays, type CardState } from '../srs/sm2';
import type { InterpretItem, NumberItem, PatternItem, Scenario, ShadowingItem } from '../types';
import { DAILY_SHADOWING_TOPICS, srsKey } from './decks';

export type DailyStep =
  | { kind: 'shadowing'; id: string }
  | { kind: 'pattern'; id: string }
  | { kind: 'survival'; id: string }
  | { kind: 'scenario'; id: string; turn: number }
  | { kind: 'listen'; id: string }
  | { kind: 'interpret'; id: string };

export const DAILY_COUNTS = { shadowing: 3, pattern: 3, survival: 1, scenario: 1, listen: 1, interpret: 1 } as const;

function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Up to `n` keys: due ones first (most overdue first), then never-practiced
 * ones (random order), then the ones due soonest.
 */
export function pickKeys(
  keys: string[],
  srs: Record<string, CardState>,
  today: string,
  n: number,
  rand: () => number = Math.random,
): string[] {
  const byDue = (a: string, b: string) => srs[a].due.localeCompare(srs[b].due);
  const due = keys.filter((k) => srs[k] && srs[k].due <= today).sort(byDue);
  const fresh = shuffle(
    keys.filter((k) => !srs[k]),
    rand,
  );
  const later = keys.filter((k) => srs[k] && srs[k].due > today).sort(byDue);
  return [...due, ...fresh, ...later].slice(0, n);
}

export interface DailyContent {
  shadowing: ShadowingItem[];
  patterns: PatternItem[];
  scenarios: Scenario[];
  /** Listening "Số, ngày giờ" items (optional so older callers/tests still work). */
  numbers?: NumberItem[];
  interpret?: InterpretItem[];
}

export function buildDailyPlan(
  content: DailyContent,
  srs: Record<string, CardState>,
  today: string,
  rand: () => number = Math.random,
  /** 1 = the 5-minute session; 2 and 3 for 10 and 15 minutes. */
  scale = 1,
): DailyStep[] {
  const n = (count: number) => count * scale;
  const idOf = (key: string) => key.slice(key.indexOf(':') + 1);

  const shadowKeys = content.shadowing
    .filter((s) => DAILY_SHADOWING_TOPICS.includes(s.topic))
    .map((s) => srsKey.shadowing(s.id));
  const survivalKeys = content.shadowing.filter((s) => s.topic === 'survival').map((s) => srsKey.shadowing(s.id));
  const patternKeys = content.patterns.map((p) => srsKey.pattern(p.id));
  const turnKeys = content.scenarios.flatMap((s) => s.turns.map((_, i) => srsKey.scenario(s.id, i)));

  const steps: DailyStep[] = [
    ...pickKeys(shadowKeys, srs, today, n(DAILY_COUNTS.shadowing), rand).map(
      (k): DailyStep => ({ kind: 'shadowing', id: idOf(k) }),
    ),
    ...pickKeys(patternKeys, srs, today, n(DAILY_COUNTS.pattern), rand).map(
      (k): DailyStep => ({ kind: 'pattern', id: idOf(k) }),
    ),
    ...pickKeys(survivalKeys, srs, today, n(DAILY_COUNTS.survival), rand).map(
      (k): DailyStep => ({ kind: 'survival', id: idOf(k) }),
    ),
  ];
  for (const k of pickKeys(turnKeys, srs, today, n(DAILY_COUNTS.scenario), rand)) {
    // "scenario:<id>:<turn>"; ids never contain ':'.
    const [, id, turn] = k.split(':');
    steps.push({ kind: 'scenario', id, turn: Number(turn) });
  }
  const listenKeys = (content.numbers ?? []).map((n) => `listen:number:${n.id}`);
  for (const k of pickKeys(listenKeys, srs, today, n(DAILY_COUNTS.listen), rand)) {
    steps.push({ kind: 'listen', id: k.slice('listen:number:'.length) });
  }
  const interpretKeys = (content.interpret ?? []).map((i) => srsKey.interpret(i.id));
  for (const k of pickKeys(interpretKeys, srs, today, n(DAILY_COUNTS.interpret), rand)) {
    steps.push({ kind: 'interpret', id: idOf(k) });
  }
  return steps;
}

/** Same shape as DayStats in storage/progress.ts (not imported: tests have no DOM types). */
interface DayActivity {
  spoken: number;
  reviews: number;
}

/** Days with any practice, counted back from today (or from yesterday if today has none yet). */
export function streak(daily: Record<string, DayActivity>, today: string): number {
  const active = (day: string) => {
    const d = daily[day];
    // Entries come from storage: tolerate missing fields.
    return d !== undefined && (d.spoken || 0) + (d.reviews || 0) > 0;
  };
  let day = active(today) ? today : addDays(today, -1);
  let n = 0;
  while (active(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}
