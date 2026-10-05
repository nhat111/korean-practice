import { describe, expect, it } from 'vitest';
import { splitParts } from './segments';

describe('splitParts', () => {
  it('splits sentences', () => {
    expect(splitParts('현재 약 70% 진행되었습니다. 내일까지 공유드리겠습니다.')).toEqual([
      '현재 약 70% 진행되었습니다.',
      '내일까지 공유드리겠습니다.',
    ]);
  });
  it('splits long sentences at commas', () => {
    expect(splitParts('백엔드 API는 완료했고, 지금은 프론트엔드 연동 작업을 하고 있습니다.')).toEqual([
      '백엔드 API는 완료했고,',
      '지금은 프론트엔드 연동 작업을 하고 있습니다.',
    ]);
  });
  it('keeps short sentences with commas whole', () => {
    expect(splitParts('네, 확인했습니다.')).toEqual([]);
  });
  it('merges a tiny leading clause into the next one', () => {
    expect(splitParts('네, 알겠습니다, 오늘 중으로 로그를 확인해서 원인을 공유드리겠습니다.')).toEqual([
      '네, 알겠습니다,',
      '오늘 중으로 로그를 확인해서 원인을 공유드리겠습니다.',
    ]);
  });
  it('returns [] for a single part', () => {
    expect(splitParts('확인해 보겠습니다.')).toEqual([]);
    expect(splitParts('')).toEqual([]);
  });
});
