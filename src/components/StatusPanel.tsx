import type { ReactNode } from 'react';
import { vi } from '../i18n/vi';

/**
 * Done and empty screens in the 코데톡 voice: a short Korean line with the red
 * typing cursor, then the Vietnamese title, text and actions.
 */
export function StatusPanel({ kind, title, children }: { kind: 'done' | 'empty'; title?: string; children?: ReactNode }) {
  return (
    <section className={`card status-panel status-panel--${kind} stack-sm`}>
      <p lang="ko" className="status-ko">
        {kind === 'done' ? vi.status.doneKo : vi.status.emptyKo}
        <span className="type-cursor" aria-hidden="true" />
      </p>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}
