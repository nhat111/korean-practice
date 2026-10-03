import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ContentGate } from '../components/ContentGate';
import { KoreanLine } from '../components/SpeakButton';
import { useContent } from '../data/content';
import { vi } from '../i18n/vi';
import { saveScenarioResult } from '../storage/progress';
import type { Scenario, ScenarioChoice } from '../types';

export function ScenarioPlayerPage() {
  const { id } = useParams();
  const state = useContent('scenarios');

  return (
    <div className="stack">
      <Link to="/scenarios" className="back-link">
        ← {vi.common.back}
      </Link>
      <ContentGate state={state}>
        {(items) => {
          const scenario = items.find((s) => s.id === id);
          if (!scenario) return <p className="muted">{vi.common.notFound}</p>;
          return <ScenarioPlayer key={scenario.id} scenario={scenario} />;
        }}
      </ContentGate>
    </div>
  );
}

type Mode = 'choice' | 'free';

/** What the learner answered on a finished turn. */
interface TurnRecord {
  answer: string;
  correct: boolean;
}

/** Answer submitted for the current turn, waiting for "next". */
type Pending =
  | { kind: 'choice'; index: number }
  | { kind: 'free'; text: string; selfCorrect: boolean | null };

function ScenarioPlayer({ scenario }: { scenario: Scenario }) {
  const [records, setRecords] = useState<TurnRecord[]>([]);
  const [mode, setMode] = useState<Mode>('choice');
  const [showHint, setShowHint] = useState(false);
  const [freeText, setFreeText] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);

  const total = scenario.turns.length;
  const turnIndex = records.length;
  const finished = turnIndex >= total;
  const turn = finished ? null : scenario.turns[turnIndex];

  function goNext(record: TurnRecord) {
    const next = [...records, record];
    setRecords(next);
    setPending(null);
    setFreeText('');
    setShowHint(false);
    if (next.length === total) {
      saveScenarioResult(scenario.id, next.filter((r) => r.correct).length, total);
    }
  }

  function restart() {
    setRecords([]);
    setPending(null);
    setFreeText('');
    setShowHint(false);
  }

  const score = records.filter((r) => r.correct).length;

  return (
    <>
      <header>
        <h1>{scenario.title}</h1>
        <p lang="ko" className="ko-sub">
          {scenario.titleKo}
        </p>
        <p className="muted">{scenario.description}</p>
      </header>

      {/* Conversation so far */}
      <div className="chat">
        {records.map((r, i) => (
          <div key={i} className="chat-pair">
            <Bubble who="client" text={scenario.turns[i].client} />
            <Bubble who="you" text={r.answer} correct={r.correct} />
          </div>
        ))}
      </div>

      {turn && (
        <section className="card stack-sm">
          <div className="row-between">
            <span className="badge">{vi.scenarios.turnOf(turnIndex + 1, total)}</span>
            <button type="button" className="link-btn" onClick={() => setShowHint((h) => !h)}>
              {showHint ? vi.scenarios.hideHint : vi.scenarios.showHint}
            </button>
          </div>

          <Bubble who="client" text={turn.client} />
          {showHint && <p className="hint">💡 {turn.hint}</p>}

          {pending === null && (
            <>
              <div className="segmented" role="tablist">
                {(['choice', 'free'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={mode === m}
                    className={mode === m ? 'active' : ''}
                    onClick={() => setMode(m)}
                  >
                    {m === 'choice' ? vi.scenarios.modeChoice : vi.scenarios.modeFree}
                  </button>
                ))}
              </div>

              {mode === 'choice' ? (
                <div className="choices">
                  {turn.choices.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      className="choice"
                      lang="ko"
                      onClick={() => setPending({ kind: 'choice', index: i })}
                    >
                      {c.ko}
                    </button>
                  ))}
                </div>
              ) : (
                <form
                  className="stack-sm"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (freeText.trim()) {
                      setPending({ kind: 'free', text: freeText.trim(), selfCorrect: null });
                    }
                  }}
                >
                  <textarea
                    lang="ko"
                    rows={3}
                    value={freeText}
                    onChange={(e) => setFreeText(e.target.value)}
                    placeholder={vi.scenarios.freePlaceholder}
                  />
                  <button type="submit" className="btn" disabled={!freeText.trim()}>
                    {vi.scenarios.submit}
                  </button>
                </form>
              )}
            </>
          )}

          {pending?.kind === 'choice' && (
            <ChoiceFeedback choices={turn.choices} selected={pending.index} />
          )}

          {pending?.kind === 'free' && (
            <div className="stack-sm">
              <div className="compare">
                <div>
                  <h3>{vi.scenarios.yourAnswer}</h3>
                  <KoreanLine text={pending.text} />
                </div>
              </div>
              <p className="muted">{vi.scenarios.selfAssess}</p>
              <div className="row">
                <button
                  type="button"
                  className={pending.selfCorrect === true ? 'btn btn--ok' : 'btn btn--ghost'}
                  onClick={() => setPending({ ...pending, selfCorrect: true })}
                >
                  ✓ {vi.scenarios.selfGood}
                </button>
                <button
                  type="button"
                  className={pending.selfCorrect === false ? 'btn btn--bad' : 'btn btn--ghost'}
                  onClick={() => setPending({ ...pending, selfCorrect: false })}
                >
                  ✗ {vi.scenarios.selfBad}
                </button>
              </div>
            </div>
          )}

          {pending !== null && (
            <div className="model">
              <h3>{vi.scenarios.modelAnswer}</h3>
              <KoreanLine text={turn.modelAnswer} />
              <p className="muted">{turn.modelAnswerVi}</p>
            </div>
          )}

          {pending !== null && (
            <button
              type="button"
              className="btn"
              disabled={pending.kind === 'free' && pending.selfCorrect === null}
              onClick={() =>
                goNext(
                  pending.kind === 'choice'
                    ? {
                        answer: turn.choices[pending.index].ko,
                        correct: turn.choices[pending.index].correct,
                      }
                    : { answer: pending.text, correct: pending.selfCorrect === true },
                )
              }
            >
              {turnIndex + 1 === total ? vi.common.finish : vi.common.next}
            </button>
          )}
        </section>
      )}

      {finished && (
        <section className="card center stack-sm">
          <h2>{vi.scenarios.resultTitle}</h2>
          <p className="score">{vi.scenarios.result(score, total)}</p>
          <div className="row row--center">
            <button type="button" className="btn" onClick={restart}>
              {vi.scenarios.again}
            </button>
            <Link to="/scenarios" className="btn btn--ghost">
              {vi.scenarios.toList}
            </Link>
          </div>
        </section>
      )}
    </>
  );
}

