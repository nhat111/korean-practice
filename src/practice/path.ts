// "Lộ trình 4 tuần": a fixed path through the existing content for new learners.
// Each week lists steps (a deck, a scenario category, chat topics…); a step's
// progress is how many of its items were practiced at least once, up to a small
// target. The learner's role moves its steps into week 1. Pure, unit-tested.

export type StepKind = 'shadowing' | 'scenarios' | 'interpret' | 'messages' | 'numbers' | 'meetings';

export interface PathStep {
  /** Stable id; labels live in vi.path.steps. */
  id: string;
  kind: StepKind;
  /** Shadowing / interpret / message topics or scenario categories; empty for numbers and meetings. */
  topics: string[];
}

export const PATH_WEEKS = 4;

/** Items to practice for a step to count as done (or all of them when there are fewer). */
export const STEP_TARGETS: Record<StepKind, number> = {
  shadowing: 10,
  scenarios: 3,
  interpret: 6,
  messages: 3,
  numbers: 8,
  meetings: 2,
};

const step = (id: string, kind: StepKind, ...topics: string[]): PathStep => ({ id, kind, topics });

/** The base path, before the role reorders it. */
export const BASE_PATH: PathStep[][] = [
  [
    step('survival', 'shadowing', 'survival', 'cushion'),
    step('daily-life', 'scenarios', 'daily-life', 'communication'),
    step('numbers', 'numbers'),
  ],
  [
    step('report', 'shadowing', 'progress', 'schedule', 'request'),
    step('pm', 'scenarios', 'pm'),
    step('report-msg', 'messages', 'progress', 'schedule', 'request'),
    step('schedule-ip', 'interpret', 'schedule', 'scope'),
    step('tech', 'shadowing', 'tech'),
    step('tech-talk', 'scenarios', 'tech'),
  ],
  [
    step('bug', 'shadowing', 'bug'),
    step('incident', 'scenarios', 'incident', 'release', 'security'),
    step('bug-msg', 'messages', 'bug', 'deploy', 'apology'),
    step('bug-ip', 'interpret', 'bug'),
    step('qa', 'shadowing', 'qa'),
    step('qa-talk', 'scenarios', 'qa'),
  ],
  [
    step('meeting', 'shadowing', 'meeting'),
    step('lead', 'shadowing', 'lead'),
    step('meetings', 'meetings'),
    step('meeting-ip', 'interpret', 'meeting', 'handover', 'cost'),
    step('meeting-talk', 'scenarios', 'meeting'),
    step('interview-sh', 'shadowing', 'interview'),
    step('interview', 'scenarios', 'interview'),
  ],
];

/** Step ids each role starts with (keys match ROLES in storage/prefs.ts). */
export const ROLE_FIRST: Record<string, string[]> = {
  dev: ['tech'],
  brse: ['meeting-ip'],
  tester: ['qa', 'qa-talk'],
  interview: ['interview-sh', 'interview'],
};

/** The four weeks for this role: its steps move to the end of week 1. */
export function buildPath(role?: string): PathStep[][] {
  const first = ROLE_FIRST[role ?? ''] ?? [];
  const all = BASE_PATH.flat();
  const moved = first.flatMap((id) => all.filter((s) => s.id === id));
  return BASE_PATH.map((week, i) => [
    ...week.filter((s) => !first.includes(s.id)),
    ...(i === 0 ? moved : []),
  ]);
}

function dayNumber(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

/** 0-based week of the path on `today` (clamped to the last week; 0 before the start). */
export function currentWeek(start: string, today: string): number {
  const days = dayNumber(today) - dayNumber(start);
  return Math.max(0, Math.min(PATH_WEEKS - 1, Math.floor(days / 7)));
}

/** Content ids with their topic (shadowing/interpret/messages) or category (scenarios). */
export interface PathContent {
  shadowing: { id: string; topic: string }[];
  scenarios: { id: string; category: string }[];
  interpret: { id: string; topic: string }[];
  messages: { id: string; topic: string }[];
  numbers: { id: string }[];
  meetings: { id: string }[];
}

export interface PracticeState {
  srs: Record<string, unknown>;
  scenarios: Record<string, unknown>;
}

export interface StepProgress {
  done: number;
  /** min(STEP_TARGETS[kind], items available). */
  target: number;
  complete: boolean;
  /** Topic to open next: the first one with unpracticed items (or the first topic). */
  nextTopic: string | undefined;
}

/** Items of a step with a "practiced at least once" check, in topic order. */
function stepItems(s: PathStep, c: PathContent, st: PracticeState): { topic: string; practiced: boolean }[] {
  const has = (key: string) => key in st.srs;
  const keys = Object.keys(st.srs);
  const byTopic = <T extends { id: string }>(items: T[], topicOf: (x: T) => string, done: (id: string) => boolean) =>
    s.topics.flatMap((t) => items.filter((x) => topicOf(x) === t).map((x) => ({ topic: t, practiced: done(x.id) })));
  switch (s.kind) {
    case 'shadowing':
      return byTopic(c.shadowing, (x) => x.topic, (id) => has(`shadowing:${id}`));
    case 'scenarios':
      return byTopic(
        c.scenarios,
        (x) => x.category,
        (id) => id in st.scenarios || keys.some((k) => k.startsWith(`scenario:${id}:`)),
      );
    case 'interpret':
      return byTopic(c.interpret, (x) => x.topic, (id) => has(`interpret:${id}`) || has(`interpret-ko:${id}`));
    case 'messages':
      return byTopic(c.messages, (x) => x.topic, (id) => has(`message:${id}`));
    case 'numbers':
      return c.numbers.map((x) => ({ topic: '', practiced: has(`listen:number:${x.id}`) }));
    case 'meetings':
      return c.meetings.map((x) => ({ topic: '', practiced: has(`listen:meeting:${x.id}`) }));
  }
}

export function stepProgress(s: PathStep, c: PathContent, st: PracticeState): StepProgress {
  const items = stepItems(s, c, st);
  const done = items.filter((x) => x.practiced).length;
  const target = Math.min(STEP_TARGETS[s.kind], items.length);
  const open = items.find((x) => !x.practiced);
  return {
    done: Math.min(done, target),
    target,
    complete: target > 0 && done >= target,
    nextTopic: s.topics.length > 0 ? (open?.topic ?? s.topics[0]) : undefined,
  };
}

/** Where a step's "practice" link goes; pages read these query params. */
export function stepLink(s: PathStep, nextTopic: string | undefined): string {
  const q = nextTopic ? encodeURIComponent(nextTopic) : '';
  switch (s.kind) {
    case 'shadowing':
      return `/shadowing?topic=${q}`;
    case 'scenarios':
      return `/scenarios?cat=${q}`;
    case 'interpret':
      return `/interpret?topic=${q}`;
    case 'messages':
      return `/messages?topic=${q}`;
    case 'numbers':
      return '/listening?mode=numbers';
    case 'meetings':
      return '/listening?mode=meeting';
  }
}
