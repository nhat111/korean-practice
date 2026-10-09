// Loads content from public/data/*.json. Files are fetched once and cached for
// the session; adding items to the JSON files needs no code changes.

import { useEffect, useState } from 'react';
import type {
  EmailExercise,
  InterpretItem,
  MeetingItem,
  MessageExercise,
  NumberItem,
  PatternItem,
  Scenario,
  ShadowingItem,
  SongLesson,
  VocabItem,
} from '../types';
import {
  parseEmails,
  parseInterpret,
  parseMeetings,
  parseMessages,
  parseNumbers,
  parsePatterns,
  parseScenarios,
  parseShadowing,
  parseSongs,
  parseVocab,
  type ParseResult,
} from './validate';

interface ContentMap {
  scenarios: Scenario;
  emails: EmailExercise;
  vocab: VocabItem;
  songs: SongLesson;
  shadowing: ShadowingItem;
  patterns: PatternItem;
  numbers: NumberItem;
  interpret: InterpretItem;
  messages: MessageExercise;
  meetings: MeetingItem;
}

export type ContentKind = keyof ContentMap;

const parsers: { [K in ContentKind]: (data: unknown) => ParseResult<ContentMap[K]> } = {
  scenarios: parseScenarios,
  emails: parseEmails,
  vocab: parseVocab,
  songs: parseSongs,
  shadowing: parseShadowing,
  patterns: parsePatterns,
  numbers: parseNumbers,
  interpret: parseInterpret,
  messages: parseMessages,
  meetings: parseMeetings,
};

const cache = new Map<ContentKind, Promise<unknown[]>>();

async function fetchContent<K extends ContentKind>(kind: K): Promise<ContentMap[K][]> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${kind}.json`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { items, errors } = parsers[kind](await res.json());
  if (errors.length > 0) {
    console.warn(`[content] ${kind}.json có ${errors.length} lỗi, đã bỏ qua mục lỗi:`, errors);
  }
  return items;
}

export function loadContent<K extends ContentKind>(kind: K): Promise<ContentMap[K][]> {
  let p = cache.get(kind);
  if (!p) {
    p = fetchContent(kind);
    // Allow retry after a failed request.
    p.catch(() => cache.delete(kind));
    cache.set(kind, p);
  }
  return p as Promise<ContentMap[K][]>;
}

export type ContentState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; items: T[] };

export function useContent<K extends ContentKind>(kind: K): ContentState<ContentMap[K]> {
  const [state, setState] = useState<ContentState<ContentMap[K]>>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    loadContent(kind).then(
      (items) => active && setState({ status: 'ready', items }),
      (e: unknown) =>
        active && setState({ status: 'error', error: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      active = false;
    };
  }, [kind]);

  return state;
}
