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

export interface VocabItem {
  /** Stable id; flashcard progress is keyed by it. Never rename. */
  id: string;
  ko: string;
  vi: string;
  romanization?: string;
  example: {
    ko: string;
    vi: string;
  };
  tags: string[];
}
