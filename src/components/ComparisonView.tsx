import { vi } from '../i18n/vi';
import { PASS_SCORE, type Comparison, type Syllable, type Token } from '../speaking/compare';

function Syllables({ syllables }: { syllables: Syllable[] }) {
  return (
    <p lang="ko" className="syllables">
      {syllables.map((s, i) =>
        s.ok === null ? (
          <span key={i}>{s.ch}</span>
        ) : (
          <span key={i} className={s.ok ? 'syl syl--ok' : 'syl syl--miss'}>
            {s.ch}
          </span>
        ),
      )}
    </p>
  );
}

function Tokens({ tokens }: { tokens: Token[] }) {
  return (
    <p lang="ko" className="tokens">
      {tokens.map((t, i) => (
        <span key={i} className={`tok tok--${t.status}`}>
          {t.text}
        </span>
      ))}
    </p>
  );
}

/**
 * Score + word-level highlight of model answer vs. what was heard.
 * `spokenLabel` replaces "what the machine heard" (e.g. for typed answers).
 */
export function ComparisonView({ result, spokenLabel }: { result: Comparison; spokenLabel?: string }) {
  const pass = result.score >= PASS_SCORE;
  return (
    <div className="comparison stack-sm">
      <span className={pass ? 'badge badge--ok score-badge' : 'badge badge--bad score-badge'}>
        {vi.speaking.score(result.score)}
      </span>
      <div className="stack-xs">
        <h3>{vi.speaking.bySyllable}</h3>
        <Syllables syllables={result.syllables} />
        <p className="muted small">{vi.speaking.bySyllableHelp}</p>
      </div>
      <div className="stack-xs">
        <h3>{vi.speaking.model}</h3>
        <Tokens tokens={result.model} />
      </div>
      <div className="stack-xs">
        <h3>{spokenLabel ?? vi.speaking.transcript}</h3>
        <Tokens tokens={result.spoken} />
      </div>
      <p className="legend small">
        <span className="tok tok--match">{vi.speaking.legendMatch}</span>
        <span className="tok tok--partial">{vi.speaking.legendPartial}</span>
        <span className="tok tok--missing">{vi.speaking.legendMissing}</span>
        <span className="tok tok--extra">{vi.speaking.legendExtra}</span>
      </p>
    </div>
  );
}
