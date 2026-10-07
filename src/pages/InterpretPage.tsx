import { useState } from 'react';
import { ContentGate } from '../components/ContentGate';
import { InterpretCard, type InterpretDirection } from '../components/InterpretCard';
import { useContent } from '../data/content';
import { vi } from '../i18n/vi';
import { INTERPRET_TOPICS } from '../practice/decks';
import type { InterpretItem } from '../types';

const DIRECTIONS: InterpretDirection[] = ['vi-ko', 'ko-vi'];

export function InterpretPage() {
  const state = useContent('interpret');
  return (
    <div className="stack">
      <h1>{vi.interpret.title}</h1>
      <p className="muted">{vi.interpret.intro}</p>
      <ContentGate state={state}>{(items) => <InterpretDeck items={items} />}</ContentGate>
    </div>
  );
}

function InterpretDeck({ items }: { items: InterpretItem[] }) {
  const [direction, setDirection] = useState<InterpretDirection>('vi-ko');
  const [topic, setTopic] = useState('');
  const [index, setIndex] = useState(0);
  const list = topic ? items.filter((i) => i.topic === topic) : items;
  const current = list[Math.min(index, list.length - 1)];

  function pickTopic(t: string) {
    setTopic(t);
    setIndex(0);
  }

  return (
    <>
      <div className="segmented" role="tablist">
        {DIRECTIONS.map((d) => (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={direction === d}
            className={direction === d ? 'active' : ''}
            onClick={() => setDirection(d)}
          >
            {vi.interpret.directions[d]}
          </button>
        ))}
      </div>
      <select
        className="select"
        value={topic}
        onChange={(e) => pickTopic(e.target.value)}
        aria-label={vi.interpret.topicLabel}
      >
        <option value="">{vi.interpret.allTopics}</option>
        {INTERPRET_TOPICS.filter((t) => items.some((i) => i.topic === t)).map((t) => (
          <option key={t} value={t}>
            {vi.interpret.topics[t]}
          </option>
        ))}
      </select>
      {current ? (
        <>
          <div className="row-between">
            <button type="button" className="btn btn--ghost" disabled={index === 0} onClick={() => setIndex(index - 1)}>
              {vi.practice.prev}
            </button>
            <span className="muted small">{vi.practice.of(Math.min(index, list.length - 1) + 1, list.length)}</span>
            <button
              type="button"
              className="btn btn--ghost"
              disabled={index >= list.length - 1}
              onClick={() => setIndex(index + 1)}
            >
              {vi.practice.next}
            </button>
          </div>
          {/* Remount per item and direction so the answer hides again. */}
          <InterpretCard key={`${current.id}:${direction}`} item={current} direction={direction} />
        </>
      ) : (
        <p className="muted">{vi.common.empty}</p>
      )}
    </>
  );
}
