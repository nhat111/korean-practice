import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ComparisonView } from '../components/ComparisonView';
import { ContentGate } from '../components/ContentGate';
import { Icon } from '../components/Icon';
import { RatingButtons } from '../components/SpeakPractice';
import { KoreanLine } from '../components/SpeakButton';
import { VoiceAnswer } from '../components/VoiceAnswer';
import { useContent } from '../data/content';
import { vi } from '../i18n/vi';
import { gradeFor, srsKey } from '../practice/decks';
import { isSpeechSupported, speakKorean, stopSpeaking } from '../speech';
import { PASS_SCORE, type Comparison } from '../speaking/compare';
import { isRecognitionSupported } from '../speaking/recognition';
import { isRecordingSupported } from '../speaking/recorder';
import { review, todayKey } from '../srs/sm2';
import { ANSWER_TIMERS, setAnswerTimer, usePrefs } from '../storage/prefs';
import {
  getProgressSnapshot,
  saveReview,
  saveScenarioResult,
  saveSpeakingAttempt,
  type SelfRating,
} from '../storage/progress';
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
  | { kind: 'free'; text: string; rating: SelfRating | null }
  | {
      kind: 'voice';
      text: string;
      comparison: Comparison | null;
      rating: SelfRating | null;
      /** No answer before the countdown ended. */
      timedOut?: boolean;
    };

const MODE_LABELS: Record<Mode, string> = {
  choice: vi.scenarios.modeChoice,
  free: vi.scenarios.modeFree,
  voice: vi.speaking.modeVoice,
};

function ratingFromScore(score: number): SelfRating | null {
  return score >= PASS_SCORE ? 'good' : null;
}

