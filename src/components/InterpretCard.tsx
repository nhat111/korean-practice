import { useEffect, useState } from 'react';
import { vi } from '../i18n/vi';
import { srsKey } from '../practice/decks';
import { stopSpeaking } from '../speech';
import type { SelfRating } from '../storage/progress';
import type { InterpretItem } from '../types';
import { ListenPlayer } from './ListenPlayer';
import { KoreanLine } from './SpeakButton';
import { SelfRate, SpeakPractice } from './SpeakPractice';

/** vi-ko: read Vietnamese, say it in Korean. ko-vi: hear Korean, say it in Vietnamese. */
export type InterpretDirection = 'vi-ko' | 'ko-vi';

export function InterpretCard({
  item,
  direction,
  onRated,
}: {
  item: InterpretItem;
  direction: InterpretDirection;
  onRated?: (rating: SelfRating) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => stopSpeaking, []);

  const answer = (
    <div className="model stack-xs">
      <h3>{vi.interpret.answer}</h3>
      {direction === 'vi-ko' ? (
        <p lang="ko" className="drill-line">
          {item.ko}
        </p>
      ) : (
        <>
          <KoreanLine text={item.ko} />
          <p className="cue-vi">{item.vi}</p>
        </>
      )}
      {item.note && <p className="muted small">{item.note}</p>}
    </div>
  );
  const reveal = (
    <button type="button" className="btn btn--ghost" onClick={() => setRevealed(true)}>
      {vi.patterns.showAnswer}
    </button>
  );

  return (
    <section className="card stack-sm">
      <div className="meta">
        <span className="badge">{vi.interpret.topics[item.topic] ?? item.topic}</span>
      </div>
      {direction === 'vi-ko' ? (
        <>
          <div className="cue stack-xs">
            <span className="muted small">{vi.interpret.sayKo}</span>
            <p className="cue-vi">{item.vi}</p>
          </div>
          {revealed ? answer : reveal}
          <SpeakPractice
            ko={item.ko}
            source={srsKey.interpret(item.id)}
            mode="interpret"
            srsKey={srsKey.interpret(item.id)}
            revealed={revealed}
            onRated={onRated}
          />
        </>
      ) : (
        <>
          <ListenPlayer ko={item.ko} />
          <p className="muted small">{vi.interpret.sayVi}</p>
          {revealed ? (
            <>
              {answer}
              <SelfRate
                ko={item.ko}
                source={srsKey.interpretKo(item.id)}
                mode="interpret"
                srsKey={srsKey.interpretKo(item.id)}
                onRated={onRated}
              />
            </>
          ) : (
            reveal
          )}
        </>
      )}
    </section>
  );
}
