// The app lives at its own domain once VITE_SITE_URL is set, but progress is in
// localStorage, which belongs to one origin. Learners who keep opening the old
// kodevtalk.vercel.app address (bookmark, Home Screen icon) are told where the
// app moved and how to carry their progress over with the backup file.

/** The address the app was first published at. */
export const LEGACY_HOST = 'kodevtalk.vercel.app';

/**
 * The new host to point to when this page runs on the legacy address and the
 * production site has moved elsewhere; null otherwise (new domain, preview
 * deploys, localhost, or no move yet).
 */
export function movedTo(currentHost: string, siteUrl: string): string | null {
  if (currentHost !== LEGACY_HOST) return null;
  const target = new URL(siteUrl).host;
  return target === LEGACY_HOST ? null : target;
}
