// Home "Hôm nay" and the progress overview: today's goal, this week's practice
// days, the word of the day and per-skill coverage. Pure, unit-tested.

import { DAILY_COUNTS, MEETING_MIN_SCALE } from './plan';

/** Practice turns in one daily session at this scale (1 = 5 minutes). */
export function dailyTarget(scale: number): number {
  const base = Object.values(DAILY_COUNTS).reduce((n, c) => n + c, 0) * scale;
  return base + (scale >= MEETING_MIN_SCALE ? 1 : 0);
}

export interface WeekDay {
  /** Local date YYYY-MM-DD. */
  date: string;
  active: boolean;
  isToday: boolean;
  future: boolean;
}

function parseDate(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Monday to Sunday of the week containing `today`; a day is active if anything was practiced. */
export function weekDays(
  daily: Record<string, { spoken?: number; reviews?: number }>,
  today: string,
): WeekDay[] {
  const t = parseDate(today);
  const monday = new Date(t);
  monday.setDate(t.getDate() - ((t.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const date = formatDate(d);
    const s = daily[date];
    return {
      date,
      active: s !== undefined && (s.spoken || 0) + (s.reviews || 0) > 0,
      isToday: date === today,
      future: date > today,
    };
  });
}

/** The same item all day, a different one the next day. */
export function itemOfDay<T>(items: readonly T[], today: string): T | undefined {
  if (items.length === 0) return undefined;
  let h = 0;
  for (const ch of today) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return items[h % items.length];
}

export type SkillKey = 'shadowing' | 'patterns' | 'scenarios' | 'listening' | 'interpret' | 'messages' | 'vocab';

export interface SkillProgress {
  key: SkillKey;
  done: number;
  total: number;
}

/** Content ids per skill (listening = numbers and meetings). */
export interface SkillContent {
  shadowing: string[];
  patterns: string[];
  scenarios: string[];
  numbers: string[];
  meetings: string[];
  interpret: string[];
  messages: string[];
  vocab: string[];
}

/** How many items of each skill were practiced at least once. */
export function skillProgress(
  c: SkillContent,
  state: { srs: Record<string, unknown>; cards: Record<string, unknown>; scenarios: Record<string, unknown> },
): SkillProgress[] {
  const has = (key: string) => key in state.srs;
  const keys = Object.keys(state.srs);
  const count = (ids: string[], done: (id: string) => boolean) => ids.filter(done).length;
  return [
    { key: 'shadowing', done: count(c.shadowing, (id) => has(`shadowing:${id}`)), total: c.shadowing.length },
    { key: 'patterns', done: count(c.patterns, (id) => has(`pattern:${id}`)), total: c.patterns.length },
    {
      key: 'scenarios',
      done: count(c.scenarios, (id) => id in state.scenarios || keys.some((k) => k.startsWith(`scenario:${id}:`))),
      total: c.scenarios.length,
    },
    {
      key: 'listening',
      done:
        count(c.numbers, (id) => has(`listen:number:${id}`)) + count(c.meetings, (id) => has(`listen:meeting:${id}`)),
      total: c.numbers.length + c.meetings.length,
    },
    {
      key: 'interpret',
      done: count(c.interpret, (id) => has(`interpret:${id}`) || has(`interpret-ko:${id}`)),
      total: c.interpret.length,
    },
    { key: 'messages', done: count(c.messages, (id) => has(`message:${id}`)), total: c.messages.length },
    { key: 'vocab', done: count(c.vocab, (id) => id in state.cards), total: c.vocab.length },
  ];
}

/** Overall share of items practiced, 0-100. */
export function overallPercent(skills: SkillProgress[]): number {
  const total = skills.reduce((n, s) => n + s.total, 0);
  return total === 0 ? 0 : Math.round((100 * skills.reduce((n, s) => n + s.done, 0)) / total);
}

export type RecipeKind = keyof typeof DAILY_COUNTS | 'meeting';

/** What one daily session contains at this scale, for the home "today" card (sums to dailyTarget). */
export function planRecipe(scale: number): { kind: RecipeKind; count: number }[] {
  const steps = (Object.keys(DAILY_COUNTS) as (keyof typeof DAILY_COUNTS)[]).map((kind) => ({
    kind: kind as RecipeKind,
    count: DAILY_COUNTS[kind] * scale,
  }));
  return scale >= MEETING_MIN_SCALE ? [...steps, { kind: 'meeting', count: 1 }] : steps;
}