function ScenarioPlayer({ scenario }: { scenario: Scenario }) {
  const [records, setRecords] = useState<TurnRecord[]>([]);
  const [mode, setMode] = useState<Mode>('choice');
  const [showHint, setShowHint] = useState(false);
  const [freeText, setFreeText] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);
  const [voiceOn, setVoiceOn] = useState(false);
  const { answerTimer } = usePrefs();
  // Countdown: the turn it runs for (starts after the client line is read),
  // and whether the learner already started answering.
  const [timerTurn, setTimerTurn] = useState<number | null>(null);
  const [answeringTurn, setAnsweringTurn] = useState<number | null>(null);

  const canAnswerByVoice = isRecognitionSupported() || isRecordingSupported();
  const canRoleplay = isSpeechSupported() && canAnswerByVoice;
  const modes: Mode[] = canAnswerByVoice ? ['choice', 'free', 'voice'] : ['choice', 'free'];

  const total = scenario.turns.length;
  const partner = scenario.category === 'interview' ? vi.scenarios.interviewer : vi.scenarios.client;
  const turnIndex = records.length;
  const finished = turnIndex >= total;
  const turn = finished ? null : scenario.turns[turnIndex];
  const timed = mode === 'voice' && answerTimer > 0;

  // Voice roleplay: the client speaks each new line aloud, then the countdown starts.
  const clientLine = turn?.client;
  useEffect(() => {
    if (!clientLine) return;
    let active = true;
    const startTimer = () => active && setTimerTurn(turnIndex);
    if (voiceOn) void speakKorean(clientLine).then(startTimer);
    else startTimer();
    return () => {
      active = false;
    };
  }, [voiceOn, clientLine, turnIndex]);
  useEffect(() => stopSpeaking, []);

  function toggleVoice() {
    const on = !voiceOn;
    setVoiceOn(on);
    if (on && pending === null) setMode('voice');
    if (!on) stopSpeaking();
  }

  function startContinuous() {
    if (answerTimer === 0) setAnswerTimer(15);
    setMode('voice');
    if (!voiceOn) setVoiceOn(true);
  }

  function finishTurn(p: Pending, t: Scenario['turns'][number]) {
    if (p.kind === 'choice') {
      goNext({ answer: t.choices[p.index].ko, correct: t.choices[p.index].correct });
      return;
    }
    const rating = p.rating ?? 'bad';
    const correct = rating !== 'bad';
    const key = srsKey.scenario(scenario.id, turnIndex);
    saveReview(key, review(getProgressSnapshot().srs[key], gradeFor(rating), todayKey()));
    if (p.kind === 'voice') {
      saveSpeakingAttempt({
        mode: 'roleplay',
        source: key,
        target: t.modelAnswer,
        ...(p.comparison ? { transcript: p.text, score: p.comparison.score } : {}),
        selfRating: rating,
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
    setTimerTurn(null);
    setAnsweringTurn(null);
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
          <div className="row">
            <button
              type="button"
              className={voiceOn ? 'btn btn--ok voice-toggle' : 'btn btn--ghost voice-toggle'}
              aria-pressed={voiceOn}
              onClick={toggleVoice}
            >
              {vi.speaking.voiceRoleplay}
            </button>
            {!(voiceOn && timed) && (
              <button type="button" className="btn btn--ghost voice-toggle" onClick={startContinuous}>
                {vi.scenarioSpeak.continuous}
              </button>
            )}
          </div>
        )}
        {voiceOn && !finished && <p className="muted small">{vi.speaking.voiceRoleplayOn}</p>}
        {!voiceOn && canRoleplay && !finished && <p className="muted small">{vi.scenarioSpeak.continuousHelp}</p>}
      </header>

      {/* Conversation so far */}
      <div className="chat">
        {records.map((r, i) => (
          <div key={i} className="chat-pair">
            <Bubble who="client" text={scenario.turns[i].client} partner={partner} />
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

          <Bubble who="client" text={turn.client} partner={partner} />
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

              {mode === 'voice' ? (
                <>
                  <TimerChoice />
                  {timed && timerTurn === turnIndex && answeringTurn !== turnIndex && (
                    <Countdown
                      key={turnIndex}
                      seconds={answerTimer}
                      onTimeout={() =>
                        setPending({
                          kind: 'voice',
                          text: vi.scenarioSpeak.timedOut,
                          comparison: null,
                          rating: null,
                          timedOut: true,
                        })
                      }
                    />
                  )}
                </>
              ) : mode === 'choice' ? (
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
                      setPending({ kind: 'free', text: freeText.trim(), rating: null });
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
              onStart={() => setAnsweringTurn(turnIndex)}
              onResult={(text, comparison) =>
                setPending({
                  kind: 'voice',
                  text,
                  comparison,
                  rating: comparison ? ratingFromScore(comparison.score) : null,
                })
              }
            />
          )}

          {pending?.kind === 'choice' && (
            <ChoiceFeedback choices={turn.choices} selected={pending.index} />
          )}

          {pending !== null && pending.kind !== 'choice' && (
            <div className="model">
              <h3>{vi.scenarios.modelAnswer}</h3>
              <KoreanLine text={turn.modelAnswer} />
              <p className="muted">{turn.modelAnswerVi}</p>
            </div>
          )}

          {(pending?.kind === 'free' || pending?.kind === 'voice') && (
            <div className="stack-sm">
              {pending.kind === 'voice' && pending.timedOut && <p className="hint">⏱ {vi.scenarioSpeak.timeUp}</p>}
              {pending.kind === 'voice' && pending.comparison ? (
                <ComparisonView result={pending.comparison} />
              ) : pending.kind === 'voice' ? null : (
                <div>
                  <h3>{vi.scenarios.yourAnswer}</h3>
                  <KoreanLine text={pending.text} />
                </div>
              )}
              <p className="muted">{vi.scenarios.selfAssess}</p>
              <RatingButtons selected={pending.rating} onRate={(rating) => setPending({ ...pending, rating })} />
            </div>
          )}

          {pending?.kind === 'choice' && (
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
              disabled={pending.kind !== 'choice' && pending.rating === null}
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

/** Off / 10 / 15 / 20 seconds to answer (saved in prefs). */
function TimerChoice() {
  const { answerTimer } = usePrefs();
  return (
    <div className="chips" role="group" aria-label={vi.scenarioSpeak.timer}>
      <span className="muted small">
        <Icon name="timer" size={16} /> {vi.scenarioSpeak.timer}
      </span>
      {ANSWER_TIMERS.map((t) => (
        <button
          key={t}
          type="button"
          className={answerTimer === t ? 'chip chip--on' : 'chip'}
          aria-pressed={answerTimer === t}
          onClick={() => setAnswerTimer(t)}
        >
          {t === 0 ? vi.scenarioSpeak.timerOff : vi.scenarioSpeak.timerValue(t)}
        </button>
      ))}
    </div>
  );
}

function Countdown({ seconds, onTimeout }: { seconds: number; onTimeout: () => void }) {
  const [left, setLeft] = useState(seconds);
  const timeoutRef = useRef(onTimeout);
  useEffect(() => {
    timeoutRef.current = onTimeout;
  });
  useEffect(() => {
    const end = Date.now() + seconds * 1000;
    const t = window.setInterval(() => {
      const s = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) {
        window.clearInterval(t);
        timeoutRef.current();
      }
    }, 200);
    return () => window.clearInterval(t);
  }, [seconds]);
  return (
    <div className={left <= 3 ? 'countdown countdown--low' : 'countdown'} role="timer" aria-live="off">
      <div className="countdown-bar" style={{ width: `${(100 * left) / seconds}%` }} />
      <span>{vi.scenarioSpeak.timeLeft(left)}</span>
    </div>
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
  partner,
  text,
  correct,
  plain,
}: {
  who: 'client' | 'you';
  /** Label for the other side (client or interviewer). */
  partner?: string;
  text: string;
  correct?: boolean;
  /** Render as plain text (no Korean speak button). */
  plain?: boolean;
}) {
  const cls = ['bubble', `bubble--${who}`];
  if (correct === false) cls.push('bubble--wrong');
  return (
    <div className={cls.join(' ')}>
      <span className="bubble-who">{who === 'client' ? (partner ?? vi.scenarios.client) : vi.scenarios.you}</span>
      {plain ? <p className="muted">{text}</p> : <KoreanLine text={text} />}
    </div>
  );
}
