// Search, filter and sort for the scenario list. Pure functions (unit-tested).

import type { Scenario } from '../types';

/** The parts of a saved scenario result that sorting/filtering needs. */
interface ResultLike {
  bestScore: number;
  totalTurns: number;
  lastPlayed: string;
}

export const SCENARIO_CATEGORIES = [
  'tech',
  'incident',
  'release',
  'security',
  'qa',
  'pm',
  'communication',
  'meeting',
  'daily-life',
  'interview',
] as const;
export type ScenarioCategory = (typeof SCENARIO_CATEGORIES)[number];

export type StatusFilter = 'all' | 'new' | 'done' | 'improve';
export type SortKey = 'default' | 'title' | 'new-first' | 'low-score' | 'recent';

export interface ScenarioQuery {
  q: string;
  category: string; // '' = all
  status: StatusFilter;
  sort: SortKey;
}

/** Lowercase, strip Vietnamese diacritics (đ → d) so "bao cao" matches "Báo cáo". */
export function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .normalize('NFC');
}

function haystack(s: Scenario, categoryLabel: string): string {
  return fold(
    [
      s.title,
      s.titleKo,
      s.description,
      categoryLabel,
      ...s.tags,
      ...s.turns.flatMap((t) => [t.client, t.modelAnswer]),
    ].join(' \n '),
  );
}

export function filterAndSortScenarios(
  items: Scenario[],
  results: Record<string, ResultLike | undefined>,
  query: ScenarioQuery,
  categoryLabel: (c: string) => string,
): Scenario[] {
  const terms = fold(query.q).split(/\s+/).filter(Boolean);
  const filtered = items.filter((s) => {
    if (query.category && s.category !== query.category) return false;
    const r = results[s.id];
    if (query.status === 'new' && r) return false;
    if (query.status === 'done' && !r) return false;
    if (query.status === 'improve' && (!r || r.bestScore >= r.totalTurns)) return false;
    if (terms.length === 0) return true;
    const text = haystack(s, categoryLabel(s.category));
    return terms.every((t) => text.includes(t));
  });

  const order = new Map(items.map((s, i) => [s.id, i]));
  const byDefault = (a: Scenario, b: Scenario) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0);
  const ratio = (s: Scenario) => {
    const r = results[s.id];
    return r ? r.bestScore / r.totalTurns : -1; // not practiced first
  };

  const sorted = [...filtered];
  switch (query.sort) {
    case 'title':
      sorted.sort((a, b) => a.title.localeCompare(b.title, 'vi'));
      break;
    case 'new-first':
      sorted.sort((a, b) => Number(Boolean(results[a.id])) - Number(Boolean(results[b.id])) || byDefault(a, b));
      break;
    case 'low-score':
      sorted.sort((a, b) => ratio(a) - ratio(b) || byDefault(a, b));
      break;
    case 'recent':
      sorted.sort(
        (a, b) =>
          (results[b.id]?.lastPlayed ?? '').localeCompare(results[a.id]?.lastPlayed ?? '') || byDefault(a, b),
      );
      break;
    default:
      sorted.sort(byDefault);
  }
  return sorted;
}
