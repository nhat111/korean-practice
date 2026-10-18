// "Cần nói gấp": find a Korean line by its Vietnamese meaning (or by Korean) across the
// static content. Pure and tested.

import type { GrammarLesson, InterpretItem, MessageExercise, Scenario, ShadowingItem, VocabItem } from '../types';

export type PhraseSource = 'shadowing' | 'interpret' | 'scenario' | 'message' | 'vocab' | 'grammar';

export interface Phrase {
  ko: string;
  vi: string;
  source: PhraseSource;
}

export interface SearchContent {
  shadowing: ShadowingItem[];
  interpret: InterpretItem[];
  scenarios: Scenario[];
  messages: MessageExercise[];
  vocab: VocabItem[];
  grammar: GrammarLesson[];
}

/** Lowercase, no Vietnamese diacritics (đ → d), punctuation as spaces, single spaces. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Every Korean line with a Vietnamese meaning, deduplicated by Korean text (first source wins). */
export function buildPhrases(c: SearchContent): Phrase[] {
  const out: Phrase[] = [];
  const add = (ko: string, vi: string, source: PhraseSource) => out.push({ ko: ko.trim(), vi: vi.trim(), source });
  for (const s of c.shadowing) add(s.ko, s.vi, 'shadowing');
  for (const i of c.interpret) add(i.ko, i.vi, 'interpret');
  for (const s of c.scenarios) for (const t of s.turns) add(t.modelAnswer, t.modelAnswerVi, 'scenario');
  for (const m of c.messages) add(m.model, m.situation, 'message');
  for (const g of c.grammar) {
    for (const e of g.examples) add(e.ko, e.vi, 'grammar');
    if (g.levels) for (const l of [g.levels.peer, g.levels.lead, g.levels.client]) add(l.ko, l.vi, 'grammar');
  }
  for (const v of c.vocab) {
    add(v.ko, v.vi, 'vocab');
    add(v.example.ko, v.example.vi, 'vocab');
  }
  const seen = new Set<string>();
  return out.filter((p) => p.ko && p.vi && !seen.has(p.ko) && seen.add(p.ko));
}

interface Indexed extends Phrase {
  viNorm: string;
  koNorm: string;
}

export interface PhraseIndex {
  items: Indexed[];
  /** Phrases whose meaning contains each normalized word. */
  df: Map<string, number>;
}

export function indexPhrases(phrases: Phrase[]): PhraseIndex {
  const df = new Map<string, number>();
  const items = phrases.map((p) => {
    const viNorm = normalize(p.vi);
    for (const w of new Set(viNorm.split(' '))) df.set(w, (df.get(w) ?? 0) + 1);
    return { ...p, viNorm: ` ${viNorm} `, koNorm: p.ko.replace(/\s+/g, '') };
  });
  return { items, df };
}

/** Words too common to tell phrases apart; ignored unless the query has nothing else. */
const STOPWORDS = new Set(['xin', 'anh', 'chi', 'em', 'toi', 'chung', 'a', 'duoc', 'khong', 'co', 'cua', 'la', 'va', 'cho', 'da', 'se', 'thi', 'nay', 'do', 'voi', 'giup', 'nhe', 'vay', 'roi', 'mot', 'cac', 'nhung', 'ban', 've', 'o', 'den', 'tu']);

/** Words that mean the same thing in a request, so "dời lịch" also finds "lùi lịch". */
const SYNONYMS: string[][] = [
  ['doi', 'lui', 'hoan', 'chuyen'],
  ['tre', 'cham'],
  ['hop', 'meeting'],
];

function variants(word: string): string[] {
  return SYNONYMS.find((g) => g.includes(word)) ?? [word];
}

const HANGUL = /[가-힣ㄱ-ㅎ]/;

/**
 * Phrases matching the query, best first. Vietnamese queries match whole words of the meaning
 * (accents optional: "doi lich" finds "dời lịch"); rare words weigh more than common ones (IDF),
 * and a phrase needs most of the query's weight to count. Korean queries match the Korean text,
 * ignoring spaces.
 */
export function searchPhrases(index: PhraseIndex, query: string, limit = 30): Phrase[] {
  const q = query.trim();
  if (!q) return [];
  if (HANGUL.test(q)) {
    const needle = q.replace(/\s+/g, '');
    return index.items
      .filter((p) => p.koNorm.includes(needle))
      .sort((a, b) => a.ko.length - b.ko.length)
      .slice(0, limit)
      .map(strip);
  }
  const all = [...new Set(normalize(q).split(' ').filter(Boolean))];
  const content = all.filter((w) => !STOPWORDS.has(w));
  const words = content.length > 0 ? content : all;
  if (words.length === 0) return [];
  const n = index.items.length;
  const weight = (w: string) => Math.log((n + 1) / (1 + Math.max(...variants(w).map((v) => index.df.get(v) ?? 0))));
  const weights = words.map(weight);
  const total = weights.reduce((a, b) => a + b, 0);
  // As typed, stopwords included ("xin lỗi" ranks the apology above "lỗi" = bug).
  const phrase = ` ${all.join(' ')} `;
  const scored: { p: Indexed; score: number }[] = [];
  for (const p of index.items) {
    let score = 0;
    words.forEach((w, i) => {
      if (variants(w).some((v) => p.viNorm.includes(` ${v} `))) score += weights[i];
    });
    if (score === 0) continue;
    // The words in order, as typed, rank above the same words scattered.
    if (all.length > 1 && p.viNorm.includes(phrase)) score += 1;
    scored.push({ p, score });
  }
  return scored
    .filter((s) => s.score >= total * 0.6)
    .sort((a, b) => b.score - a.score || a.p.ko.length - b.p.ko.length)
    .slice(0, limit)
    .map((s) => strip(s.p));
}

function strip(p: Indexed): Phrase {
  return { ko: p.ko, vi: p.vi, source: p.source };
}
