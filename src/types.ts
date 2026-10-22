// Content types for the JSON files in public/data/.
// Text fields ending in `Vi` (and hints, feedback, explanations) are Vietnamese;
// `ko`-style fields are Korean.

/** Every content file has this shape: { "version": 1, "items": [...] }. */
export interface ContentFile<T> {
  version: number;
  items: T[];
}

/** 하십시오체 (formal) or 해요체 (polite informal). */
export type Politeness = 'hasipsio' | 'haeyo';

// ---------- Scenarios ----------

export interface ScenarioChoice {
  /** Answer in Korean. */
  ko: string;
  correct: boolean;
  /** Why this answer is good or bad (Vietnamese). */
  feedback: string;
}

export interface ScenarioTurn {
  /** What the Korean client says. */
  client: string;
  /** Vietnamese hint: what the client means and how to answer. */
  hint: string;
  /** 2-3 answer choices. */
  choices: ScenarioChoice[];
  /** Model answer in Korean. */
  modelAnswer: string;
  /** Vietnamese translation of the model answer. */
  modelAnswerVi: string;
}

export interface Scenario {
  /** Stable id; progress is keyed by it. Never rename. */
  id: string;
  /** Title in Vietnamese. */
  title: string;
  /** Title in Korean. */
  titleKo: string;
  /** Situation description in Vietnamese. */
  description: string;
  /** Free-form category, e.g. "progress-report", "clarify-spec". */
  category: string;
  tags: string[];
  turns: ScenarioTurn[];
}

// ---------- Email exercises ----------

export type CorrectionType = 'grammar' | 'politeness' | 'vocabulary' | 'spelling' | 'format';

export interface EmailCorrection {
  /** Exact text from `draft` that is wrong. Used for highlighting. */
  wrong: string;
  /** Corrected Korean text. */
  right: string;
  type: CorrectionType;
  /** Explanation in Vietnamese. */
  explanation: string;
}

export interface EmailExercise {
  /** Stable id; progress is keyed by it. Never rename. */
  id: string;
  /** Title in Vietnamese. */
  title: string;
  /** Who you are writing to and why (Vietnamese). */
  situation: string;
  /** Speech level the corrected version should use. */
  politeness: Politeness;
  /** Why this speech level fits the situation (Vietnamese). */
  politenessNote: string;
  /** Korean draft containing common mistakes. */
  draft: string;
  /** Corrected Korean version. */
  corrected: string;
  corrections: EmailCorrection[];
  tags: string[];
}

// ---------- Vocabulary ----------

/** A grammar point used in an example sentence. */
export interface GrammarPoint {
  /** Dictionary form of the pattern, e.g. "-(으)ㄹ 예정이다". */
  pattern: string;
  /** Exact text from the example sentence where it appears; highlighted in the UI. */
  form: string;
  /** Short meaning in Vietnamese. */
  meaningVi: string;
  /** Optional one-line usage note in Vietnamese (politeness, nuance). */
  noteVi?: string;
}

/** Word class, used by the speaking flashcards. */
export type VocabType = 'noun' | 'verb' | 'phrase';

export interface VocabItem {
  /** Stable id; flashcard progress is keyed by it. Never rename. */
  id: string;
  ko: string;
  vi: string;
  romanization?: string;
  /** Actual pronunciation after sound changes, e.g. "[화긴하다]". Only when it differs from the spelling. */
  pron?: string;
  type?: VocabType;
  /** Common combination, e.g. "로그를 확인하다". */
  collocation?: string;
  example: {
    ko: string;
    vi: string;
    /** Optional: grammar used in the example, explained when the card is flipped. */
    grammar?: GrammarPoint[];
  };
  tags: string[];
}

// ---------- Grammar (Ngữ pháp công sở) ----------

/** Same politeness idea said to a colleague (해요체), a lead and a client (하십시오체). */
export interface PolitenessLevels {
  peer: KoVi;
  lead: KoVi;
  client: KoVi;
}

/** A Korean line with its Vietnamese meaning. */
export interface KoVi {
  ko: string;
  vi: string;
}

export interface GrammarQuizItem {
  /** The situation, in Vietnamese. */
  q: string;
  /** Korean options (2-4); the UI shuffles them. */
  choices: string[];
  /** Index of the right option. */
  answer: number;
  /** Vietnamese meaning of the right option, shown after answering. */
  answerVi: string;
  /** Why the others are wrong, in Vietnamese. */
  explainVi: string;
}

export interface GrammarLesson {
  /** Stable id ("gr-…"); never rename. */
  id: string;
  /** One of GRAMMAR_GROUPS in src/practice/decks.ts. */
  group: string;
  /** TOPIK notation, e.g. "-느라고"; also matched against vocab example grammar. */
  pattern: string;
  meaningVi: string;
  /** When to use it, politeness notes (Vietnamese). */
  usageVi: string;
  levels?: PolitenessLevels;
  /** 2-4 workplace examples. */
  examples: KoVi[];
  /** A typical mistake: wrong → right (`vi` = what the learner meant), with why. */
  mistake?: { wrong: string; right: string; vi: string; noteVi: string };
  /** 1-3 questions; saved in the SRS as grammar:<id>. */
  quiz: GrammarQuizItem[];
}

// ---------- Shadowing ----------

