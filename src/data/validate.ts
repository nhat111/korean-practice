// Hand-written runtime checks for the JSON content. Each validator returns a
// list of problems (empty = valid) so a bad item can be skipped with a clear
// message instead of crashing the app.

import { patternProblems } from '../patterns/fill';
import type {
  BasicLesson,
  HangulLesson,
  CorrectionType,
  EmailCorrection,
  EmailExercise,
  Episode,
  GrammarLesson,
  InterpretItem,
  MeetingItem,
  MessageExercise,
  NumberItem,
  NumberKind,
  PatternItem,
  Politeness,
  Scenario,
  ScenarioChoice,
  ScenarioTurn,
  ShadowingItem,
  VocabItem,
  VocabType,
} from '../types';

type Obj = Record<string, unknown>;

const VOCAB_TYPES: readonly VocabType[] = ['noun', 'verb', 'phrase'];
const POLITENESS: readonly Politeness[] = ['hasipsio', 'haeyo'];
const CORRECTION_TYPES: readonly CorrectionType[] = [
  'grammar',
  'politeness',
  'vocabulary',
  'spelling',
  'format',
];

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

function requireStrings(o: Obj, keys: string[], path: string, errors: string[]): void {
  for (const k of keys) {
    if (!isNonEmptyString(o[k])) errors.push(`${path}.${k}: phải là chuỗi không rỗng`);
  }
}

function checkTags(o: Obj, path: string, errors: string[]): void {
  if (!isStringArray(o.tags)) errors.push(`${path}.tags: phải là mảng chuỗi`);
}

function checkChoice(v: unknown, path: string, errors: string[]): v is ScenarioChoice {
  if (!isObj(v)) {
    errors.push(`${path}: phải là object`);
    return false;
  }
  requireStrings(v, ['ko', 'feedback'], path, errors);
  if (typeof v.correct !== 'boolean') errors.push(`${path}.correct: phải là boolean`);
  return true;
}

function checkTurn(v: unknown, path: string, errors: string[]): v is ScenarioTurn {
  if (!isObj(v)) {
    errors.push(`${path}: phải là object`);
    return false;
  }
  requireStrings(v, ['client', 'hint', 'modelAnswer', 'modelAnswerVi'], path, errors);
  if (!Array.isArray(v.choices) || v.choices.length < 2 || v.choices.length > 3) {
    errors.push(`${path}.choices: cần 2-3 lựa chọn`);
  } else {
    v.choices.forEach((c, i) => checkChoice(c, `${path}.choices[${i}]`, errors));
    const correct = v.choices.filter((c) => isObj(c) && c.correct === true).length;
    if (correct < 1) errors.push(`${path}.choices: cần ít nhất 1 đáp án đúng`);
  }
  return true;
}

export function validateScenario(v: unknown): string[] {
  const errors: string[] = [];
  if (!isObj(v)) return ['scenario: phải là object'];
  const path = `scenario(${String(v.id)})`;
  requireStrings(v, ['id', 'title', 'titleKo', 'description', 'category'], path, errors);
  checkTags(v, path, errors);
  if (!Array.isArray(v.turns) || v.turns.length === 0) {
    errors.push(`${path}.turns: cần ít nhất 1 lượt`);
  } else {
    v.turns.forEach((t, i) => checkTurn(t, `${path}.turns[${i}]`, errors));
  }
  return errors;
}

function checkCorrection(
  v: unknown,
  draft: unknown,
  path: string,
  errors: string[],
): v is EmailCorrection {
  if (!isObj(v)) {
    errors.push(`${path}: phải là object`);
    return false;
  }
  requireStrings(v, ['wrong', 'right', 'explanation'], path, errors);
  if (!CORRECTION_TYPES.includes(v.type as CorrectionType)) {
    errors.push(`${path}.type: phải là một trong ${CORRECTION_TYPES.join(', ')}`);
  }
  if (typeof draft === 'string' && typeof v.wrong === 'string' && !draft.includes(v.wrong)) {
    errors.push(`${path}.wrong: không tìm thấy trong draft`);
  }
  return true;
}

