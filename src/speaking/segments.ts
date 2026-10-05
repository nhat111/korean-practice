// Splits a long model answer into parts that can be shadowed one at a time.
// Pure and import-free so scripts/tts-jobs.ts can load it with Node.

/** Sentences longer than this (characters, spaces excluded) are also split at commas. */
const LONG = 22;

function size(s: string): number {
  return s.replace(/\s/g, '').length;
}

/**
 * Sentence parts of `text`: split after . ? ! and, inside long sentences,
 * after commas. Returns [] when the text is a single part (nothing to split).
 */
export function splitParts(text: string): string[] {
  const sentences = text
    .trim()
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const parts = sentences.flatMap((s) => {
    if (size(s) <= LONG) return [s];
    const clauses = s
      .split(/(?<=,)\s+/)
      .map((c) => c.trim())
      .filter(Boolean);
    // Don't leave a tiny fragment like "네," on its own: merge it into the next clause.
    const merged: string[] = [];
    for (const c of clauses) {
      const last = merged[merged.length - 1];
      if (last !== undefined && size(last) < 6) merged[merged.length - 1] = `${last} ${c}`;
      else merged.push(c);
    }
    return merged;
  });
  return parts.length > 1 ? parts : [];
}
