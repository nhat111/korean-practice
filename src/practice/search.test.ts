import { describe, expect, it } from 'vitest';
import { buildPhrases, indexPhrases, normalize, searchPhrases, type SearchContent } from './search';

const content = {
  shadowing: [
    { id: 'sh-1', level: 1, topic: 'schedule', ko: '일정을 조정해도 될까요?', pron: '', vi: 'Có thể điều chỉnh lịch được không?' },
    { id: 'sh-2', level: 1, topic: 'request', ko: '확인해 보겠습니다.', pron: '', vi: 'Để tôi kiểm tra thử.' },
  ],
  interpret: [{ id: 'ip-1', topic: 'schedule', vi: 'Xin dời lịch họp sang thứ Sáu.', ko: '회의를 금요일로 옮겨도 될까요?' }],
  scenarios: [],
  messages: [{ id: 'msg-1', topic: 'deploy', to: '', situation: 'Thông báo deploy tối nay.', model: '오늘 밤 배포 예정입니다.', phrases: [] }],
  vocab: [{ id: 'w-1', ko: '일정', vi: 'lịch trình', example: { ko: '일정을 조정해도 될까요?', vi: 'trùng' }, tags: [] }],
  grammar: [],
} as unknown as SearchContent;

describe('normalize', () => {
  it('drops accents, đ and punctuation', () => {
    expect(normalize('Xin dời lịch, được không?')).toBe('xin doi lich duoc khong');
    expect(normalize('Đã xong')).toBe('da xong');
  });
});

describe('buildPhrases', () => {
  it('collects lines from every source without duplicate Korean', () => {
    const phrases = buildPhrases(content);
    expect(phrases.filter((p) => p.ko === '일정을 조정해도 될까요?')).toHaveLength(1);
    expect(phrases.map((p) => p.source)).toEqual(['shadowing', 'shadowing', 'interpret', 'message', 'vocab']);
  });
});

describe('searchPhrases', () => {
  const index = indexPhrases(buildPhrases(content));

  it('finds Vietnamese with or without accents', () => {
    expect(searchPhrases(index, 'dời lịch').map((p) => p.ko)).toEqual(['회의를 금요일로 옮겨도 될까요?']);
    expect(searchPhrases(index, 'doi lich').map((p) => p.ko)).toEqual(['회의를 금요일로 옮겨도 될까요?']);
  });

  it('matches whole words only', () => {
    // "lich" must not match inside another word, and "kiem" alone matches "kiểm tra".
    expect(searchPhrases(index, 'kiểm').map((p) => p.ko)).toEqual(['확인해 보겠습니다.']);
    expect(searchPhrases(index, 'li')).toEqual([]);
  });

  it('ranks phrases that contain every word first', () => {
    const r = searchPhrases(index, 'lịch');
    expect(r.length).toBe(3);
    expect(r[0].ko).toBe('일정');
  });

  it('searches Korean ignoring spaces', () => {
    expect(searchPhrases(index, '배포').map((p) => p.source)).toEqual(['message']);
    expect(searchPhrases(index, '확인해보').map((p) => p.ko)).toEqual(['확인해 보겠습니다.']);
  });

  it('returns nothing for an empty query', () => {
    expect(searchPhrases(index, '  ')).toEqual([]);
  });
});
