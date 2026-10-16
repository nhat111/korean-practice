import { describe, expect, it } from 'vitest';
import { parseVersion } from './version';

describe('parseVersion', () => {
  it('reads the build from dist/version.json', () => {
    expect(parseVersion({ version: '3c9bc85 · 2026-10-16 07:00 UTC' })).toBe('3c9bc85 · 2026-10-16 07:00 UTC');
  });
  it('rejects anything else', () => {
    for (const body of [null, 'x', {}, { version: '' }, { version: 3 }, []]) expect(parseVersion(body)).toBeNull();
  });
});
