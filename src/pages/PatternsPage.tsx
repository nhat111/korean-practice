import { useState } from 'react';
import { ContentGate } from '../components/ContentGate';
import { PatternDrill } from '../components/PatternDrill';
import { useContent } from '../data/content';
import { vi } from '../i18n/vi';
import type { PatternItem } from '../types';

export function PatternsPage() {
  const state = useContent('patterns');
  return (
    <div className="stack">
      <h1>{vi.patterns.title}</h1>
      <p className="muted">{vi.patterns.intro}</p>
      <ContentGate state={state}>{(items) => <PatternList items={items} />}</ContentGate>
    </div>
  );
}

function PatternList({ items }: { items: PatternItem[] }) {
  const [index, setIndex] = useState(0);
  const current = items[index];
  if (!current) return <p className="muted">{vi.common.empty}</p>;
  return (
    <>
      <div className="row-between">
        <button type="button" className="btn btn--ghost" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          {vi.practice.prev}
        </button>
        <span className="muted small">{vi.practice.of(index + 1, items.length)}</span>
        <button
          type="button"
          className="btn btn--ghost"
          disabled={index === items.length - 1}
          onClick={() => setIndex(index + 1)}
        >
          {vi.practice.next}
        </button>
      </div>
      <PatternDrill key={current.id} item={current} />
      <details className="guide">
        <summary>{vi.patterns.list}</summary>
        <ul className="stack-xs">
          {items.map((p, i) => (
            <li key={p.id}>
              <button type="button" className="link-btn" lang="ko" onClick={() => setIndex(i)}>
                {p.pattern
                  .replace(/\{([^}/]+)\}/g, (_, name: string) => `[${vi.patterns.slotLabels[name] ?? name}]`)
                  .replace(/\{([^}]+)\}/g, '$1')}
              </button>
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}