export function validateEmail(v: unknown): string[] {
  const errors: string[] = [];
  if (!isObj(v)) return ['email: phải là object'];
  const path = `email(${String(v.id)})`;
  requireStrings(
    v,
    ['id', 'title', 'situation', 'politenessNote', 'draft', 'corrected'],
    path,
    errors,
  );
  if (!POLITENESS.includes(v.politeness as Politeness)) {
    errors.push(`${path}.politeness: phải là 'hasipsio' hoặc 'haeyo'`);
  }
  checkTags(v, path, errors);
  if (!Array.isArray(v.corrections) || v.corrections.length === 0) {
    errors.push(`${path}.corrections: cần ít nhất 1 lỗi`);
  } else {
    v.corrections.forEach((c, i) => checkCorrection(c, v.draft, `${path}.corrections[${i}]`, errors));
  }
  return errors;
}

function checkGrammar(v: unknown, sentence: unknown, path: string, errors: string[]): void {
  if (v === undefined) return;
  if (!Array.isArray(v)) {
    errors.push(`${path}: phải là mảng`);
    return;
  }
  v.forEach((g, i) => {
    const p = `${path}[${i}]`;
    if (!isObj(g)) {
      errors.push(`${p}: phải là object`);
      return;
    }
    requireStrings(g, ['pattern', 'form', 'meaningVi'], p, errors);
    if (g.noteVi !== undefined && typeof g.noteVi !== 'string') {
      errors.push(`${p}.noteVi: phải là chuỗi`);
    }
    if (typeof g.form === 'string' && typeof sentence === 'string' && !sentence.includes(g.form)) {
      errors.push(`${p}.form: không tìm thấy trong câu ví dụ`);
    }
  });
}

export function validateVocab(v: unknown): string[] {
  const errors: string[] = [];
  if (!isObj(v)) return ['vocab: phải là object'];
  const path = `vocab(${String(v.id)})`;
  requireStrings(v, ['id', 'ko', 'vi'], path, errors);
  for (const k of ['romanization', 'pron', 'collocation']) {
    if (v[k] !== undefined && !isNonEmptyString(v[k])) errors.push(`${path}.${k}: phải là chuỗi không rỗng`);
  }
  if (v.pron !== undefined && !isPron(v.pron)) errors.push(`${path}.pron: phải có dạng [...]`);
  if (v.type !== undefined && !VOCAB_TYPES.includes(v.type as VocabType)) {
    errors.push(`${path}.type: phải là một trong ${VOCAB_TYPES.join(', ')}`);
  }
  if (!isObj(v.example)) {
    errors.push(`${path}.example: phải là object`);
  } else {
    requireStrings(v.example, ['ko', 'vi'], `${path}.example`, errors);
    checkGrammar(v.example.grammar, v.example.ko, `${path}.example.grammar`, errors);
  }
  checkTags(v, path, errors);
  return errors;
}

function isPron(v: unknown): boolean {
  return typeof v === 'string' && /^\[[^[\]]+\]$/.test(v.trim());
}

export function validateShadowing(v: unknown): string[] {
  const errors: string[] = [];
  if (!isObj(v)) return ['shadowing: phải là object'];
  const path = `shadowing(${String(v.id)})`;
  requireStrings(v, ['id', 'topic', 'ko', 'pron', 'vi'], path, errors);
  if (typeof v.level !== 'number' || !Number.isInteger(v.level) || v.level < 1 || v.level > 3) {
    errors.push(`${path}.level: phải là số nguyên 1-3`);
  }
  if (isNonEmptyString(v.pron) && !isPron(v.pron)) errors.push(`${path}.pron: phải có dạng [...]`);
  if (v.notes !== undefined && !(isStringArray(v.notes) && v.notes.every(isNonEmptyString))) {
    errors.push(`${path}.notes: phải là mảng chuỗi không rỗng`);
  }
  return errors;
}

