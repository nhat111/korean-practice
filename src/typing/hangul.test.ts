import { describe, expect, it } from 'vitest';
import { KEY_LESSONS, chatLines, pickLines, wordLines } from './drills';
import { accuracy, keyFor, keysPerMinute, keystrokes, typingProgress } from './hangul';

describe('keystrokes', () => {
  it('splits syllables into 두벌식 key presses', () => {
    expect(keystrokes('간')).toEqual(['ㄱ', 'ㅏ', 'ㄴ']);
    expect(keystrokes('와')).toEqual(['ㅇ', 'ㅗ', 'ㅏ']);
    expect(keystrokes('했')).toEqual(['ㅎ', 'ㅐ', 'ㅆ']);
    expect(keystrokes('읽')).toEqual(['ㅇ', 'ㅣ', 'ㄹ', 'ㄱ']);
    expect(keystrokes('의')).toEqual(['ㅇ', 'ㅡ', 'ㅣ']);
  });

  it('keeps spaces, punctuation and Latin as one key each', () => {
    expect(keystrokes('네, OK')).toEqual(['ㄴ', 'ㅔ', ',', ' ', 'O', 'K']);
  });

  it('splits standalone compound jamo', () => {
    expect(keystrokes('ㅘ')).toEqual(['ㅗ', 'ㅏ']);
  });
});

describe('keyFor', () => {
  it('maps jamo to QWERTY keys, with Shift for doubles', () => {
    expect(keyFor('ㅁ')).toEqual({ jamo: 'ㅁ', latin: 'a', shift: false });
    expect(keyFor('ㄲ')).toEqual({ jamo: 'ㄲ', latin: 'R', shift: true });
    expect(keyFor('ㅖ')).toEqual({ jamo: 'ㅖ', latin: 'P', shift: true });
    expect(keyFor('a')).toBeUndefined();
  });
});

describe('typingProgress', () => {
  it('treats a syllable still composing in the IME as on track', () => {
    // 가나: after 가 + ㄴ the IME shows 간.
    const p = typingProgress('가나', '간');
    expect(p.chars).toEqual(['current', 'todo']);
    expect(p.correctKeys).toBe(3);
    expect(p.nextKey).toBe('ㅏ');
    expect(p.done).toBe(false);
  });

  it('marks finished characters and points at the next one', () => {
    const p = typingProgress('버그', '버');
    expect(p.chars).toEqual(['ok', 'current']);
    expect(p.nextKey).toBe('ㄱ');
  });

  it('flags a wrong key and stops suggesting keys', () => {
    const p = typingProgress('버그', '바');
    expect(p.chars).toEqual(['bad', 'todo']);
    expect(p.nextKey).toBeUndefined();
  });

  it('is done only on an exact match', () => {
    expect(typingProgress('네.', '네.').done).toBe(true);
    expect(typingProgress('네.', '네').done).toBe(false);
  });

  it('starts at the first key of an empty input', () => {
    const p = typingProgress('확인', '');
    expect(p.chars).toEqual(['current', 'todo']);
    expect(p.nextKey).toBe('ㅎ');
  });
});

describe('accuracy and speed', () => {
  it('scores characters in place', () => {
    expect(accuracy('버그 수정', '버그 수정')).toBe(100);
    expect(accuracy('버그', '버거')).toBe(50);
  });

  it('computes keystrokes per minute', () => {
    expect(keysPerMinute(100, 60000)).toBe(100);
    expect(keysPerMinute(50, 0)).toBe(0);
  });
});

describe('KEY_LESSONS', () => {
  it('uses only keys taught so far in each lesson', () => {
    let allowed = '';
    for (const lesson of KEY_LESSONS) {
      allowed += lesson.keys;
      for (const w of lesson.words) {
        const extra = keystrokes(w.ko).filter((k) => k !== ' ' && !allowed.includes(k));
        expect(extra, `${lesson.id}: ${w.ko}`).toEqual([]);
      }
    }
  });

  it('teaches every key of the keyboard once', () => {
    const all = KEY_LESSONS.map((l) => l.keys).join('');
    expect(new Set(all).size).toBe(all.length);
    for (const k of all) expect(keyFor(k), k).toBeDefined();
  });

  it('makes each new key appear in at least one word of its lesson', () => {
    for (const lesson of KEY_LESSONS) {
      const used = new Set(lesson.words.flatMap((w) => keystrokes(w.ko)));
      for (const k of lesson.keys) expect(used.has(k), `${lesson.id}: ${k}`).toBe(true);
    }
  });
});

describe('content lines', () => {
  it('keeps short Hangul vocab and chat-length lines without duplicates', () => {
    const vocab = [
      { id: 't-1', ko: '배포', vi: 'deploy' },
      { id: 't-2', ko: 'API 키', vi: 'API key' },
    ] as Parameters<typeof wordLines>[0];
    expect(wordLines(vocab)).toEqual([{ ko: '배포', vi: 'deploy' }]);
    const shadowing = [{ id: 'sh-1', ko: '확인했습니다.', vi: 'Đã xác nhận.' }] as Parameters<typeof chatLines>[0];
    const messages = [{ id: 'msg-1', model: '확인했습니다.\n오늘 배포합니다.' }] as Parameters<typeof chatLines>[1];
    expect(chatLines(shadowing, messages)).toEqual([{ ko: '확인했습니다.', vi: 'Đã xác nhận.' }, { ko: '오늘 배포합니다.' }]);
  });

  it('picks distinct random lines', () => {
    const lines = [{ ko: '가' }, { ko: '나' }, { ko: '다' }];
    const picked = pickLines(lines, 2, () => 0);
    expect(picked).toHaveLength(2);
    expect(new Set(picked.map((l) => l.ko)).size).toBe(2);
  });
});
