import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { ContentGate } from '../components/ContentGate';
import { ShadowingCard } from '../components/ShadowingCard';
import { useContent } from '../data/content';
import { vi } from '../i18n/vi';
import { SHADOWING_TOPICS, srsKey } from '../practice/decks';
import { isDue, todayKey } from '../srs/sm2';
import { useProgress } from '../storage/progress';
import type { ShadowingItem } from '../types';

export function ShadowingPage() {
  const state = useContent('shadowing');
  return (
    <div className="stack">
      <h1>{vi.shadowing.title}</h1>
      <p className="muted">{vi.shadowing.intro}</p>
      <ContentGate state={state}>{(items) => <ShadowingDeck items={items} />}</ContentGate>
    </div>
  );
}

const DUE = 'due';

function ShadowingDeck({ items }: { items: ShadowingItem[] }) {
  const [params, setParams] = useSearchParams();
  const topic = params.get('topic') ?? '';
  const progress = useProgress();
  const today = todayKey();
  const [hideText, setHideText] = useState(false);
  const [index, setIndex] = useState(0);

  const dueNow = () => items.filter((s) => isDue(progress.srs[srsKey.shadowing(s.id)], today));
  // Frozen when the filter is chosen, so rating a sentence doesn't make it vanish mid-drill.
  const [due, setDue] = useState(dueNow);
  const list = topic === DUE ? due : topic ? items.filter((s) => s.topic === topic) : items;
  const topics = SHADOWING_TOPICS.filter((t) => items.some((s) => s.topic === t));
  const current = list[Math.min(index, list.length - 1)];

  function pick(t: string) {
    setIndex(0);
    setDue(dueNow());
    setParams(t ? { topic: t } : {}, { replace: true });
  }

  return (
    <>
      <div className="chips chips--wrap" role="group">
        <button type="button" className={topic === '' ? 'chip chip--on' : 'chip'} onClick={() => pick('')}>
          {vi.shadowing.allTopics}
        </button>
        {due.length > 0 && (
          <button type="button" className={topic === DUE ? 'chip chip--on' : 'chip'} onClick={() => pick(DUE)}>
            {vi.shadowing.dueOnly(due.length)}
          </button>
        )}
        {topics.map((t) => (
          <button key={t} type="button" className={topic === t ? 'chip chip--on' : 'chip'} onClick={() => pick(t)}>
            {vi.shadowing.topics[t]}
          </button>
        ))}
      </div>
      <div className="segmented" role="tablist">
        {[false, true].map((h) => (
          <button
            key={String(h)}
            type="button"
            role="tab"
            aria-selected={hideText === h}
            className={hideText === h ? 'active' : ''}
            onClick={() => setHideText(h)}
          >
            {h ? vi.practice.hideText : vi.practice.showText}
          </button>
        ))}
      </div>

      {!current ? (
        <p className="muted">{vi.shadowing.empty}</p>
      ) : (
        <>
          <div className="row-between">
            <button
              type="button"
              className="btn btn--ghost"
              disabled={index === 0}
              onClick={() => setIndex((i) => i - 1)}
            >
              {vi.practice.prev}
            </button>
            <span className="muted small">{vi.practice.of(Math.min(index, list.length - 1) + 1, list.length)}</span>
            <button
              type="button"
              className="btn btn--ghost"
              disabled={index >= list.length - 1}
              onClick={() => setIndex((i) => i + 1)}
            >
              {vi.practice.next}
            </button>
          </div>
          {/* Remount per sentence (and mode) so recordings and ratings reset. */}
          <ShadowingCard key={`${current.id}:${hideText}`} item={current} hideText={hideText} />
        </>
      )}
    </>
  );
}
