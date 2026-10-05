import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { vi } from '../i18n/vi';
import { srsKey } from '../practice/decks';
import { speakKorean, stopSpeaking } from '../speech';
import type { SelfRating } from '../storage/progress';
import type { Scenario } from '../types';
import { KoreanLine } from './SpeakButton';
import { SpeakPractice } from './SpeakPractice';

/** One scenario turn in "Tự nói" style: hear the client, answer aloud, then compare with the model. */
export function ScenarioTurnDrill({
  scenario,
  turn,
  onRated,
}: {
  scenario: Scenario;
  turn: number;
  onRated?: (rating: SelfRating) => void;
}) {
  const t = scenario.turns[turn];
  const [revealed, setRevealed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const key = srsKey.scenario(scenario.id, turn);
  const partner = scenario.category === 'interview' ? vi.scenarios.interviewer : vi.scenarios.client;

  useEffect(() => {
    void speakKorean(t.client);
    return stopSpeaking;
  }, [t.client]);

  return (
    <section className="card stack-sm">
      <Link to={`/scenarios/${scenario.id}`} className="muted small">
        {scenario.title}
      </Link>
      <div className="bubble bubble--client">
        <span className="bubble-who">{partner}</span>
        <KoreanLine text={t.client} />
      </div>
      <div className="row-between">
        <span className="muted small">{vi.scenarioSpeak.yourTurn}</span>
        <button type="button" className="link-btn" onClick={() => setShowHint((h) => !h)}>
          {showHint ? vi.scenarios.hideHint : vi.scenarios.showHint}
        </button>
      </div>
      {showHint && <p className="hint">💡 {t.hint}</p>}
      {revealed ? (
        <div className="model">
          <h3>{vi.scenarios.modelAnswer}</h3>
          <p lang="ko" className="drill-line">
            {t.modelAnswer}
          </p>
          <p className="muted">{t.modelAnswerVi}</p>
        </div>
      ) : (
        <button type="button" className="btn btn--ghost" onClick={() => setRevealed(true)}>
          {vi.patterns.showAnswer}
        </button>
      )}
      <SpeakPractice ko={t.modelAnswer} source={key} mode="roleplay" srsKey={key} revealed={revealed} onRated={onRated} />
    </section>
  );
}
