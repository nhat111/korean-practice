import type { MessageExercise, ShadowingItem, VocabItem } from '../types';

/** One line to type, with its meaning when the content has one. */
export interface TypingLine {
  ko: string;
  vi?: string;
}

/**
 * Keyboard lessons, one 두벌식 row at a time (left hand consonants, right hand vowels).
 * `keys` are the jamo the lesson adds; words only use keys from this and earlier lessons (tested).
 */
export const KEY_LESSONS = [
  {
    id: 'home',
    keys: 'ㅁㄴㅇㄹㅎㅗㅓㅏㅣ',
    words: [
      { ko: '나라', vi: 'đất nước' },
      { ko: '하나', vi: 'một' },
      { ko: '아니', vi: 'không' },
      { ko: '머리', vi: 'đầu' },
      { ko: '미안', vi: 'xin lỗi' },
      { ko: '나이', vi: 'tuổi' },
      { ko: '어머니', vi: 'mẹ' },
      { ko: '할머니', vi: 'bà' },
      { ko: '알림', vi: 'thông báo' },
      { ko: '놀이', vi: 'trò chơi' },
    ],
  },
  {
    id: 'top',
    keys: 'ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔ',
    words: [
      { ko: '개발', vi: 'phát triển' },
      { ko: '서버', vi: 'server' },
      { ko: '시간', vi: 'thời gian' },
      { ko: '감사', vi: 'cảm ơn' },
      { ko: '일정', vi: 'lịch trình' },
      { ko: '확인', vi: 'xác nhận' },
      { ko: '검색', vi: 'tìm kiếm' },
      { ko: '설정', vi: 'cài đặt' },
      { ko: '메일', vi: 'email' },
      { ko: '결과', vi: 'kết quả' },
      { ko: '연결', vi: 'kết nối' },
      { ko: '다시', vi: 'lại lần nữa' },
      { ko: '요약', vi: 'tóm tắt' },
    ],
  },
  {
    id: 'bottom',
    keys: 'ㅋㅌㅊㅍㅠㅜㅡ',
    words: [
      { ko: '버그', vi: 'bug' },
      { ko: '테스트', vi: 'test' },
      { ko: '커밋', vi: 'commit' },
      { ko: '요청', vi: 'yêu cầu' },
      { ko: '배포', vi: 'deploy' },
      { ko: '코드', vi: 'code' },
      { ko: '기능', vi: 'chức năng' },
      { ko: '수정', vi: 'sửa' },
      { ko: '회의', vi: 'cuộc họp' },
      { ko: '공유', vi: 'chia sẻ' },
      { ko: '화면', vi: 'màn hình' },
    ],
  },
  {
    id: 'shift',
    keys: 'ㅃㅉㄸㄲㅆㅒㅖ',
    words: [
      { ko: '했습니다', vi: 'đã làm' },
      { ko: '빨리', vi: 'nhanh' },
      { ko: '꼭', vi: 'nhất định' },
      { ko: '짧게', vi: 'ngắn gọn' },
      { ko: '예정', vi: 'dự kiến' },
      { ko: '계속', vi: 'tiếp tục' },
      { ko: '따로', vi: 'riêng' },
      { ko: '얘기', vi: 'câu chuyện' },
      { ko: '바쁘시면', vi: 'nếu anh/chị bận' },
      { ko: '써 주세요', vi: 'hãy viết giúp' },
      { ko: '끝났습니다', vi: 'đã xong' },
    ],
  },
] as const satisfies readonly { id: string; keys: string; words: readonly TypingLine[] }[];

export type KeyLessonId = (typeof KEY_LESSONS)[number]['id'];

/** Lines per round in the word and chat modes. */
export const ROUND_SIZE = 10;

const HANGUL_ONLY = /^[가-힣 ]+$/;

/** Short vocab words (Hangul only, ≤ 8 characters). */
export function wordLines(vocab: VocabItem[]): TypingLine[] {
  return vocab.filter((v) => v.ko.length <= 8 && HANGUL_ONLY.test(v.ko)).map((v) => ({ ko: v.ko, vi: v.vi }));
}

/** Chat-length lines (≤ 40 characters): shadowing sentences and the lines of model chat messages. */
export function chatLines(shadowing: ShadowingItem[], messages: MessageExercise[]): TypingLine[] {
  const lines: TypingLine[] = shadowing.filter((s) => s.ko.length <= 40).map((s) => ({ ko: s.ko, vi: s.vi }));
  for (const m of messages) {
    for (const line of m.model.split('\n')) {
      const ko = line.trim();
      if (ko && ko.length <= 40) lines.push({ ko });
    }
  }
  const seen = new Set<string>();
  return lines.filter((l) => !seen.has(l.ko) && seen.add(l.ko));
}

/** `count` random lines (Fisher-Yates on a copy). */
export function pickLines(lines: readonly TypingLine[], count: number, random: () => number = Math.random): TypingLine[] {
  const copy = [...lines];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}
