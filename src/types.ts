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

// ---------- Songs ----------
// Lyrics are copyrighted: never store lyric lines. Only the title, short
// words/phrases, and original example sentences written for this app.

export interface SongWord {
  ko: string;
  vi: string;
  noteVi?: string;
}

export interface SongGrammar {
  /** TOPIK-style notation, e.g. "-(으)ㄹ 때마다". */
  pattern: string;
  meaningVi: string;
  /** How the pattern relates to the song title/theme (Vietnamese). */
  linkVi: string;
  /** Original workplace example sentence (not a lyric). */
  example: { ko: string; vi: string };
  noteVi?: string;
}

export interface SongLesson {
  /** Stable id; never rename. */
  id: string;
  /** Korean title as released. */
  title: string;
  artist: string;
  year: number;
  /** Short intro to the song (Vietnamese). */
  aboutVi: string;
  /** YouTube search query for the official MV. */
  youtubeQuery: string;
  words: SongWord[];
  grammar: SongGrammar[];
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
