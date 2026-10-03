import { useState } from 'react';
import { Link } from 'react-router';
import { checkBackend, roleplay, useBackendStatus, type ChatTurn, type RoleplayResponse } from '../api/client';
import { apiErrorMessage } from '../api/messages';
import { AiCorrectionList } from '../components/AiCorrectionList';
import { KoreanLine } from '../components/SpeakButton';
import { ListenButton } from '../components/SpeakingDrill';
import { useContent } from '../data/content';
import { vi } from '../i18n/vi';
import { isRecognitionSupported, useSpeechRecognition } from '../speaking/recognition';
import { useBackendSettings } from '../storage/backend';

/** Only the most recent turns are sent; the backend accepts at most 40. */
const MAX_HISTORY = 30;

interface ClientLine {
  who: 'client';
  text: string;
  textVi: string;
}

interface LearnerLine {
  who: 'user';
  text: string;
  feedback: Pick<RoleplayResponse, 'corrections' | 'naturalVersion' | 'explanationVi'>;
}

type Line = ClientLine | LearnerLine;

export function AiRoleplayPage() {
  const settings = useBackendSettings();
  const status = useBackendStatus();

  return (
    <div className="stack">
      <h1>{vi.aiRoleplay.title}</h1>
      <p className="muted">{vi.aiRoleplay.intro}</p>
      {!settings.url ? (
        <section className="card stack-sm">
          <p>{vi.aiRoleplay.needBackend}</p>
          <Link to="/settings" className="btn">
            {vi.aiRoleplay.goSettings}
          </Link>
        </section>
      ) : status.state === 'offline' || (status.state === 'online' && !status.aiEnabled) ? (
        <section className="card stack-sm">
          <p>{status.state === 'offline' ? vi.backend.errors.offline : vi.backend.errors.ai_disabled}</p>
          {status.state === 'offline' && (
            <button type="button" className="btn btn--ghost" onClick={() => void checkBackend()}>
              {vi.backend.banner.retry}
            </button>
          )}
          <p className="muted small">{vi.aiRoleplay.staticAlternative}</p>
          <Link to="/scenarios" className="btn">
            {vi.aiRoleplay.toScenarios}
          </Link>
        </section>
      ) : (
        <Conversation />
      )}
    </div>
  );
}

function Conversation() {
  const scenarios = useContent('scenarios');
  const [scenarioId, setScenarioId] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognition = useSpeechRecognition();

  const items = scenarios.status === 'ready' ? scenarios.items : [];
  const selected = items.find((s) => s.id === scenarioId);
  const scenarioText = selected ? `${selected.titleKo}. ${selected.description}` : undefined;
  const started = lines.length > 0;

  async function send(message: string) {
    setLoading(true);
    setError(null);
    const history: ChatTurn[] = lines.slice(-MAX_HISTORY).map((l) => ({ role: l.who, text: l.text }));
    try {
      const r = await roleplay({ scenario: scenarioText, history, message });
      const next: Line[] = [...lines];
      if (message) {
        next.push({
          who: 'user',
          text: message,
          feedback: { corrections: r.corrections, naturalVersion: r.naturalVersion, explanationVi: r.explanationVi },
        });
      }
      next.push({ who: 'client', text: r.reply, textVi: r.replyVi });
      setLines(next);
      setInput('');
    } catch (e) {
      // Keep the learner's text in the input so it can be re-sent.
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  function restart() {
    setLines([]);
    setInput('');
    setError(null);
  }

  return (
    <>
      {!started && (
        <section className="card stack-sm">
          <label className="field">
            <span>{vi.aiRoleplay.scenario}</span>
            <select className="select" value={scenarioId} onChange={(e) => setScenarioId(e.target.value)}>
              <option value="">{vi.aiRoleplay.freeScenario}</option>
              {items.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
          {selected && <p className="muted small">{selected.description}</p>}
          <button type="button" className="btn" disabled={loading} onClick={() => void send('')}>
            {loading ? vi.aiRoleplay.thinking : vi.aiRoleplay.start}
          </button>
        </section>
      )}

      {started && (
        <div className="chat">
          {lines.map((l, i) => (l.who === 'client' ? <ClientBubble key={i} line={l} /> : <LearnerBubble key={i} line={l} />))}
          {loading && <p className="muted small">{vi.aiRoleplay.thinking}</p>}
        </div>
      )}

      {error && (
        <div className="stack-xs">
          <p className="error">{error}</p>
          {started && input.trim() && (
            <button type="button" className="link-btn" onClick={() => void send(input.trim())}>
              {vi.aiRoleplay.retry}
            </button>
          )}
        </div>
      )}

      {started && (
        <form
          className="stack-sm chat-input"
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim() && !loading) void send(input.trim());
          }}
        >
          <textarea
            lang="ko"
            rows={3}
            value={recognition.status === 'listening' ? recognition.interim : input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={vi.aiRoleplay.placeholder}
            disabled={loading}
          />
          <div className="row">
            {isRecognitionSupported() && (
              <ListenButton
                recognition={recognition}
                label={vi.aiRoleplay.dictate}
                onStart={() => recognition.start((t) => setInput((prev) => (prev ? `${prev} ${t}` : t)))}
              />
            )}
            <button type="submit" className="btn" disabled={loading || !input.trim()}>
              {vi.aiRoleplay.send}
            </button>
          </div>
          {recognition.error && <p className="error">{recognition.error}</p>}
          <button type="button" className="link-btn" onClick={restart}>
            {vi.aiRoleplay.restart}
          </button>
        </form>
      )}
    </>
  );
}

function ClientBubble({ line }: { line: ClientLine }) {
  const [showVi, setShowVi] = useState(false);
  return (
    <div className="bubble bubble--client">
      <span className="bubble-who">{vi.scenarios.client}</span>
      <KoreanLine text={line.text} />
      {line.textVi && (
        <button type="button" className="link-btn small" onClick={() => setShowVi((v) => !v)}>
          {showVi ? vi.aiRoleplay.hideTranslation : vi.aiRoleplay.showTranslation}
        </button>
      )}
      {showVi && <p className="muted small">{line.textVi}</p>}
    </div>
  );
}

function LearnerBubble({ line }: { line: LearnerLine }) {
  const { corrections, naturalVersion, explanationVi } = line.feedback;
  return (
    <div className="chat-pair">
      <div className={corrections.length > 0 ? 'bubble bubble--you bubble--wrong' : 'bubble bubble--you'}>
        <span className="bubble-who">{vi.scenarios.you}</span>
        <p lang="ko">{line.text}</p>
      </div>
      <div className="ai-feedback stack-xs">
        {corrections.length > 0 ? (
          <>
            <h3>{vi.aiRoleplay.corrections}</h3>
            <AiCorrectionList corrections={corrections} />
          </>
        ) : (
          <p className="muted small">✓ {vi.aiRoleplay.noMistakes}</p>
        )}
        {naturalVersion && naturalVersion !== line.text && (
          <div className="model">
            <h3>{vi.aiRoleplay.natural}</h3>
            <KoreanLine text={naturalVersion} />
          </div>
        )}
        {explanationVi && (
          <p className="small">
            <strong>{vi.aiRoleplay.feedback}:</strong> {explanationVi}
          </p>
        )}
      </div>
    </div>
  );
}
