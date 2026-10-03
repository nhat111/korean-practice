import type { ReactNode } from 'react';
import { vi } from '../i18n/vi';
import type { GrammarPoint } from '../types';

/**
 * Wraps each grammar point's `form` in the sentence with a numbered highlight
 * (first occurrence, non-overlapping, in sentence order).
 */
export function GrammarSentence({ text: sentence, grammar }: { text: string; grammar?: GrammarPoint[] }) {
  if (!grammar || grammar.length === 0) return <>{sentence}</>;
  const ranges = grammar
    .map((g, i) => ({ start: sentence.indexOf(g.form), length: g.form.length, n: i + 1 }))
    .filter((r) => r.start >= 0)
    .sort((a, b) => a.start - b.start);

  const parts: ReactNode[] = [];
  let pos = 0;
  for (const r of ranges) {
    if (r.start < pos) continue; // overlapping: keep the earlier one
    if (r.start > pos) parts.push(sentence.slice(pos, r.start));
    parts.push(
      <span key={r.n} className="gram-hl">
        {sentence.slice(r.start, r.start + r.length)}
        <sup>{r.n}</sup>
      </span>,
    );
    pos = r.start + r.length;
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
