// Korean particles (조사) that depend on whether the previous word ends in a
// consonant (받침): 은/는, 이/가, 을/를, 과/와, (으)로, ... Pure, unit-tested.

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;
/** Final consonant index of ㄹ in a precomposed syllable. */
const RIEUL = 8;

// How a trailing digit or Latin letter is read aloud: 'none' = no batchim,
// 'l' = ㄹ batchim, 'other' = any other batchim. Letters follow the usual
// Korean letter names (엘, 엠, 엔, 알); digits are Sino-Korean (영, 일, 이...).
// Only the last digit is read, so 12 is 이 (no batchim) and 70 is 십 (batchim).
const DIGIT_END: Record<string, Batchim> = {
  '0': 'other', '1': 'l', '2': 'none', '3': 'other', '4': 'none',
  '5': 'none', '6': 'other', '7': 'l', '8': 'l', '9': 'none',
};
const LETTER_END: Record<string, Batchim> = { l: 'l', r: 'l', m: 'other', n: 'other' };

export type Batchim = 'none' | 'l' | 'other';

/** Batchim of the last pronounced character of `word` (punctuation and spaces ignored). */
export function batchimOf(word: string): Batchim {
  const chars = [...word.normalize('NFC').replace(/[\s.,!?)\]"']+$/u, '')];
  const last = chars[chars.length - 1];
  if (!last) return 'none';
  const code = last.codePointAt(0) ?? 0;
  if (code >= HANGUL_START && code <= HANGUL_END) {
    const final = (code - HANGUL_START) % 28;
    if (final === 0) return 'none';
    return final === RIEUL ? 'l' : 'other';
  }
  if (last === '%') return 'none'; // 퍼센트
  // A final 0 is read 십/백/천/만 (or 영): always a batchim.
  if (last in DIGIT_END) return DIGIT_END[last];
  return LETTER_END[last.toLowerCase()] ?? 'none';
}

// [after a consonant, after a vowel]. 으로 is special: ㄹ batchim takes 로.
const PAIRS: [string, string][] = [
  ['은', '는'],
  ['이', '가'],
  ['을', '를'],
  ['과', '와'],
  ['으로', '로'],
  ['이나', '나'],
  ['이랑', '랑'],
  ['이에요', '예요'],
  ['이라고', '라고'],
  ['아', '야'],
];

/** The consonant/vowel forms for a pair like "은/는" (either order), or null. */
export function parsePair(pair: string): [string, string] | null {
  const parts = pair.split('/').map((p) => p.trim());
  if (parts.length !== 2) return null;
  return PAIRS.find(([c, v]) => (parts[0] === c && parts[1] === v) || (parts[0] === v && parts[1] === c)) ?? null;
}

/**
 * The particle that fits after `word`, e.g. josa('결제 기능', '은/는') = '은',
 * josa('API', '이/가') = '가', josa('서울', '으로/로') = '로'.
 * Unknown pairs return the first form.
 */
export function josa(word: string, pair: string): string {
  const forms = parsePair(pair);
  if (!forms) return pair.split('/')[0];
  const [consonant, vowel] = forms;
  const b = batchimOf(word);
  if (b === 'none') return vowel;
  if (b === 'l' && consonant === '으로') return vowel;
  return consonant;
}
