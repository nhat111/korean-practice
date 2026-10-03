import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ComparisonView } from '../components/ComparisonView';
import { ContentGate } from '../components/ContentGate';
import { KoreanLine } from '../components/SpeakButton';
import { VoiceAnswer } from '../components/VoiceAnswer';
import { useContent } from '../data/content';
import { vi } from '../i18n/vi';
import { isSpeechSupported, speakKorean, stopSpeaking } from '../speech';
import { PASS_SCORE, type Comparison } from '../speaking/compare';
import { isRecognitionSupported } from '../speaking/recognition';
import { isRecordingSupported } from '../speaking/recorder';
import { saveScenarioResult, saveSpeakingAttempt } from '../storage/progress';
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

type Mode = 'choice' | 'free' | 'voice';

/** What the learner answered on a finished turn. */
interface TurnRecord {
  answer: string;
  correct: boolean;
  /** Answer was a voice recording, so `answer` is a placeholder, not Korean. */
  recorded?: boolean;
}

/** Answer submitted for the current turn, waiting for "next". */
type Pending =
  | { kind: 'choice'; index: number }
  | { kind: 'free'; text: string; selfCorrect: boolean | null }
  | { kind: 'voice'; text: string; comparison: Comparison | null; selfCorrect: boolean | null };

const MODE_LABELS: Record<Mode, string> = {
  choice: vi.scenarios.modeChoice,
  free: vi.scenarios.modeFree,
  voice: vi.speaking.modeVoice,
};

function ScenarioPlayer({ scenario }: { scenario: Scenario }) {
  const [records, setRecords] = useState<TurnRecord[]>([]);
  const [mode, setMode] = useState<Mode>('choice');
  const [showHint, setShowHint] = useState(false);
  const [freeText, setFreeText] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);
  const [voiceOn, setVoiceOn] = useState(false);

  const canAnswerByVoice = isRecognitionSupported() || isRecordingSupported();
  const canRoleplay = isSpeechSupported() && canAnswerByVoice;
  const modes: Mode[] = canAnswerByVoice ? ['choice', 'free', 'voice'] : ['choice', 'free'];

  const total = scenario.turns.length;
  const turnIndex = records.length;
  const finished = turnIndex >= total;
  const turn = finished ? null : scenario.turns[turnIndex];

  // Voice roleplay: the client speaks each new line aloud.
  const clientLine = turn?.client;
  useEffect(() => {
    if (voiceOn && clientLine) void speakKorean(clientLine);
  }, [voiceOn, clientLine, turnIndex]);
  useEffect(() => stopSpeaking, []);

  function toggleVoice() {
    const on = !voiceOn;
    setVoiceOn(on);
    if (on && pending === null) setMode('voice');
    if (!on) stopSpeaking();
  }

  function finishTurn(p: Pending, t: Scenario['turns'][number]) {
    if (p.kind === 'choice') {
      goNext({ answer: t.choices[p.index].ko, correct: t.choices[p.index].correct });
      return;
    }
    const correct = p.selfCorrect === true;
    if (p.kind === 'voice') {
      saveSpeakingAttempt({
        mode: 'roleplay',
        source: `scenario:${scenario.id}:${turnIndex}`,
        target: t.modelAnswer,
        ...(p.comparison
          ? { transcript: p.text, score: p.comparison.score }
          : { selfRating: correct ? 'good' : 'bad' }),
      });
    }
    goNext({ answer: p.text, correct, recorded: p.kind === 'voice' && !p.comparison });
  }

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
        {canRoleplay && !finished && (
          <button
            type="button"
            className={voiceOn ? 'btn btn--ok voice-toggle' : 'btn btn--ghost voice-toggle'}
            aria-pressed={voiceOn}
            onClick={toggleVoice}
          >
            {vi.speaking.voiceRoleplay}
          </button>
        )}
        {voiceOn && !finished && <p className="muted small">{vi.speaking.voiceRoleplayOn}</p>}
      </header>

      {/* Conversation so far */}
      <div className="chat">
        {records.map((r, i) => (
          <div key={i} className="chat-pair">
            <Bubble who="client" text={scenario.turns[i].client} />
            <Bubble who="you" text={r.answer} correct={r.correct} plain={r.recorded} />
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
          {voiceOn && (
            <button
              type="button"
              className="link-btn"
              onClick={() => void speakKorean(turn.client)}
            >
              {vi.speaking.replayClient}
            </button>
          )}
          {showHint && <p className="hint">💡 {turn.hint}</p>}

          {pending === null && (
            <>
              <div className="segmented" role="tablist">
                {modes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={mode === m}
                    className={mode === m ? 'active' : ''}
                    onClick={() => setMode(m)}
                  >
                    {MODE_LABELS[m]}
                  </button>
                ))}
              </div>

              {mode === 'voice' ? null : mode === 'choice' ? (
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

          {/* Stays mounted after answering so recordings can be replayed. */}
          {mode === 'voice' && (pending === null || pending.kind === 'voice') && (
            <VoiceAnswer
              key={turnIndex}
              modelAnswer={turn.modelAnswer}
              answered={pending !== null}
              onResult={(text, comparison) =>
                setPending({
                  kind: 'voice',
                  text,
                  comparison,
                  selfCorrect: comparison ? comparison.score >= PASS_SCORE : null,
                })
              }
            />
          )}

          {pending?.kind === 'choice' && (
            <ChoiceFeedback choices={turn.choices} selected={pending.index} />
          )}

          {(pending?.kind === 'free' || pending?.kind === 'voice') && (
            <div className="stack-sm">
              {pending.kind === 'voice' && pending.comparison ? (
                <ComparisonView result={pending.comparison} />
              ) : pending.kind === 'voice' ? null : (
                <div>
                  <h3>{vi.scenarios.yourAnswer}</h3>
                  <KoreanLine text={pending.text} />
                </div>
              )}
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
              disabled={pending.kind !== 'choice' && pending.selfCorrect === null}
              onClick={() => finishTurn(pending, turn)}
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

function Bubble({
  who,
  text,
  correct,
  plain,
}: {
  who: 'client' | 'you';
  text: string;
  correct?: boolean;
  /** Render as plain text (no Korean speak button). */
  plain?: boolean;
}) {
  const cls = ['bubble', `bubble--${who}`];
  if (correct === false) cls.push('bubble--wrong');
  return (
    <div className={cls.join(' ')}>
      <span className="bubble-who">{who === 'client' ? vi.scenarios.client : vi.scenarios.you}</span>
      {plain ? <p className="muted">{text}</p> : <KoreanLine text={text} />}
    </div>
  );
}
