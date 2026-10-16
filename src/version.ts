/** The build named by a dist/version.json body (written by vite.config.ts), or null when it isn't one. */
export function parseVersion(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const { version } = body as Record<string, unknown>;
  return typeof version === 'string' && version !== '' ? version : null;
}
