import { describe, expect, it } from 'vitest';
import { batchimOf, josa } from './josa';

describe('batchimOf', () => {
  it('reads the final consonant of Hangul syllables', () => {
    expect(batchimOf('기능')).toBe('other');
    expect(batchimOf('화면')).toBe('other');
    expect(batchimOf('서버')).toBe('none');
    expect(batchimOf('서울')).toBe('l');
  });
  it('handles digits, Latin letters and trailing punctuation', () => {
    expect(batchimOf('API')).toBe('none');
    expect(batchimOf('URL')).toBe('l');
    expect(batchimOf('70%')).toBe('none'); // 퍼센트
    expect(batchimOf('70')).toBe('other'); // 칠십
    expect(batchimOf('12')).toBe('none'); // 십이
    expect(batchimOf('3')).toBe('other');
    expect(batchimOf('기능.')).toBe('other');
    expect(batchimOf('')).toBe('none');
  });
});

describe('josa', () => {
  it('picks 은/는, 이/가, 을/를 by batchim', () => {
    expect(josa('결제 기능', '은/는')).toBe('은');
    expect(josa('관리자 화면', '은/는')).toBe('은');
    expect(josa('API 문서', '은/는')).toBe('는');
    expect(josa('테스트 계정', '이/가')).toBe('이');
    expect(josa('API', '이/가')).toBe('가');
    expect(josa('로그', '을/를')).toBe('를');
    expect(josa('단위 테스트', '을/를')).toBe('를');
    expect(josa('DB 설계', '을/를')).toBe('를');
    expect(josa('화면 설계서', '을/를')).toBe('를');
    expect(josa('중복 데이터', '은/는')).toBe('는');
  });
  it('uses 로 after ㄹ and vowels, 으로 after other consonants', () => {
    expect(josa('메일', '으로/로')).toBe('로');
    expect(josa('슬랙', '으로/로')).toBe('으로');
    expect(josa('채팅', '으로/로')).toBe('으로');
    expect(josa('카톡', '으로/로')).toBe('으로');
    expect(josa('서버', '으로/로')).toBe('로');
  });
  it('accepts either order of the pair', () => {
    expect(josa('기능', '는/은')).toBe('은');
    expect(josa('서버', '가/이')).toBe('가');
  });
  it('falls back to the first form for unknown pairs', () => {
    expect(josa('기능', '에/에서')).toBe('에');
  });
});