export function validateBasic(v: unknown): string[] {
  const errors: string[] = [];
  if (!isObj(v)) return ['basic: phải là object'];
  const path = `basic(${String(v.id)})`;
  requireStrings(v, ['id', 'title', 'intro'], path, errors);
  if (v.level !== 1 && v.level !== 2) errors.push(`${path}.level: phải là 1 hoặc 2`);
  if (!Array.isArray(v.words) || v.words.length < 3 || v.words.length > 8) {
    errors.push(`${path}.words: cần 3-8 từ`);
  } else {
    v.words.forEach((w: unknown, i) => {
      if (!isObj(w)) errors.push(`${path}.words[${i}]: phải là object { ko, vi }`);
      else requireStrings(w, ['ko', 'vi'], `${path}.words[${i}]`, errors);
    });
  }
  if (!Array.isArray(v.lines) || v.lines.length < 4 || v.lines.length > 10) {
    errors.push(`${path}.lines: cần 4-10 câu`);
  } else {
    v.lines.forEach((l: unknown, i) => {
      const lp = `${path}.lines[${i}]`;
      if (!isObj(l)) {
        errors.push(`${lp}: phải là object`);
        return;
      }
      requireStrings(l, ['ko', 'pron', 'vi'], lp, errors);
      if (isNonEmptyString(l.pron) && !isPron(l.pron)) errors.push(`${lp}.pron: phải có dạng [...]`);
      if (l.note !== undefined && !isNonEmptyString(l.note)) errors.push(`${lp}.note: phải là chuỗi không rỗng`);
    });
    // The listening quiz needs distinct meanings for its options.
    const meanings = v.lines.map((l: unknown) => (isObj(l) ? l.vi : undefined));
    if (new Set(meanings).size !== meanings.length) errors.push(`${path}.lines: nghĩa tiếng Việt bị trùng`);
  }
  return errors;
}

export function validatePattern(v: unknown): string[] {
  const errors: string[] = [];
  if (!isObj(v)) return ['pattern: phải là object'];
  const path = `pattern(${String(v.id)})`;
  requireStrings(v, ['id', 'pattern', 'vi'], path, errors);
  if (v.note !== undefined && !isNonEmptyString(v.note)) errors.push(`${path}.note: phải là chuỗi không rỗng`);
  if (!isObj(v.slots) || Object.keys(v.slots).length === 0) {
    errors.push(`${path}.slots: cần ít nhất 1 slot`);
    return errors;
  }
  for (const [name, fillers] of Object.entries(v.slots)) {
    if (!Array.isArray(fillers) || fillers.length === 0) {
      errors.push(`${path}.slots.${name}: cần ít nhất 1 từ`);
      continue;
    }
    fillers.forEach((f, i) => {
      if (!isObj(f)) errors.push(`${path}.slots.${name}[${i}]: phải là object { ko, vi }`);
      else requireStrings(f, ['ko', 'vi'], `${path}.slots.${name}[${i}]`, errors);
    });
  }
  if (errors.length === 0 && isNonEmptyString(v.pattern) && isNonEmptyString(v.vi)) {
    const item = v as unknown as PatternItem;
    errors.push(...patternProblems(item).map((p) => `${path}: ${p}`));
  }
  return errors;
}

const NUMBER_KINDS: readonly NumberKind[] = ['date', 'time', 'money', 'number'];

export function validateNumber(v: unknown): string[] {
  const errors: string[] = [];
  if (!isObj(v)) return ['number: phải là object'];
  const path = `number(${String(v.id)})`;
  requireStrings(v, ['id', 'ko', 'vi'], path, errors);
  if (!NUMBER_KINDS.includes(v.kind as NumberKind)) {
    errors.push(`${path}.kind: phải là một trong ${NUMBER_KINDS.join(', ')}`);
  }
  const choices = v.choices;
  if (!isStringArray(choices) || choices.length < 2 || choices.length > 4 || !choices.every(isNonEmptyString)) {
    errors.push(`${path}.choices: cần 2-4 chuỗi không rỗng`);
  } else {
    if (new Set(choices).size !== choices.length) errors.push(`${path}.choices: có lựa chọn trùng`);
    if (typeof v.answer !== 'number' || !Number.isInteger(v.answer) || v.answer < 0 || v.answer >= choices.length) {
      errors.push(`${path}.answer: phải là chỉ số trong choices`);
    }
  }
  return errors;
}

export function validateInterpret(v: unknown): string[] {
  const errors: string[] = [];
  if (!isObj(v)) return ['interpret: phải là object'];
  const path = `interpret(${String(v.id)})`;
  requireStrings(v, ['id', 'topic', 'vi', 'ko'], path, errors);
  if (v.note !== undefined && !isNonEmptyString(v.note)) errors.push(`${path}.note: phải là chuỗi không rỗng`);
  return errors;
}

