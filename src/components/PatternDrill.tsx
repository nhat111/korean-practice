import { useState } from 'react';
import { vi } from '../i18n/vi';
import { fillPattern, randomChoice, type FilledPart, type SlotChoice } from '../patterns/fill';
import { srsKey } from '../practice/decks';
import { batchimOf } from '../speaking/josa';
import type { SelfRating } from '../storage/progress';
import type { PatternItem } from '../types';
import { Icon } from './Icon';
import { SpeakPractice } from './SpeakPractice';

/** The frame with slots shown as [noun] and particles as 은/는. */
function Frame({ pattern }: { pattern: string }) {
  const parts = pattern.split(/(\{[^}]+\})/).filter(Boolean);
  return (
    <p lang="ko" className="frame">
      {parts.map((p, i) => {
        const m = /^\{([^}]+)\}$/.exec(p);
        if (!m) return <span key={i}>{p}</span>;
        return m[1].includes('/') ? (
          <span key={i} className="frame-josa">
            {m[1]}
          </span>
        ) : (
          <span key={i} className="frame-slot">
            {vi.patterns.slotLabels[m[1]] ?? m[1]}
          </span>
        );
      })}
    </p>
  );
}

function Answer({ parts }: { parts: FilledPart[] }) {
  return (
    <p lang="ko" className="drill-line">
      {parts.map((p, i) => (
        <span key={i} className={p.kind === 'text' ? undefined : `part-${p.kind}`}>
          {p.text}
        </span>
      ))}
    </p>
  );
}

/** "결제 기능 + 은: có patchim" for every particle in the filled sentence. */
function josaNotes(parts: FilledPart[]): string[] {
  return parts.flatMap((p, i) => {
    if (p.kind !== 'josa' || i === 0) return [];
    const word = parts[i - 1].text.trim();
    return [vi.patterns.josaRule(word, p.text, vi.patterns.josaRules[batchimOf(word)])];
  });
}

/** Say a pattern with new words from a Vietnamese cue, then compare with the answer. */
export function PatternDrill({ item, onRated }: { item: PatternItem; onRated?: (rating: SelfRating) => void }) {
  const [choice, setChoice] = useState<SlotChoice>(() => randomChoice(item));
  const [revealed, setRevealed] = useState(false);
  const filled = fillPattern(item, choice);
  const words = Object.entries(item.slots).map(([name, fillers]) => fillers[choice[name] ?? 0]);

  function another() {
    setChoice((c) => randomChoice(item, c));
    setRevealed(false);
  }

  return (
    <section className="card stack-sm">
      <div className="stack-xs">
        <span className="muted small">{vi.patterns.frame}</span>
        <Frame pattern={item.pattern} />
        {item.note && <p className="muted small">{item.note}</p>}
      </div>
      <div className="cue stack-xs">
        <span className="muted small">{vi.patterns.cue}</span>
        <p className="cue-vi">{filled.vi}</p>
        <p className="small">
          {vi.patterns.words}:{' '}
          {words.map((w, i) => (
            <span key={i} lang="ko" className="badge">
              {w.ko}
            </span>
          ))}
        </p>
      </div>
      {revealed ? (
        <div className="model stack-xs">
          <h3>{vi.patterns.answer}</h3>
          <Answer parts={filled.parts} />
          {josaNotes(filled.parts).map((n) => (
            <p key={n} lang="ko" className="muted small">
              {n}
            </p>
          ))}
        </div>
      ) : (
        <button type="button" className="btn btn--ghost" onClick={() => setRevealed(true)}>
          {vi.patterns.showAnswer}
        </button>
      )}
      <SpeakPractice
        key={filled.ko}
        ko={filled.ko}
        source={srsKey.pattern(item.id)}
        mode="pattern"
        srsKey={srsKey.pattern(item.id)}
        revealed={revealed}
        onRated={onRated}
      />
      <button type="button" className="link-btn icon-link" onClick={another}>
        <Icon name="repeat" size={18} /> {vi.patterns.another}
      </button>
    </section>
  );
}
