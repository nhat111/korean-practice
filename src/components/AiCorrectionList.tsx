import type { AiCorrection } from '../api/client';
import { vi } from '../i18n/vi';

/** Corrections from the AI backend, styled like the static email corrections. */
export function AiCorrectionList({ corrections }: { corrections: AiCorrection[] }) {
  return (
    <ol className="corrections">
      {corrections.map((c, i) => (
        <li key={i} className="card stack-xs">
          <span className="badge">{vi.correctionType[c.type] ?? c.type}</span>
          <p lang="ko">
            <del>{c.original}</del> → <ins>{c.corrected}</ins>
          </p>
          {c.explanationVi && <p className="muted">{c.explanationVi}</p>}
        </li>
      ))}
    </ol>
  );
}

