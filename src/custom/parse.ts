// Parses pasted "Q: / A: / VI:" text into custom question items.
// Pure and unit-tested. Blocks are separated by blank lines; Q and A are required,
// VI is optional. Prefixes are case-insensitive and accept full-width colons.
// A value may continue over several lines until the next prefix (joined with a space).

import { vi } from '../i18n/vi';

export interface ParsedItem {
  q: string;
  a: string;
  vi?: string;
}

export type ParseErrorCode = 'missingQ' | 'missingA' | 'emptyValue' | 'repeatedPrefix' | 'stray';

export interface ParseError {
  /** 1-based position of the block in the pasted text. */
  block: number;
  code: ParseErrorCode;
  /** Vietnamese message, ready to show. */
  message: string;
}

export interface ParseResult {
  items: ParsedItem[];
  errors: ParseError[];
}

type Field = 'q' | 'a' | 'vi';

const PREFIX = /^\s*(q|a|vi)\s*[:：]\s*(.*)$/i;

function message(block: number, code: ParseErrorCode, detail: string): string {
  const e = vi.custom.errors;
  switch (code) {
    case 'missingQ':
      return e.missingQ(block);
    case 'missingA':
      return e.missingA(block);
    case 'emptyValue':
      return e.emptyValue(block, detail);
    case 'repeatedPrefix':
      return e.repeatedPrefix(block, detail);
    case 'stray':
      return e.stray(block, detail);
  }
}

function error(block: number, code: ParseErrorCode, detail = ''): ParseError {
  return { block, code, message: message(block, code, detail) };
}

function parseBlock(lines: string[], block: number): { item?: ParsedItem; errors: ParseError[] } {
  const values: Partial<Record<Field, string[]>> = {};
  const errors: ParseError[] = [];
  let current: Field | null = null;

  for (const line of lines) {
    const m = PREFIX.exec(line);
    if (m) {
      const field = m[1].toLowerCase() as Field;
      if (values[field]) {
        errors.push(error(block, 'repeatedPrefix', field.toUpperCase()));
        return { errors };
      }
      values[field] = [];
      current = field;
      const first = m[2].trim();
      if (first) values[field].push(first);
    } else if (current) {
      const text = line.trim();
      if (text) values[current]?.push(text);
    } else {
      errors.push(error(block, 'stray', line.trim().slice(0, 30)));
      return { errors };
    }
  }

  const join = (f: Field) => (values[f] ?? []).join(' ').trim();
  if (!values.q) return { errors: [error(block, 'missingQ')] };
  if (!values.a) return { errors: [error(block, 'missingA')] };
  const q = join('q');
  const a = join('a');
  if (!q) return { errors: [error(block, 'emptyValue', 'Q')] };
  if (!a) return { errors: [error(block, 'emptyValue', 'A')] };
  const viText = join('vi');
  return { item: viText ? { q, a, vi: viText } : { q, a }, errors };
}

export function parseCustomQuestions(text: string): ParseResult {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (line.trim() === '') {
      if (current.length > 0) blocks.push(current);
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) blocks.push(current);

  const items: ParsedItem[] = [];
  const errors: ParseError[] = [];
  blocks.forEach((lines, i) => {
    const result = parseBlock(lines, i + 1);
    if (result.item) items.push(result.item);
    errors.push(...result.errors);
  });
  return { items, errors };
}
