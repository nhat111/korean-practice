import type { ReactNode } from 'react';
import type { ContentState } from '../data/content';
import { vi } from '../i18n/vi';

interface Props<T> {
  state: ContentState<T>;
  children: (items: T[]) => ReactNode;
}

/** Renders loading / error states, then children once content is ready. */
export function ContentGate<T>({ state, children }: Props<T>) {
  if (state.status === 'loading') {
    return <p className="muted center">{vi.common.loading}</p>;
  }
  if (state.status === 'error') {
    return (
      <div className="card center">
        <p>
          {vi.common.loadError} ({state.error})
        </p>
        <button type="button" className="btn" onClick={() => window.location.reload()}>
          {vi.common.retry}
        </button>
      </div>
    );
  }
  return <>{children(state.items)}</>;
}