export function validateMessage(v: unknown): string[] {
  const errors: string[] = [];
  if (!isObj(v)) return ['message: phải là object'];
  const path = `message(${String(v.id)})`;
  requireStrings(v, ['id', 'topic', 'to', 'situation', 'model'], path, errors);
  if (v.note !== undefined && !isNonEmptyString(v.note)) errors.push(`${path}.note: phải là chuỗi không rỗng`);
  const phrases = v.phrases;
  if (!Array.isArray(phrases) || phrases.length < 1 || phrases.length > 4) {
    errors.push(`${path}.phrases: cần 1-4 cụm`);
  } else {
    phrases.forEach((p: unknown, i) => {
      if (!isObj(p)) {
        errors.push(`${path}.phrases[${i}]: phải là object`);
        return;
      }
      requireStrings(p, ['ko', 'vi'], `${path}.phrases[${i}]`, errors);
      if (typeof p.ko === 'string' && typeof v.model === 'string' && !v.model.includes(p.ko)) {
        errors.push(`${path}.phrases[${i}].ko: phải nằm nguyên văn trong model`);
      }
    });
  }
  return errors;
}

const VOICES = ['male', 'female'];

export function validateMeeting(v: unknown): string[] {
  const errors: string[] = [];
  if (!isObj(v)) return ['meeting: phải là object'];
  const path = `meeting(${String(v.id)})`;
  requireStrings(v, ['id', 'title', 'context'], path, errors);
  const ids = new Set<string>();
  if (!Array.isArray(v.speakers) || v.speakers.length < 2 || v.speakers.length > 3) {
    errors.push(`${path}.speakers: cần 2-3 người`);
  } else {
    v.speakers.forEach((s: unknown, i) => {
      if (!isObj(s)) {
        errors.push(`${path}.speakers[${i}]: phải là object`);
        return;
      }
      requireStrings(s, ['id', 'name'], `${path}.speakers[${i}]`, errors);
      if (!VOICES.includes(s.voice as string)) errors.push(`${path}.speakers[${i}].voice: male hoặc female`);
      if (typeof s.id === 'string') ids.add(s.id);
    });
  }
  if (!Array.isArray(v.lines) || v.lines.length < 3) {
    errors.push(`${path}.lines: cần ít nhất 3 câu`);
  } else {
    v.lines.forEach((l: unknown, i) => {
      if (!isObj(l)) {
        errors.push(`${path}.lines[${i}]: phải là object`);
        return;
      }
      requireStrings(l, ['speaker', 'ko', 'vi'], `${path}.lines[${i}]`, errors);
      if (!ids.has(l.speaker as string)) errors.push(`${path}.lines[${i}].speaker: không có trong speakers`);
    });
  }
  if (!Array.isArray(v.questions) || v.questions.length < 1) {
    errors.push(`${path}.questions: cần ít nhất 1 câu hỏi`);
  } else {
    v.questions.forEach((q: unknown, i) => {
      const qp = `${path}.questions[${i}]`;
      if (!isObj(q)) {
        errors.push(`${qp}: phải là object`);
        return;
      }
      requireStrings(q, ['q'], qp, errors);
      const choices = q.choices;
      if (!isStringArray(choices) || choices.length < 2 || choices.length > 4 || !choices.every(isNonEmptyString)) {
        errors.push(`${qp}.choices: cần 2-4 chuỗi không rỗng`);
      } else if (
        typeof q.answer !== 'number' ||
        !Number.isInteger(q.answer) ||
        q.answer < 0 ||
        q.answer >= choices.length
      ) {
        errors.push(`${qp}.answer: phải là chỉ số trong choices`);
      }
    });
  }
  return errors;
}

