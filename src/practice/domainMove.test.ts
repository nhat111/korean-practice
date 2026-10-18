import { describe, expect, it } from 'vitest';
import { movedTo } from './domainMove';

describe('movedTo', () => {
  it('points the legacy address to the new domain', () => {
    expect(movedTo('kodevtalk.vercel.app', 'https://kodevtalk.example.com')).toBe('kodevtalk.example.com');
  });

  it('stays quiet before the move, on the new domain and on previews', () => {
    expect(movedTo('kodevtalk.vercel.app', 'https://kodevtalk.vercel.app')).toBeNull();
    expect(movedTo('kodevtalk.example.com', 'https://kodevtalk.example.com')).toBeNull();
    expect(movedTo('korean-practice-git-x-nhat.vercel.app', 'https://kodevtalk.example.com')).toBeNull();
    expect(movedTo('localhost:5173', 'https://kodevtalk.example.com')).toBeNull();
  });
});
