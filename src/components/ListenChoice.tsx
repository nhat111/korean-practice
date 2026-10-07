import { useState } from 'react';
import { vi } from '../i18n/vi';
import type { ChoiceQuestion } from '../practice/listening';
import { ReportButton } from './ReportButton';
import { KoreanLine } from './SpeakButton';

/** Pick what was heard; shows right/wrong and the line once answered. */
export function ListenChoice({
  q,
  prompt,
  onAnswer,
}: {
  q: ChoiceQuestion;
  prompt: string;
  onAnswer: (ok: boolean) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="stack-sm">
      <p className="muted small">{prompt}</p>
      <div className="choices">
        {q.options.map((o, i) => {
          const cls =
            picked === null ? 'choice' : i === q.answer ? 'choice choice--ok' : i === picked ? 'choice choice--bad' : 'choice';
          return (
            <button
              key={o}
              type="button"
              className={cls}
              disabled={picked !== null}
              onClick={() => {
                setPicked(i);
                onAnswer(i === q.answer);
              }}
            >
              {o}
            </button>
          );
        })}
      </div>
      {picked !== null && <ListenReveal reportKey={q.key} ko={q.ko} vi={q.vi} ok={picked === q.answer} />}
    </div>
  );
}

export function ListenReveal({
  reportKey,
  ko,
  vi: meaning,
  ok,
}: {
  reportKey: string;
  ko: string;
  vi: string;
  ok: boolean;
}) {
  return (
    <div className={ok ? 'feedback feedback--ok' : 'feedback feedback--bad'}>
      <strong>{ok ? `✓ ${vi.listening.right}` : `✗ ${vi.listening.wrong}`}</strong>
      <KoreanLine text={ko} />
      {meaning && <p>{meaning}</p>}
      <ReportButton reportKey={reportKey} ko={ko} />
    </div>
  );
}
