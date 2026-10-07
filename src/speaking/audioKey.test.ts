import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { allFills } from '../patterns/fill';
import { audioKey, audioUrl, spokenTexts } from './audioKey';

const load = (name: string) => JSON.parse(readFileSync(`public/data/${name}.json`, 'utf8')).items;

describe('audioKey', () => {
  it('is stable (renaming would orphan every generated MP3)', () => {
    expect(audioKey('안녕하세요. 오늘 배포 일정 공유드리겠습니다.')).toBe('1a3c85df63d262');
    expect(audioKey('  배포  ')).toBe(audioKey('배포'));
    expect(audioUrl('male', '배포')).toBe(`/audio/male/${audioKey('배포')}.mp3`);
  });

  it('has no collisions across all spoken content', () => {
    const texts = spokenTexts({
      scenarios: load('scenarios'),
      vocab: load('vocab'),
      emails: load('emails'),
      songs: load('songs'),
      shadowing: load('shadowing'),
      numbers: load('numbers'),
      patternSentences: load('patterns').flatMap(allFills).map((f: { ko: string }) => f.ko),
    });
    expect(texts.length).toBeGreaterThan(1000);
    expect(new Set(texts.map(audioKey)).size).toBe(texts.length);
  });
});
