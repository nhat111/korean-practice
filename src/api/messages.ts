import { vi } from '../i18n/vi';
import { ApiError } from './client';

/** Vietnamese message for a failed backend call. */
export function apiErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const base = vi.backend.errors[e.kind];
    return e.kind === 'bad_request' || e.kind === 'server' ? `${base}: ${e.message}` : base;
  }
  return vi.backend.errors.server;
}
