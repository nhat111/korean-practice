// Hangul ↔ 두벌식 (standard Korean) keystrokes, for the typing drill. Pure and tested.

const SYLLABLE_BASE = 0xac00;
const SYLLABLE_LAST = 0xd7a3;

export const INITIALS = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
export const MEDIALS = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
// Index 0 = no final consonant.
export const FINALS = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

/** Jamo typed as two keys on 두벌식 (compound vowels and finals). ㄲㅆㅒㅖ… are one Shift key. */
const COMPOUND: Record<string, string> = {
  ㅘ: 'ㅗㅏ', ㅙ: 'ㅗㅐ', ㅚ: 'ㅗㅣ', ㅝ: 'ㅜㅓ', ㅞ: 'ㅜㅔ', ㅟ: 'ㅜㅣ', ㅢ: 'ㅡㅣ',
  ㄳ: 'ㄱㅅ', ㄵ: 'ㄴㅈ', ㄶ: 'ㄴㅎ', ㄺ: 'ㄹㄱ', ㄻ: 'ㄹㅁ', ㄼ: 'ㄹㅂ', ㄽ: 'ㄹㅅ', ㄾ: 'ㄹㅌ', ㄿ: 'ㄹㅍ', ㅀ: 'ㄹㅎ', ㅄ: 'ㅂㅅ',
};

/** One 두벌식 key: the jamo it types, the QWERTY letter under it, and whether Shift is needed. */
export interface KeyInfo {
  jamo: string;
  latin: string;
  shift: boolean;
}

/** The three letter rows of a 두벌식 keyboard (unshifted), left to right. */
export const KEY_ROWS: KeyInfo[][] = [
  ['ㅂq', 'ㅈw', 'ㄷe', 'ㄱr', 'ㅅt', 'ㅛy', 'ㅕu', 'ㅑi', 'ㅐo', 'ㅔp'],
  ['ㅁa', 'ㄴs', 'ㅇd', 'ㄹf', 'ㅎg', 'ㅗh', 'ㅓj', 'ㅏk', 'ㅣl'],
  ['ㅋz', 'ㅌx', 'ㅊc', 'ㅍv', 'ㅠb', 'ㅜn', 'ㅡm'],
].map((row) => row.map((k) => ({ jamo: k[0], latin: k[1], shift: false })));

/** Shift + key: double consonants and ㅒ/ㅖ, keyed by the unshifted jamo. */
export const SHIFTED: Record<string, string> = { ㅂ: 'ㅃ', ㅈ: 'ㅉ', ㄷ: 'ㄸ', ㄱ: 'ㄲ', ㅅ: 'ㅆ', ㅐ: 'ㅒ', ㅔ: 'ㅖ' };

const KEY_OF = new Map<string, KeyInfo>();
for (const row of KEY_ROWS) {
  for (const k of row) {
    KEY_OF.set(k.jamo, k);
    const s = SHIFTED[k.jamo];
    if (s) KEY_OF.set(s, { jamo: s, latin: k.latin.toUpperCase(), shift: true });
  }
}

/** The key that types one single-key jamo (ㄲ → Shift+R); undefined for anything else. */
export function keyFor(jamo: string): KeyInfo | undefined {
  return KEY_OF.get(jamo);
}

function splitJamo(j: string): string {
  return COMPOUND[j] ?? j;
}

/**
 * Keystrokes for a text, one entry per key press: 간 → ㄱ ㅏ ㄴ, 와 → ㅇ ㅗ ㅏ, 했 → ㅎ ㅐ ㅆ.
 * Non-Hangul characters (spaces, punctuation, digits, Latin) are one keystroke each.
 */
export function keystrokes(text: string): string[] {
  const out: string[] = [];
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= SYLLABLE_BASE && code <= SYLLABLE_LAST) {
      const n = code - SYLLABLE_BASE;
      const initial = INITIALS[Math.floor(n / 588)];
      const medial = MEDIALS[Math.floor((n % 588) / 28)];
      const final = FINALS[n % 28];
      out.push(initial, ...splitJamo(medial), ...splitJamo(final));
    } else {
      out.push(...splitJamo(ch));
    }
  }
  return out;
}

export type CharState = 'ok' | 'bad' | 'current' | 'todo';

export interface TypingProgress {
  /** One state per character of the target. */
  chars: CharState[];
  /** Keystrokes of the target already typed correctly (a prefix). */
  correctKeys: number;
  /** The next keystroke to press, or undefined when the typed text is off track or finished. */
  nextKey: string | undefined;
  /** The typed text equals the target. */
  done: boolean;
}

/**
 * Compares what the learner typed with the target. The last typed character may still be
 * composing in the IME (가 → 간 before 나 arrives), so it counts as on track while its
 * keystrokes are a prefix of the remaining target.
 */
export function typingProgress(target: string, typed: string): TypingProgress {
  const t = [...target];
  const y = [...typed];
  const chars: CharState[] = t.map(() => 'todo');
  let onTrack = true;
  for (let i = 0; i < y.length && i < t.length; i++) {
    const last = i === y.length - 1;
    if (y[i] === t[i]) {
      chars[i] = 'ok';
    } else if (last && onTrack && startsWith(keystrokes(t.slice(i).join('')), keystrokes(y[i]))) {
      chars[i] = 'current';
    } else {
      chars[i] = 'bad';
      onTrack = false;
    }
  }
  if (y.length < t.length && chars[y.length] === 'todo' && onTrack && !chars.includes('current')) chars[y.length] = 'current';

  const targetKeys = keystrokes(target);
  const typedKeys = keystrokes(typed);
  let correctKeys = 0;
  while (correctKeys < typedKeys.length && correctKeys < targetKeys.length && typedKeys[correctKeys] === targetKeys[correctKeys]) correctKeys++;
  const offTrack = correctKeys < typedKeys.length;
  return {
    chars,
    correctKeys,
    nextKey: offTrack ? undefined : targetKeys[correctKeys],
    done: typed === target,
  };
}

function startsWith(whole: string[], part: string[]): boolean {
  return part.length <= whole.length && part.every((k, i) => whole[i] === k);
}

/** Share of target characters typed exactly (0-100), for a submitted line. */
export function accuracy(target: string, typed: string): number {
  const t = [...target];
  const y = [...typed];
  if (t.length === 0) return 100;
  const right = t.filter((ch, i) => y[i] === ch).length;
  return Math.round((100 * right) / t.length);
}

/** Keystrokes per minute (타수, how Korean typing speed is usually measured). */
export function keysPerMinute(keys: number, ms: number): number {
  return ms > 0 ? Math.round((keys * 60000) / ms) : 0;
}
