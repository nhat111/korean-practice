import { describe, expect, it } from 'vitest';
import { markPhrases, phraseUsed } from './messages';

describe('phraseUsed', () => {
  it('ignores spacing and punctuation', () => {
    expect(phraseUsed('확인 부탁 드립니다!', '확인 부탁드립니다')).toBe(true);
    expect(phraseUsed('확인해 주세요', '확인 부탁드립니다')).toBe(false);
    expect(phraseUsed('anything', '')).toBe(false);
  });
});

describe('markPhrases', () => {
  const phrases = [
    { ko: '확인 부탁드립니다', vi: 'a' },
    { ko: '공유드립니다', vi: 'b' },
  ];

  it('marks each phrase in order of appearance and keeps the text intact', () => {
    const model = '진행 상황 공유드립니다. 확인 부탁드립니다.';
    const parts = markPhrases(model, phrases);
    expect(parts.map((p) => p.text).join('')).toBe(model);
    expect(parts.filter((p) => p.phrase !== null).map((p) => p.phrase)).toEqual([1, 0]);
  });

  it('skips phrases that overlap or are missing', () => {
    const parts = markPhrases('공유드립니다', [{ ko: '공유', vi: '' }, { ko: '유드', vi: '' }, { ko: '없음', vi: '' }]);
    expect(parts).toEqual([
      { text: '공유', phrase: 0 },
      { text: '드립니다', phrase: null },
    ]);
  });
});
