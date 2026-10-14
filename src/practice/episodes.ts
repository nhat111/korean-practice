// "Nghe thụ động": long MP3 episodes built from existing content, one file per
// episode so phones keep playing with the screen locked. Pure; also imported by
// scripts/episodes-jobs.ts (Node), hence no imports.

export interface EpisodeSpec {
  id: string;
  /** Shadowing topics, in this order. */
  shadowing?: readonly string[];
  /** The first example of every grammar lesson. */
  grammar?: boolean;
}

/** Episodes in display order. Titles live in vi.passive.episodes; never rename an id. */
export const EPISODES: readonly EpisodeSpec[] = [
  { id: 'ep-survival', shadowing: ['survival'] },
  { id: 'ep-report', shadowing: ['progress', 'schedule'] },
  { id: 'ep-bug', shadowing: ['bug'] },
  { id: 'ep-grammar', grammar: true },
];

export interface EpisodeLine {
  ko: string;
  vi: string;
}

interface EpisodeContent {
  shadowing: { topic: string; ko: string; vi: string }[];
  grammar: { examples: { ko: string; vi: string }[] }[];
}

/** The lines an episode reads, in order. */
export function episodeLines(spec: EpisodeSpec, c: EpisodeContent): EpisodeLine[] {
  const lines: EpisodeLine[] = [];
  for (const topic of spec.shadowing ?? []) {
    for (const s of c.shadowing) if (s.topic === topic) lines.push({ ko: s.ko, vi: s.vi });
  }
  if (spec.grammar) {
    for (const g of c.grammar) if (g.examples[0]) lines.push({ ko: g.examples[0].ko, vi: g.examples[0].vi });
  }
  return lines;
}