export interface ShadowingItem {
  /** Stable id; SRS progress is keyed by it. Never rename. */
  id: string;
  /** 1 (short, everyday) to 3 (longer). */
  level: number;
  /** Deck, e.g. "progress", "bug", "survival", "cushion". Labels live in vi.shadowing.topics. */
  topic: string;
  ko: string;
  /** Actual pronunciation of the whole sentence, e.g. "[화긴해 보겓씀니다]". */
  pron: string;
  vi: string;
  /** Sound-change explanations (Vietnamese). */
  notes?: string[];
}

// ---------- Beginner lessons (TOPIK 1-2) ----------

export interface BasicLine {
  ko: string;
  /** Actual pronunciation of the whole sentence, e.g. "[감사함니다]". */
  pron: string;
  vi: string;
  /** Grammar or pronunciation tip (Vietnamese). */
  note?: string;
}

export interface BasicLesson {
  /** Stable id ("bs-..."). Never rename. */
  id: string;
  /** TOPIK level the lesson targets: 1 or 2. */
  level: number;
  /** Vietnamese title and one-line intro. */
  title: string;
  intro: string;
  /** 3-8 key words. */
  words: KoVi[];
  /** 4-10 lines. SRS keys use the index (basic:<id>:<i>): only append, never reorder or remove. */
  lines: BasicLine[];
}

// ---------- Sentence patterns ----------

/** A word that can fill a slot, with its meaning for the Vietnamese cue. */
export interface PatternFiller {
  ko: string;
  vi: string;
}

export interface PatternItem {
  /** Stable id; SRS progress is keyed by it. Never rename. */
  id: string;
  /**
   * Korean frame. `{name}` is a slot from `slots`; `{은/는}`-style pairs are
   * particles chosen by the batchim of the text before them (see josa.ts).
   */
  pattern: string;
  /** Vietnamese frame with the same `{name}` slots (filled with `vi`). */
  vi: string;
  slots: Record<string, PatternFiller[]>;
  /** Usage note (Vietnamese). */
  note?: string;
}

// ---------- Listening: numbers, dates, money ----------

export type NumberKind = 'date' | 'time' | 'money' | 'number';

/** A sentence with a number/date/amount; the learner picks what they heard. */
export interface NumberItem {
  /** Stable id; never rename. */
  id: string;
  kind: NumberKind;
  ko: string;
  vi: string;
  /** Answer options in Vietnamese notation (2-4); shuffled in the UI. */
  choices: string[];
  /** Index of the correct choice. */
  answer: number;
}

// ---------- Interpreting (Vietnamese <-> Korean, spoken) ----------

export interface InterpretItem {
  /** Stable id; SRS progress is keyed by it. Never rename. */
  id: string;
  /** One of INTERPRET_TOPICS in practice/decks.ts (labels in vi.interpret.topics). */
  topic: string;
  /** What the Vietnamese team says. */
  vi: string;
  /** Natural Korean rendering for the client. */
  ko: string;
  /** Usage or grammar note (Vietnamese). */
  note?: string;
}

// ---------- Chat messages (Slack / KakaoWork) ----------

export interface MessagePhrase {
  /** Exact substring of the model message. */
  ko: string;
  vi: string;
}

export interface MessageExercise {
  /** Stable id ("msg-"); SRS progress is keyed by it. Never rename. */
  id: string;
  /** One of MESSAGE_TOPICS in practice/decks.ts (labels in vi.messages.topics). */
  topic: string;
  /** Who reads it, in Vietnamese (e.g. "김 과장님 – PM phía khách"). */
  to: string;
  /** What the learner has to say (Vietnamese). */
  situation: string;
  /** A natural message for the situation. */
  model: string;
  /** 2-4 phrases from `model` worth reusing. */
  phrases: MessagePhrase[];
  /** Politeness or usage note (Vietnamese). */
  note?: string;
}

// ---------- Meeting listening (several speakers) ----------

export interface MeetingSpeaker {
  /** Short id used by lines, e.g. "kim". */
  id: string;
  /** Shown after the transcript is revealed (Vietnamese label). */
  name: string;
  voice: 'male' | 'female';
}

export interface MeetingLine {
  speaker: string;
  ko: string;
  vi: string;
}

export interface MeetingQuestion {
  /** Question in Vietnamese. */
  q: string;
  /** 2-4 Vietnamese choices. */
  choices: string[];
  answer: number;
}

export interface MeetingItem {
  /** Stable id ("lm-"); SRS progress is keyed by it. Never rename. */
  id: string;
  /** Title in Vietnamese. */
  title: string;
  /** Short setup in Vietnamese (who meets and why). */
  context: string;
  speakers: MeetingSpeaker[];
  lines: MeetingLine[];
  questions: MeetingQuestion[];
}

// ---------- Passive listening episodes (generated) ----------

/** One long MP3 built by scripts/episodes.py from existing lines; see src/practice/episodes.ts. */
export interface Episode {
  /** One of EPISODES in src/practice/episodes.ts; the file is audio/episodes/<id>.mp3. */
  id: string;
  /** Of the episode's lines and layout; the episode is rebuilt when it changes. */
  hash: string;
  /** Seconds. */
  duration: number;
  /** In playback order; `start` is the second the line begins. */
  lines: { ko: string; vi: string; start: number }[];
}