export function validateGrammar(v: unknown): string[] {
  const errors: string[] = [];
  if (!isObj(v)) return ['grammar: phải là object'];
  const path = `grammar(${String(v.id)})`;
  requireStrings(v, ['id', 'group', 'pattern', 'meaningVi', 'usageVi'], path, errors);
  if (v.levels !== undefined) {
    if (!isObj(v.levels)) errors.push(`${path}.levels: phải là object`);
    else
      for (const k of ['peer', 'lead', 'client']) {
        const lv = v.levels[k];
        if (!isObj(lv)) errors.push(`${path}.levels.${k}: phải là { ko, vi }`);
        else requireStrings(lv, ['ko', 'vi'], `${path}.levels.${k}`, errors);
      }
  }
  if (!Array.isArray(v.examples) || v.examples.length < 2 || v.examples.length > 4) {
    errors.push(`${path}.examples: cần 2-4 câu ví dụ`);
  } else {
    v.examples.forEach((e, i) => {
      if (!isObj(e)) errors.push(`${path}.examples[${i}]: phải là object`);
      else requireStrings(e, ['ko', 'vi'], `${path}.examples[${i}]`, errors);
    });
  }
  if (v.mistake !== undefined) {
    if (!isObj(v.mistake)) errors.push(`${path}.mistake: phải là object`);
    else requireStrings(v.mistake, ['wrong', 'right', 'vi', 'noteVi'], `${path}.mistake`, errors);
  }
  if (!Array.isArray(v.quiz) || v.quiz.length < 1 || v.quiz.length > 3) {
    errors.push(`${path}.quiz: cần 1-3 câu hỏi`);
  } else {
    v.quiz.forEach((q, i) => {
      const qp = `${path}.quiz[${i}]`;
      if (!isObj(q)) {
        errors.push(`${qp}: phải là object`);
        return;
      }
      requireStrings(q, ['q', 'answerVi', 'explainVi'], qp, errors);
      if (!isStringArray(q.choices) || q.choices.length < 2 || q.choices.length > 4) {
        errors.push(`${qp}.choices: cần 2-4 lựa chọn`);
      } else if (new Set(q.choices).size !== q.choices.length) {
        errors.push(`${qp}.choices: có lựa chọn trùng`);
      }
      const n = isStringArray(q.choices) ? q.choices.length : 0;
      if (typeof q.answer !== 'number' || !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= n) {
        errors.push(`${qp}.answer: phải là chỉ số của một lựa chọn`);
      }
    });
  }
  return errors;
}

export interface ParseResult<T> {
  items: T[];
  errors: string[];
}

/**
 * Validates a whole content file. Invalid items and duplicate ids are dropped
 * and reported; valid items are kept.
 */
export function parseContentFile<T extends { id: string }>(
  data: unknown,
  validateItem: (v: unknown) => string[],
): ParseResult<T> {
  if (!isObj(data) || !Array.isArray(data.items)) {
    return { items: [], errors: ['File phải có dạng { "version": số, "items": [...] }'] };
  }
  const errors: string[] = [];
  if (typeof data.version !== 'number') errors.push('version: phải là số');

  const items: T[] = [];
  const seen = new Set<string>();
  for (const raw of data.items) {
    const itemErrors = validateItem(raw);
    if (itemErrors.length > 0) {
      errors.push(...itemErrors);
      continue;
    }
    const item = raw as T;
    if (seen.has(item.id)) {
      errors.push(`id trùng: ${item.id}`);
      continue;
    }
    seen.add(item.id);
    items.push(item);
  }
  return { items, errors };
}

export function parseScenarios(data: unknown): ParseResult<Scenario> {
  return parseContentFile<Scenario>(data, validateScenario);
}

export function parseEmails(data: unknown): ParseResult<EmailExercise> {
  return parseContentFile<EmailExercise>(data, validateEmail);
}

export function parseGrammar(data: unknown): ParseResult<GrammarLesson> {
  return parseContentFile<GrammarLesson>(data, validateGrammar);
}

export function parseVocab(data: unknown): ParseResult<VocabItem> {
  return parseContentFile<VocabItem>(data, validateVocab);
}

export function parseShadowing(data: unknown): ParseResult<ShadowingItem> {
  return parseContentFile<ShadowingItem>(data, validateShadowing);
}

const HANGUL_SYLLABLES = /^[\uac00-\ud7a3]+$/;

