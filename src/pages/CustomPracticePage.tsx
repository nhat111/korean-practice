import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { ComparisonView } from '../components/ComparisonView';
import { VoiceAnswer } from '../components/VoiceAnswer';
import type { CustomItem } from '../custom/items';
import { bestScore, customSource, isWeak } from '../custom/score';
import { vi } from '../i18n/vi';
import { isSpeechSupported, speakKorean } from '../speech';
import { compareAnswer, type Comparison } from '../speaking/compare';
import { isRecognitionSupported } from '../speaking/recognition';
import { isRecordingSupported } from '../speaking/recorder';
import { useCustomItems } from '../storage/custom';
import { saveSpeakingAttempt, useProgress } from '../storage/progress';

type AnswerMode = 'voice' | 'text';

interface Result {
  /** How the answer was given; decides the label next to the answer. */
  via: AnswerMode;
  text: string;
  /** Null when the answer was only recorded (no recognition, so no score). */
  comparison: Comparison | null;
}

export function CustomPracticePage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const items = useCustomItems();
  const { speaking } = useProgress();

  const item = items.find((i) => i.id === id);
  if (!item) {
    return (
      <div className="card center stack-sm">
        <p>{vi.common.notFound}</p>
        <Link to="/custom" className="btn">
          {vi.custom.backToList}
        </Link>
      </div>
    );
  }

  // In "chưa thuộc" mode the current question stays in the sequence even after
  // it is passed, so the page does not jump while the learner reads the result.
  const weakOnly = params.get('weak') === '1';
  const sequence = weakOnly ? items.filter((i) => i.id === item.id || isWeak(bestScore(speaking, i.id))) : items;
  const index = sequence.findIndex((i) => i.id === item.id);
  const prev = sequence[index - 1];
  const next = sequence[index + 1];
  const suffix = weakOnly ? '?weak=1' : '';

  return (
    <div className="stack">
      <div className="row-between">
        <Link to="/custom" className="link-btn">
          {vi.custom.backToList}
        </Link>
        <span className="muted small">{vi.speaking.lineOf(index + 1, sequence.length)}</span>
      </div>

      {/* Remount per question so the answer box and recordings reset. */}
      <Practice key={item.id} item={item} />

      <div className="row-between">
        {prev ? (
          <Link to={`/custom/${prev.id}${suffix}`} className="btn btn--ghost">
            {vi.speaking.prev}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link to={`/custom/${next.id}${suffix}`} className="btn btn--ghost">
            {vi.speaking.next}
          </Link>
        ) : (
          <span />
        )}
      </div>

      <p className="muted small">{vi.custom.limitVoice}</p>
      <p className="muted small">{vi.custom.limitCheck}</p>
    </div>
  );
}

function Practice({ item }: { item: CustomItem }) {
  const voiceAvailable = isRecognitionSupported() || isRecordingSupported();
  const [mode, setMode] = useState<AnswerMode>(voiceAvailable ? 'voice' : 'text');
  const [result, setResult] = useState<Result | null>(null);
  const [draft, setDraft] = useState('');
  // Bumped by "Làm lại" to remount the voice answer (clears recordings).
  const [round, setRound] = useState(0);

  function submit(via: AnswerMode, text: string, comparison: Comparison | null) {
    setResult({ via, text, comparison });
    if (comparison) {
      saveSpeakingAttempt({
        mode: 'check',
        source: customSource(item.id),
        target: item.a,
        transcript: text,
        score: comparison.score,
      });
    }
  }

  function retry() {
    setResult(null);
    setDraft('');
    setRound((r) => r + 1);
  }

  function changeMode(m: AnswerMode) {
    if (m === mode) return;
    setMode(m);
    retry(); // an answer given the other way no longer applies
  }

  return (
    <div className="stack">
      <section className="card stack-sm">
        <h2>{vi.custom.questionLabel}</h2>
        <p lang="ko" className="drill-line">
          {item.q}
        </p>
        {isSpeechSupported() && (
          <button type="button" className="btn btn--ghost" onClick={() => void speakKorean(item.q)}>
            {vi.custom.listenQuestion}
          </button>
        )}
      </section>

      <section className="card stack-sm">
        {voiceAvailable && (
          <div className="segmented" role="tablist">
            {(['voice', 'text'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                className={mode === m ? 'active' : ''}
                onClick={() => changeMode(m)}
              >
                {m === 'voice' ? vi.custom.modeVoice : vi.custom.modeText}
              </button>
            ))}
          </div>
        )}

        {mode === 'voice' ? (
          <VoiceAnswer key={round} modelAnswer={item.a} answered={result !== null} onResult={(text, comparison) => submit('voice', text, comparison)} />
        ) : (
          <div className="stack-sm">
            <label className="field">
              <span className="small muted">{vi.custom.typeLabel}</span>
              <textarea
                lang="ko"
                rows={4}
                value={draft}
                placeholder={vi.custom.typePlaceholder}
                disabled={result !== null}
                onChange={(e) => setDraft(e.target.value)}
              />
            </label>
            {result === null && (
              <button
                type="button"
                className="btn"
                disabled={draft.trim() === ''}
                onClick={() => submit('text', draft.trim(), compareAnswer(item.a, draft.trim()))}
              >
                {vi.custom.check}
              </button>
            )}
          </div>
        )}
      </section>

      {result && (
        <section className="card stack-sm">
          {result.comparison ? (
            <ComparisonView
              result={result.comparison}
              spokenLabel={result.via === 'text' ? vi.custom.typedAnswer : undefined}
            />
          ) : (
            <p lang="ko" className="drill-line">
              {item.a}
            </p>
          )}
          {item.vi && <p className="muted">{item.vi}</p>}
          <div className="row">
            {isSpeechSupported() && (
              <button type="button" className="btn btn--ghost" onClick={() => void speakKorean(item.a)}>
                {vi.speaking.listen}
              </button>
            )}
            <button type="button" className="btn" onClick={retry}>
              {vi.custom.retry}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
