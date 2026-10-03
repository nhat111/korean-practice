import { useState } from 'react';
import { checkEmail, type EmailCheckResponse } from '../api/client';
import { vi } from '../i18n/vi';
import { useBackendSettings } from '../storage/backend';
import type { EmailExercise } from '../types';
import { apiErrorMessage } from '../api/messages';
import { AiCorrectionList } from './AiCorrectionList';
import { SpeakButton } from './SpeakButton';

/** Optional AI check of the learner's own version. Hidden when no backend is configured. */
export function AiEmailCheck({ exercise, text }: { exercise: EmailExercise; text: string }) {
  const settings = useBackendSettings();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EmailCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!settings.url) return null;

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(
        await checkEmail({ text, politeness: exercise.politeness, situation: exercise.situation }),
      );
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card stack-sm">
      <h3>{vi.aiEmail.title}</h3>
      <p className="muted small">{vi.aiEmail.help}</p>
      <button type="button" className="btn btn--ghost" onClick={() => void run()} disabled={loading || !text.trim()}>
        {loading ? vi.aiEmail.checking : vi.aiEmail.check}
      </button>
      {error && <p className="error">{error}</p>}
      {result && (
        <div className="stack-sm">
          <span className={result.score >= 70 ? 'badge badge--ok score-badge' : 'badge badge--bad score-badge'}>
            {vi.aiEmail.score(result.score)}
          </span>
          {result.explanationVi && <p>{result.explanationVi}</p>}
          <div className="row-between">
            <h3>{vi.aiEmail.corrected}</h3>
            <SpeakButton text={result.corrected} small />
          </div>
          <pre lang="ko" className="email-text email-text--static email-text--ok">
            {result.corrected}
          </pre>
          {result.corrections.length > 0 ? (
            <AiCorrectionList corrections={result.corrections} />
          ) : (
            <p className="muted">{vi.aiEmail.noMistakes}</p>
          )}
        </div>
      )}
    </section>
  );
}