export function validateHangul(v: unknown): string[] {
  const errors: string[] = [];
  if (!isObj(v)) return ['hangul: phải là object'];
  const path = `hangul(${String(v.id)})`;
  requireStrings(v, ['id', 'title', 'intro'], path, errors);
  if (v.tips !== undefined && !(isStringArray(v.tips) && v.tips.every(isNonEmptyString))) {
    errors.push(`${path}.tips: phải là mảng chuỗi không rỗng`);
  }
  const confuse = (o: Record<string, unknown>, own: unknown, p: string) => {
    if (o.confuse === undefined) return;
    if (!isStringArray(o.confuse) || o.confuse.length === 0 || o.confuse.length > 3) {
      errors.push(`${p}.confuse: cần 1-3 chuỗi`);
    } else if (o.confuse.includes(String(own)) || new Set(o.confuse).size !== o.confuse.length) {
      errors.push(`${p}.confuse: không được trùng nhau hay trùng đáp án`);
    }
  };
  if (!Array.isArray(v.letters) || v.letters.length > 8) {
    errors.push(`${path}.letters: cần 0-8 chữ`);
  } else {
    v.letters.forEach((l: unknown, i) => {
      const lp = `${path}.letters[${i}]`;
      if (!isObj(l)) {
        errors.push(`${lp}: phải là object`);
        return;
      }
      requireStrings(l, ['char', 'sound', 'syllable'], lp, errors);
      if (isNonEmptyString(l.syllable) && !HANGUL_SYLLABLES.test(l.syllable)) {
        errors.push(`${lp}.syllable: phải là âm tiết Hangul`);
      }
      if (l.name !== undefined && !isNonEmptyString(l.name)) errors.push(`${lp}.name: phải là chuỗi không rỗng`);
      if (l.note !== undefined && !isNonEmptyString(l.note)) errors.push(`${lp}.note: phải là chuỗi không rỗng`);
      confuse(l, l.syllable, lp);
    });
  }
  if (!Array.isArray(v.words) || v.words.length < 4 || v.words.length > 12) {
    errors.push(`${path}.words: cần 4-12 từ`);
  } else {
    v.words.forEach((w: unknown, i) => {
      const wp = `${path}.words[${i}]`;
      if (!isObj(w)) {
        errors.push(`${wp}: phải là object`);
        return;
      }
      requireStrings(w, ['ko', 'vi'], wp, errors);
      if (w.pron !== undefined && !(isNonEmptyString(w.pron) && isPron(w.pron))) errors.push(`${wp}.pron: phải có dạng [...]`);
      if (w.note !== undefined && !isNonEmptyString(w.note)) errors.push(`${wp}.note: phải là chuỗi không rỗng`);
      confuse(w, w.ko, wp);
    });
    const kos = v.words.map((w: unknown) => (isObj(w) ? w.ko : undefined));
    if (new Set(kos).size !== kos.length) errors.push(`${path}.words: từ bị trùng`);
  }
  return errors;
}

export function parseBasics(data: unknown): ParseResult<BasicLesson> {
  return parseContentFile<BasicLesson>(data, validateBasic);
}

export function parseHangul(data: unknown): ParseResult<HangulLesson> {
  return parseContentFile<HangulLesson>(data, validateHangul);
}

export function parsePatterns(data: unknown): ParseResult<PatternItem> {
  return parseContentFile<PatternItem>(data, validatePattern);
}

export function parseNumbers(data: unknown): ParseResult<NumberItem> {
  return parseContentFile<NumberItem>(data, validateNumber);
}

export function parseInterpret(data: unknown): ParseResult<InterpretItem> {
  return parseContentFile<InterpretItem>(data, validateInterpret);
}

export function parseMessages(data: unknown): ParseResult<MessageExercise> {
  return parseContentFile<MessageExercise>(data, validateMessage);
}

export function parseMeetings(data: unknown): ParseResult<MeetingItem> {
  return parseContentFile<MeetingItem>(data, validateMeeting);
}

export function validateEpisode(v: unknown): string[] {
  const errors: string[] = [];
  if (!isObj(v)) return ['episode: phải là object'];
  const path = `episode(${String(v.id)})`;
  requireStrings(v, ['id', 'hash'], path, errors);
  if (typeof v.duration !== 'number' || !(v.duration > 0)) errors.push(`${path}.duration: phải là số dương`);
  if (!Array.isArray(v.lines) || v.lines.length === 0) {
    errors.push(`${path}.lines: cần ít nhất 1 câu`);
  } else {
    v.lines.forEach((l, i) => {
      if (!isObj(l)) {
        errors.push(`${path}.lines[${i}]: phải là object`);
        return;
      }
      requireStrings(l, ['ko', 'vi'], `${path}.lines[${i}]`, errors);
      if (typeof l.start !== 'number' || l.start < 0) errors.push(`${path}.lines[${i}].start: phải là số ≥ 0`);
    });
  }
  return errors;
}

export function parseEpisodes(data: unknown): ParseResult<Episode> {
  return parseContentFile<Episode>(data, validateEpisode);
}
