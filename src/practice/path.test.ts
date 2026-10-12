import { describe, expect, it } from 'vitest';
import { SCENARIO_CATEGORIES } from '../data/scenarioFilter';
import { vi } from '../i18n/vi';
import { INTERPRET_TOPICS, MESSAGE_TOPICS, SHADOWING_TOPICS } from './decks';
import {
  BASE_PATH,
  buildPath,
  currentWeek,
  PATH_WEEKS,
  ROLE_FIRST,
  stepLink,
  stepProgress,
  type PathContent,
  type StepKind,
} from './path';

const TOPICS: Record<StepKind, readonly string[]> = {
  shadowing: SHADOWING_TOPICS,
  scenarios: SCENARIO_CATEGORIES,
  interpret: INTERPRET_TOPICS,
  messages: MESSAGE_TOPICS,
  numbers: [],
  meetings: [],
};

describe('BASE_PATH', () => {
  const steps = BASE_PATH.flat();

  it('has four weeks of unique, labelled steps', () => {
    expect(BASE_PATH).toHaveLength(PATH_WEEKS);
    expect(new Set(steps.map((s) => s.id)).size).toBe(steps.length);
    for (const s of steps) expect(vi.path.steps[s.id], s.id).toBeTruthy();
  });

  it('only uses known topics and categories', () => {
    for (const s of steps) {
      for (const t of s.topics) expect(TOPICS[s.kind], `${s.id}: ${t}`).toContain(t);
      expect(s.topics.length > 0).toBe(TOPICS[s.kind].length > 0);
    }
  });

  it('role shortcuts point at real steps', () => {
    for (const ids of Object.values(ROLE_FIRST)) {
      for (const id of ids) expect(steps.some((s) => s.id === id)).toBe(true);
    }
  });
});

describe('buildPath', () => {
  it('moves the role steps to the end of week 1 without duplicating them', () => {
    const path = buildPath('tester');
    expect(path[0].slice(-2).map((s) => s.id)).toEqual(['qa', 'qa-talk']);
    expect(path[2].some((s) => s.id === 'qa')).toBe(false);
    expect(path.flat()).toHaveLength(BASE_PATH.flat().length);
  });

  it('keeps the base path for unknown or missing roles', () => {
    expect(buildPath()).toEqual(BASE_PATH);
    expect(buildPath('other')).toEqual(BASE_PATH);
  });
});

describe('currentWeek', () => {
  it('counts 7-day weeks from the start and clamps to the path', () => {
    expect(currentWeek('2026-10-12', '2026-10-12')).toBe(0);
    expect(currentWeek('2026-10-12', '2026-10-18')).toBe(0);
    expect(currentWeek('2026-10-12', '2026-10-19')).toBe(1);
    expect(currentWeek('2026-10-12', '2026-11-30')).toBe(3);
    expect(currentWeek('2026-10-12', '2026-10-01')).toBe(0);
    // Across a month and a DST change.
    expect(currentWeek('2026-03-25', '2026-04-08')).toBe(2);
  });
});

describe('stepProgress', () => {
  const content: PathContent = {
    shadowing: [
      { id: 'sv-1', topic: 'survival' },
      { id: 'sv-2', topic: 'survival' },
      { id: 'cs-1', topic: 'cushion' },
      { id: 'sh-1', topic: 'progress' },
    ],
    scenarios: [
      { id: 'a', category: 'daily-life' },
      { id: 'b', category: 'communication' },
    ],
    interpret: [],
    messages: [],
    numbers: Array.from({ length: 12 }, (_, i) => ({ id: `n${i}` })),
    meetings: [],
  };
  const survival = BASE_PATH[0][0];

  it('counts practiced items of the step topics and points at the next open topic', () => {
    const p = stepProgress(survival, content, { srs: { 'shadowing:sv-1': {}, 'shadowing:sv-2': {}, 'shadowing:sh-1': {} }, scenarios: {} });
    expect(p).toEqual({ done: 2, target: 3, complete: false, nextTopic: 'cushion' });
    expect(stepLink(survival, p.nextTopic)).toBe('/shadowing?topic=cushion');
  });

  it('counts scenarios by result or any rated turn', () => {
    const p = stepProgress(BASE_PATH[0][1], content, { srs: { 'scenario:b:0': {} }, scenarios: { a: {} } });
    expect(p).toMatchObject({ done: 2, target: 2, complete: true });
  });

  it('caps at the target and never completes an empty step', () => {
    const srs = Object.fromEntries(content.numbers.map((n) => [`listen:number:${n.id}`, {}]));
    expect(stepProgress(BASE_PATH[0][2], content, { srs, scenarios: {} })).toMatchObject({ done: 8, target: 8, complete: true });
    const meetings = BASE_PATH[3].find((s) => s.kind === 'meetings');
    expect(meetings && stepProgress(meetings, content, { srs: {}, scenarios: {} }).complete).toBe(false);
  });
});
