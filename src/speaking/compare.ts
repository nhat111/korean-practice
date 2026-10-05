// Compares a spoken transcript with the model answer.
// - Score: character-level similarity (Dice coefficient over the LCS of Hangul/letters,
//   ignoring spaces and punctuation), so spacing differences from speech
//   recognition don't matter.
// - Highlighting: word-level (어절) alignment. A word is a "match" if it appears in
//   the same order, "partial" if a similar word was spoken (e.g. different particle:
//   API는 vs API가), otherwise "missing". Spoken words not in the model are "extra".

export type TokenStatus = 'match' | 'partial' | 'missing' | 'extra';

export interface Token {
  text: string;
  status: TokenStatus;
}

export interface Comparison {
  /** 0-100 */
  score: number;
  model: Token[];
  spoken: Token[];
  /** Model sentence per syllable, marked heard/missed. */
  syllables: Syllable[];
}

const PUNCT = /[.,!?~…·"'“”‘’()[\]{}:;<>「」『』\-–—/\\]/g;

export function normalize(s: string): string {
  return s.normalize('NFC').replace(PUNCT, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Words with punctuation removed, original case kept for display. */
function words(s: string): string[] {
  const n = s.normalize('NFC').replace(PUNCT, ' ').trim();
  return n ? n.split(/\s+/) : [];
}

const sameWord = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

function chars(s: string): string[] {
  return [...normalize(s).replace(/ /g, '')];
}

/** Longest common subsequence; returns matched index pairs. */
function lcsPairs<T>(a: T[], b: T[], eq: (x: T, y: T) => boolean): [number, number][] {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = eq(a[i], b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const pairs: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (eq(a[i], b[j])) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return pairs;
}

/** Dice similarity of two strings at character level, 0-1. */
export function similarity(a: string, b: string): number {
  const ca = chars(a);
  const cb = chars(b);
  if (ca.length + cb.length === 0) return 1;
  const common = lcsPairs(ca, cb, (x, y) => x === y).length;
  return (2 * common) / (ca.length + cb.length);
}

const PARTIAL_THRESHOLD = 0.5;

export function compareAnswer(model: string, spoken: string): Comparison {
  const mw = words(model);
  const sw = words(spoken);
  const pairs = lcsPairs(mw, sw, sameWord);

  const modelTokens: Token[] = mw.map((text) => ({ text, status: 'missing' }));
  const spokenTokens: Token[] = sw.map((text) => ({ text, status: 'extra' }));
  for (const [i, j] of pairs) {
    modelTokens[i].status = 'match';
    spokenTokens[j].status = 'match';
  }

  // Pair up remaining words that look alike (same stem, different ending).
  const freeSpoken = new Set(spokenTokens.flatMap((t, j) => (t.status === 'extra' ? [j] : [])));
  modelTokens.forEach((t, i) => {
    if (t.status !== 'missing') return;
    let best = -1;
    let bestSim = PARTIAL_THRESHOLD;
    for (const j of freeSpoken) {
      const sim = similarity(mw[i], sw[j]);
      if (sim >= bestSim) {
        best = j;
        bestSim = sim;
      }
    }
    if (best >= 0) {
      t.status = 'partial';
      spokenTokens[best].status = 'partial';
      freeSpoken.delete(best);
    }
  });

  return {
    score: Math.round(100 * similarity(model, spoken)),
    model: modelTokens,
    spoken: spokenTokens,
    syllables: syllableDiff(model, spoken),
  };
}

/** Score at or above which a spoken answer counts as correct. */
export const PASS_SCORE = 70;

export interface Syllable {
  ch: string;
  /** true = heard, false = missed, null = space/punctuation (not scored). */
  ok: boolean | null;
}

/**
 * The model sentence split into characters (Hangul syllables), each marked as
 * heard or missed in the spoken text. Uses the same LCS as the score, so
 * spacing and punctuation never count.
 */
export function syllableDiff(model: string, spoken: string): Syllable[] {
  const display = [...model.normalize('NFC')];
  const scored = display.flatMap((ch, i) => (PUNCT_OR_SPACE.test(ch) ? [] : [{ ch: ch.toLowerCase(), i }]));
  const heard = chars(spoken).map((ch) => ({ ch, i: -1 }));
  const matched = new Set(lcsPairs(scored, heard, (a, b) => a.ch === b.ch).map(([k]) => scored[k].i));
  return display.map((ch, i) => ({ ch, ok: PUNCT_OR_SPACE.test(ch) ? null : matched.has(i) }));
}

const PUNCT_OR_SPACE = /^[\s.,!?~…·"'“”‘’()[\]{}:;<>「」『』\-–—/\\]$/;
