// Validates every content file in public/data/ against the runtime checks
// (which mirror src/types.ts). Run with `npm test` after editing content.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SCENARIO_CATEGORIES } from './scenarioFilter';
import {
  parseEmails,
  parseInterpret,
  parseNumbers,
  parsePatterns,
  parseScenarios,
  parseShadowing,
  parseSongs,
  parseVocab,
  type ParseResult,
} from './validate';
import { allFills } from '../patterns/fill';
import { INTERPRET_TOPICS, SHADOWING_TOPICS } from '../practice/decks';

function load(name: string): unknown {
  return JSON.parse(readFileSync(resolve(process.cwd(), 'public/data', name), 'utf8'));
}

const files: [string, (data: unknown) => ParseResult<{ id: string }>][] = [
  ['scenarios.json', parseScenarios],
  ['emails.json', parseEmails],
  ['vocab.json', parseVocab],
  ['songs.json', parseSongs],
  ['shadowing.json', parseShadowing],
  ['patterns.json', parsePatterns],
  ['numbers.json', parseNumbers],
  ['interpret.json', parseInterpret],
];

describe.each(files)('%s', (name, parse) => {
  it('has only valid items with unique ids', () => {
    const data = load(name);
    const { items, errors } = parse(data);
    expect(errors).toEqual([]);
    expect(items.length).toBeGreaterThan(0);
  });
});

describe('vocab.json', () => {
  it('has no duplicate Korean words', () => {
    const { items } = parseVocab(load('vocab.json'));
    const seen = new Set<string>();
    const dupes = items.filter((v) => (seen.has(v.ko) ? true : (seen.add(v.ko), false)));
    expect(dupes.map((v) => v.ko)).toEqual([]);
  });
});

describe('scenarios.json categories', () => {
  it('uses only the known categories (labels live in vi.scenarios.categories)', () => {
    const { items } = parseScenarios(load('scenarios.json'));
    const unknown = items.filter((s) => !(SCENARIO_CATEGORIES as readonly string[]).includes(s.category));
    expect(unknown.map((s) => `${s.id}: ${s.category}`)).toEqual([]);
  });
});

describe('vocab.json grammar notation', () => {
  it('uses Korean notation only in patterns (N/A/V placeholders allowed; notes go in meaningVi)', () => {
    const { items } = parseVocab(load('vocab.json'));
    const bad = items.flatMap((v) =>
      (v.example.grammar ?? [])
        .map((g) => g.pattern)
        .filter((p) => /[A-Za-zÀ-ỹ]{2,}/.test(p.replace(/\b[NAV]\b/g, ''))),
    );
    expect(bad).toEqual([]);
  });
});

describe('shadowing.json', () => {
  it('uses only the known topics (labels live in vi.shadowing.topics)', () => {
    const { items } = parseShadowing(load('shadowing.json'));
    const unknown = items.filter((s) => !(SHADOWING_TOPICS as readonly string[]).includes(s.topic));
    expect(unknown.map((s) => `${s.id}: ${s.topic}`)).toEqual([]);
  });
  it('has no duplicate sentences', () => {
    const { items } = parseShadowing(load('shadowing.json'));
    expect(new Set(items.map((s) => s.ko)).size).toBe(items.length);
  });
  it('has a survival deck for the home page', () => {
    const { items } = parseShadowing(load('shadowing.json'));
    expect(items.some((s) => s.topic === 'survival')).toBe(true);
  });
});

describe('patterns.json', () => {
  it('fills every combination without leftover braces', () => {
    const { items } = parsePatterns(load('patterns.json'));
    const bad = items.flatMap((p) => allFills(p)).filter((f) => /[{}]/.test(f.ko + f.vi));
    expect(bad.map((f) => f.ko)).toEqual([]);
  });
});

describe('interpret.json', () => {
  it('uses only the known topics (labels live in vi.interpret.topics)', () => {
    const { items } = parseInterpret(load('interpret.json'));
    const unknown = items.filter((s) => !(INTERPRET_TOPICS as readonly string[]).includes(s.topic));
    expect(unknown.map((s) => `${s.id}: ${s.topic}`)).toEqual([]);
  });
});
