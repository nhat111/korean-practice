import type { ReactNode } from 'react';
import { vi } from '../i18n/vi';
import type { GrammarPoint } from '../types';

/**
 * Highlights each grammar point's `form` in the sentence (first occurrence)
 * with its number. Points whose forms overlap share one highlight showing all
 * their numbers (e.g. 변경되어 is both passive -되다 and causal -아/어서).
 */
export function GrammarSentence({ text: sentence, grammar }: { text: string; grammar?: GrammarPoint[] }) {
  if (!grammar || grammar.length === 0) return <>{sentence}</>;
  const ranges = grammar
    .map((g, i) => ({ start: sentence.indexOf(g.form), end: sentence.indexOf(g.form) + g.form.length, n: i + 1 }))
    .filter((r) => r.start >= 0)
    .sort((a, b) => a.start - b.start || b.end - a.end);

  // Merge overlapping ranges, keeping every number.
  const merged: { start: number; end: number; ns: number[] }[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.start < last.end) {
      last.end = Math.max(last.end, r.end);
      last.ns.push(r.n);
    } else {
      merged.push({ start: r.start, end: r.end, ns: [r.n] });
    }
  }

  const parts: ReactNode[] = [];
  let pos = 0;
  for (const m of merged) {
    if (m.start > pos) parts.push(sentence.slice(pos, m.start));
    parts.push(
      <span key={m.start} className="gram-hl">
        {sentence.slice(m.start, m.end)}
        <sup>{m.ns.sort((a, b) => a - b).join(',')}</sup>
      </span>,
    );
    pos = m.end;
  }
  parts.push(sentence.slice(pos));
  return <>{parts}</>;
}

/** Numbered list explaining the grammar used in an example sentence. */
export function GrammarNotes({ grammar }: { grammar: GrammarPoint[] | undefined }) {
  if (!grammar || grammar.length === 0) return null;
  return (
    <div className="grammar">
      <span className="grammar-title">{vi.flashcards.grammar}</span>
      <ol className="grammar-list">
        {grammar.map((g, i) => (
          <li key={i}>
            <span className="grammar-n">{i + 1}</span>
            <div className="stack-xs">
              <p>
                <strong lang="ko" className="grammar-pattern">
                  {g.pattern}
                </strong>{' '}
                <span>{g.meaningVi}</span>
              </p>
              {g.noteVi && <p className="muted small">{g.noteVi}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
