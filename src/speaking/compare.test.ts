import { describe, expect, it } from 'vitest';
import { compareAnswer, normalize, similarity } from './compare';

describe('normalize', () => {
  it('strips punctuation and collapses spaces', () => {
    expect(normalize('네,  확인했습니다!  ')).toBe('네 확인했습니다');
    expect(normalize('API 키')).toBe('api 키');
  });
});

describe('similarity', () => {
  it('ignores spacing and punctuation', () => {
    expect(similarity('확인 부탁드립니다.', '확인부탁드립니다')).toBe(1);
  });
  it('is 0 for unrelated text', () => {
    expect(similarity('배포', '회의')).toBe(0);
  });
});

describe('compareAnswer', () => {
  it('scores an exact answer 100 with all words matched', () => {
    const r = compareAnswer('오늘 배포할 예정입니다.', '오늘 배포할 예정입니다');
    expect(r.score).toBe(100);
    expect(r.model.every((t) => t.status === 'match')).toBe(true);
  });

  it('marks missing, partial and extra words', () => {
    const r = compareAnswer('백엔드 API는 완료했습니다', '백엔드 API가 음 완료했습니다');
    expect(r.model.map((t) => t.status)).toEqual(['match', 'partial', 'match']);
    expect(r.spoken.map((t) => t.status)).toEqual(['match', 'partial', 'extra', 'match']);

    const missing = compareAnswer('금요일까지 테스트 서버에 배포하겠습니다', '배포하겠습니다');
    expect(missing.model.map((t) => t.status)).toEqual(['missing', 'missing', 'missing', 'match']);
    expect(missing.score).toBeLessThan(70);
  });

  it('keeps the original case for display but matches case-insensitively', () => {
    const r = compareAnswer('API 키가 필요합니다', 'api 키가 필요합니다');
    expect(r.model[0]).toEqual({ text: 'API', status: 'match' });
    expect(r.spoken[0]).toEqual({ text: 'api', status: 'match' });
  });

  it('handles an empty transcript', () => {
    const r = compareAnswer('감사합니다', '');
    expect(r.score).toBe(0);
    expect(r.spoken).toEqual([]);
    expect(r.model[0].status).toBe('missing');
  });
});
