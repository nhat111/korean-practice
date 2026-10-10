import { useState } from 'react';
import { ContentGate } from '../components/ContentGate';
import { MessageCard } from '../components/MessageCard';
import { useContent } from '../data/content';
import { vi } from '../i18n/vi';
import { MESSAGE_TOPICS, srsKey } from '../practice/decks';
import { pickKeys } from '../practice/plan';
import { todayKey } from '../srs/sm2';
import { getProgressSnapshot } from '../storage/progress';
import type { MessageExercise } from '../types';

export function MessagesPage() {
  const state = useContent('messages');
  return (
    <div className="stack">
      <h1>{vi.messages.title}</h1>
      <p className="muted">{vi.messages.intro}</p>
      <ContentGate state={state}>{(items) => <MessageDeck items={items} />}</ContentGate>
    </div>
  );
}

/** Due exercises first, then new ones, then the rest (same order as the daily plan). */
function ordered(items: MessageExercise[]): MessageExercise[] {
  const byKey = new Map(items.map((m) => [srsKey.message(m.id), m]));
  return pickKeys([...byKey.keys()], getProgressSnapshot().srs, todayKey(), byKey.size).flatMap((k) => byKey.get(k) ?? []);
}

function MessageDeck({ items }: { items: MessageExercise[] }) {
  const [topic, setTopic] = useState('');
  const [list, setList] = useState(() => ordered(items));
  const [index, setIndex] = useState(0);

  function pickTopic(t: string) {
    setTopic(t);
    setList(ordered(t ? items.filter((m) => m.topic === t) : items));
    setIndex(0);
  }

  const current = list[index];
  return (
    <>
      <select className="select" value={topic} onChange={(e) => pickTopic(e.target.value)} aria-label={vi.messages.title}>
        <option value="">{vi.messages.allTopics(items.length)}</option>
        {MESSAGE_TOPICS.filter((t) => items.some((m) => m.topic === t)).map((t) => (
          <option key={t} value={t}>
            {vi.messages.topics[t]} ({items.filter((m) => m.topic === t).length})
          </option>
        ))}
      </select>
      {current ? (
        <>
          <span className="muted small">{vi.messages.progress(index + 1, list.length)}</span>
          <MessageCard key={current.id} item={current} onNext={() => setIndex((i) => i + 1)} />
        </>
      ) : (
        <section className="card center stack-sm">
          <p>{vi.messages.done}</p>
          <button type="button" className="btn" onClick={() => pickTopic(topic)}>
            {vi.messages.restart}
          </button>
        </section>
      )}
    </>
  );
}