function ChoiceFeedback({
  choices,
  selected,
}: {
  choices: ScenarioChoice[];
  selected: number;
}) {
  const picked = choices[selected];
  return (
    <div className="stack-sm">
      <div className={picked.correct ? 'feedback feedback--ok' : 'feedback feedback--bad'}>
        <strong>{picked.correct ? `✓ ${vi.scenarios.correct}` : `✗ ${vi.scenarios.incorrect}`}</strong>
        <p lang="ko" className="ko">
          {picked.ko}
        </p>
        <p>{picked.feedback}</p>
      </div>
      {!picked.correct &&
        choices
          .filter((c) => c.correct)
          .map((c, i) => (
            <div key={i} className="feedback feedback--ok">
              <KoreanLine text={c.ko} />
              <p>{c.feedback}</p>
            </div>
          ))}
    </div>
  );
}

function Bubble({ who, text, correct }: { who: 'client' | 'you'; text: string; correct?: boolean }) {
  const cls = ['bubble', `bubble--${who}`];
  if (correct === false) cls.push('bubble--wrong');
  return (
    <div className={cls.join(' ')}>
      <span className="bubble-who">{who === 'client' ? vi.scenarios.client : vi.scenarios.you}</span>
      <KoreanLine text={text} />
    </div>
  );
}
