// Hand-written runtime checks for the JSON content. Each validator returns a
// list of problems (empty = valid) so a bad item can be skipped with a clear
// message instead of crashing the app.

import { patternProblems } from '../patterns/fill';
import type {
  CorrectionType,
  EmailCorrection,
  EmailExercise,
  NumberItem,
  NumberKind,
  PatternItem,
  Politeness,
  Scenario,
  SongLesson,
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

export function validateSong(v: unknown): string[] {
  const errors: string[] = [];
  if (!isObj(v)) return ['song: phải là object'];
  const path = `song(${String(v.id)})`;
  requireStrings(v, ['id', 'title', 'artist', 'aboutVi', 'youtubeQuery'], path, errors);
  if (typeof v.year !== 'number' || !Number.isInteger(v.year)) errors.push(`${path}.year: phải là số nguyên`);
  if (!Array.isArray(v.words) || v.words.length === 0) {
    errors.push(`${path}.words: cần ít nhất 1 từ`);
  } else {
    v.words.forEach((w, i) => {
      if (!isObj(w)) errors.push(`${path}.words[${i}]: phải là object`);
      else requireStrings(w, ['ko', 'vi'], `${path}.words[${i}]`, errors);
    });
  }
  if (!Array.isArray(v.grammar) || v.grammar.length === 0) {
    errors.push(`${path}.grammar: cần ít nhất 1 mẫu ngữ pháp`);
  } else {
    v.grammar.forEach((g, i) => {
      const p = `${path}.grammar[${i}]`;
      if (!isObj(g)) {
        errors.push(`${p}: phải là object`);
        return;
      }
      requireStrings(g, ['pattern', 'meaningVi', 'linkVi'], p, errors);
      if (!isObj(g.example)) errors.push(`${p}.example: phải là object`);
      else requireStrings(g.example, ['ko', 'vi'], `${p}.example`, errors);
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

export function parseSongs(data: unknown): ParseResult<SongLesson> {
  return parseContentFile<SongLesson>(data, validateSong);
}

export function parseVocab(data: unknown): ParseResult<VocabItem> {
  return parseContentFile<VocabItem>(data, validateVocab);
}

export function parseShadowing(data: unknown): ParseResult<ShadowingItem> {
  return parseContentFile<ShadowingItem>(data, validateShadowing);
}

export function parsePatterns(data: unknown): ParseResult<PatternItem> {
  return parseContentFile<PatternItem>(data, validatePattern);
}

export function parseNumbers(data: unknown): ParseResult<NumberItem> {
  return parseContentFile<NumberItem>(data, validateNumber);
}
