import { useSyncExternalStore } from 'react';

// Set once a new service worker takes over a page that already had one, i.e.
// a deploy landed while the app was open. The page still runs the old bundle
// and may show old content until it reloads.
let updateReady = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** True when a newer version is active and a reload would show it. */
export function useUpdateReady(): boolean {
  return useSyncExternalStore(subscribe, () => updateReady);
}

// Registers the service worker in production builds only (dev uses Vite's
// own server; a service worker there would serve stale modules).
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  // On a first visit there is no controller; that takeover is not an update.
  const hadController = navigator.serviceWorker.controller !== null;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || updateReady) return;
    updateReady = true;
    listeners.forEach((l) => l());
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Installed PWAs are often resumed rather than reopened, so look for a
        // new deploy whenever the app comes back to the foreground.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => undefined);
        });
      })
      .catch((e: unknown) => {
        console.warn('[sw] registration failed', e);
      });
  });
}
