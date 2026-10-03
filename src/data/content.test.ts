// Validates every content file in public/data/ against the runtime checks
// (which mirror src/types.ts). Run with `npm test` after editing content.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseEmails, parseScenarios, parseVocab, type ParseResult } from './validate';

function load(name: string): unknown {
  return JSON.parse(readFileSync(resolve(process.cwd(), 'public/data', name), 'utf8'));
}

const files: [string, (data: unknown) => ParseResult<{ id: string }>][] = [
  ['scenarios.json', parseScenarios],
  ['emails.json', parseEmails],
  ['vocab.json', parseVocab],
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
