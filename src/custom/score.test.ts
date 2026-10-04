import { describe, expect, it } from 'vitest';
import { PASS_SCORE } from '../speaking/compare';
import { bestScore, customSource, isWeak } from './score';

describe('bestScore', () => {
  const attempts = [
    { source: 'custom:a', score: 55 },
    { source: 'custom:a', score: 82 },
    { source: 'custom:a', score: 60 },
    { source: 'custom:b', score: 99 },
    { source: 'vocab:x', score: 100 },
    { source: 'custom:c' }, // self-rated, no score
  ];

  it('takes the highest score for that question only', () => {
    expect(bestScore(attempts, 'a')).toBe(82);
    expect(bestScore(attempts, 'b')).toBe(99);
  });

  it('is null when there is no scored attempt', () => {
    expect(bestScore(attempts, 'c')).toBeNull();
    expect(bestScore(attempts, 'missing')).toBeNull();
    expect(bestScore([], 'a')).toBeNull();
  });

  it('does not match ids by prefix', () => {
    expect(bestScore([{ source: 'custom:ab', score: 90 }], 'a')).toBeNull();
  });

  it('counts a score of 0 as scored', () => {
    expect(bestScore([{ source: 'custom:z', score: 0 }], 'z')).toBe(0);
  });
});

describe('isWeak', () => {
  it('treats never-scored and below-pass as not yet learned', () => {
    expect(isWeak(null)).toBe(true);
    expect(isWeak(PASS_SCORE - 1)).toBe(true);
    expect(isWeak(PASS_SCORE)).toBe(false);
    expect(isWeak(100)).toBe(false);
  });
});

describe('customSource', () => {
  it('matches the source format saved with speaking attempts', () => {
    expect(customSource('custom-abc')).toBe('custom:custom-abc');
  });
});
