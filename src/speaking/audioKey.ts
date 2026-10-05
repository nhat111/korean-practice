// Pre-generated natural voices (Edge TTS, see scripts/tts.py). Each spoken
// sentence is stored at /audio/<voice>/<audioKey(text)>.mp3. This module has
// no imports so scripts/tts-jobs.ts can load it directly with Node.

export const NATURAL_VOICES = {
  male: 'ko-KR-InJoonNeural',
  female: 'ko-KR-SunHiNeural',
} as const;

export type NaturalVoice = keyof typeof NATURAL_VOICES;

/** Stable 53-bit hash (cyrb53) of the trimmed text, as 14 hex digits. */
export function audioKey(text: string): string {
  const s = text.trim();
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

export function audioUrl(voice: NaturalVoice, text: string): string {
  return `/audio/${voice}/${audioKey(text)}.mp3`;
}

/** Fixed sentences used by the "test voice" buttons. */
export const VOICE_SAMPLE = '안녕하세요. 오늘 배포 일정 공유드리겠습니다.';
export const SPEED_SAMPLE = '이번 주 금요일까지 수정해서 배포하겠습니다.';

interface ContentFiles {
  scenarios: { turns: { client: string; modelAnswer: string; choices: { ko: string }[] }[] }[];
  vocab: { ko: string; collocation?: string; example: { ko: string } }[];
  emails: { corrected: string }[];
  songs: { words: { ko: string }[]; grammar: { example: { ko: string } }[] }[];
  shadowing: { ko: string }[];
  /** Every filled pattern sentence (see allFills in patterns/fill.ts). */
  patternSentences: string[];
}

/** Every Korean sentence the app can read aloud from static content. */
export function spokenTexts(c: ContentFiles): string[] {
  const out = new Set<string>([VOICE_SAMPLE, SPEED_SAMPLE]);
  for (const s of c.scenarios)
    for (const t of s.turns) {
      out.add(t.client);
      out.add(t.modelAnswer);
      for (const ch of t.choices) out.add(ch.ko);
    }
  for (const v of c.vocab) {
    out.add(v.ko);
    if (v.collocation) out.add(v.collocation);
    out.add(v.example.ko);
  }
  for (const s of c.shadowing) out.add(s.ko);
  for (const s of c.patternSentences) out.add(s);
  for (const e of c.emails) out.add(e.corrected);
  for (const s of c.songs) {
    for (const w of s.words) out.add(w.ko);
    for (const g of s.grammar) out.add(g.example.ko);
  }
  return [...out].map((t) => t.trim()).filter(Boolean);
}
