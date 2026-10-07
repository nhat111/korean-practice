// Keys and helpers shared by the speaking drills (shadowing, patterns,
// scenario turns, speaking flashcards) for the generic SRS store.

// No imports from storage/ so tests (DOM-less tsconfig) can use this module.
import type { Grade } from '../srs/sm2';

/** Shadowing decks, in display order. Labels live in vi.shadowing.topics. */
export const SHADOWING_TOPICS = ['survival', 'progress', 'bug', 'schedule', 'request', 'cushion'] as const;
export type ShadowingTopic = (typeof SHADOWING_TOPICS)[number];

/** Topics drawn for the "shadowing" part of the daily session (survival has its own slot). */
export const DAILY_SHADOWING_TOPICS: readonly string[] = ['progress', 'bug', 'schedule', 'request', 'cushion'];

/** Interpreting topics, in display order. Labels live in vi.interpret.topics. */
export const INTERPRET_TOPICS = ['meeting', 'schedule', 'bug', 'scope', 'cost', 'handover'] as const;

/** Keys in Progress.srs: "<type>:<id>". */
export const srsKey = {
  shadowing: (id: string) => `shadowing:${id}`,
  pattern: (id: string) => `pattern:${id}`,
  scenario: (id: string, turn: number) => `scenario:${id}:${turn}`,
  vocabSpeak: (id: string) => `vocab-speak:${id}`,
  /** Vietnamese → say it in Korean. */
  interpret: (id: string) => `interpret:${id}`,
  /** Korean → say it in Vietnamese. */
  interpretKo: (id: string) => `interpret-ko:${id}`,
};

/** SM-2 grade for a self-rating: not yet → again tomorrow, close → hard, good → good. */
export function gradeFor(rating: 'good' | 'ok' | 'bad'): Grade {
  return rating === 'good' ? 4 : rating === 'ok' ? 3 : 1;
}
