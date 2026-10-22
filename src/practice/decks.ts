// Keys and helpers shared by the speaking drills (shadowing, patterns,
// scenario turns, speaking flashcards) for the generic SRS store.

// No imports from storage/ so tests (DOM-less tsconfig) can use this module.
import type { Grade } from '../srs/sm2';

/** Shadowing decks, in display order. Labels live in vi.shadowing.topics. */
export const SHADOWING_TOPICS = ['survival', 'progress', 'bug', 'schedule', 'request', 'meeting', 'online', 'phone', 'tech', 'cushion', 'culture', 'qa', 'lead', 'interview'] as const;
export type ShadowingTopic = (typeof SHADOWING_TOPICS)[number];

/** Topics drawn for the "shadowing" part of the daily session (survival has its own slot). */
export const DAILY_SHADOWING_TOPICS: readonly string[] = ['progress', 'bug', 'schedule', 'request', 'meeting', 'online', 'phone', 'tech', 'cushion', 'culture', 'qa', 'lead'];

/** What the daily plan leans towards for each onboarding role (keys match ROLES in storage/prefs.ts). */
export interface DailyFocus {
  /** One of the daily shadowing slots comes from this topic. */
  shadowingTopic?: string;
  /** The scenario turn comes from this category. */
  scenarioCategory?: string;
}

export const ROLE_FOCUS: Record<string, DailyFocus> = {
  dev: { shadowingTopic: 'tech' },
  brse: { shadowingTopic: 'meeting' },
  tester: { shadowingTopic: 'qa', scenarioCategory: 'qa' },
  interview: { shadowingTopic: 'interview', scenarioCategory: 'interview' },
};

/** Interpreting topics, in display order. Labels live in vi.interpret.topics. */
export const INTERPRET_TOPICS = ['meeting', 'schedule', 'bug', 'scope', 'cost', 'handover'] as const;

/** Chat message topics, in display order. Labels live in vi.messages.topics. */
export const MESSAGE_TOPICS = ['progress', 'bug', 'schedule', 'request', 'deploy', 'apology', 'meeting', 'phone'] as const;

/** Grammar lesson groups, in display order. Labels live in vi.grammar.groups. */
export const GRAMMAR_GROUPS = ['report', 'explain', 'request', 'honorific'] as const;

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
  /** Write a Slack / KakaoWork message, compare with the model, self-rate. */
  message: (id: string) => `message:${id}`,
  /** Grammar lesson quiz: grade 4 when every question is right, else 1. */
  grammar: (id: string) => `grammar:${id}`,
  /** Beginner lesson line, said aloud (listening it is `listen:basic:<id>:<i>`). */
  basic: (id: string, line: number) => `basic:${id}:${line}`,
};

/** SM-2 grade for a self-rating: not yet → again tomorrow, close → hard, good → good. */
export function gradeFor(rating: 'good' | 'ok' | 'bad'): Grade {
  return rating === 'good' ? 4 : rating === 'ok' ? 3 : 1;
}
