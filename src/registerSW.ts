import { useSyncExternalStore } from 'react';
import { parseVersion } from './version';

// Set once a newer deploy is known: a new service worker took over a page that
// already had one, or /version.json names another build than this bundle. The
// page still runs the old bundle and may show old content until it reloads.
let updateReady = false;
const listeners = new Set<() => void>();

function markUpdateReady(): void {
  if (updateReady) return;
  updateReady = true;
  listeners.forEach((l) => l());
}

/** The deployed build (dist/version.json, never cached), or null when offline or unknown. */
async function deployedVersion(): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch('/version.json', { cache: 'no-store', signal: controller.signal });
    return res.ok ? parseVersion(await res.json()) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Asks the server which build is live. The service worker alone can miss it:
 * no banner after a hard reload (no controller) or when the worker had already
 * updated in the background.
 */
async function compareWithDeployed(reg: ServiceWorkerRegistration | undefined): Promise<boolean> {
  const latest = await deployedVersion();
  if (latest === null || latest === __APP_VERSION__) return false;
  // Let the new worker precache the new files before the learner reloads.
  await reg?.update().catch(() => undefined);
  markUpdateReady();
  return true;
}

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
    if (!hadController) return;
    // A reload may already have loaded the new bundle before its worker took
    // over; only ask for another reload when this build is not the live one.
    void deployedVersion().then((v) => {
      if (v === null || v !== __APP_VERSION__) markUpdateReady();
    });
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        void compareWithDeployed(reg);
        // Installed PWAs are often resumed rather than reopened, so look for a
        // new deploy whenever the app comes back to the foreground.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState !== 'visible') return;
          reg.update().catch(() => undefined);
          void compareWithDeployed(reg);
        });
      })
      .catch((e: unknown) => {
        console.warn('[sw] registration failed', e);
      });
  });
}

export type UpdateCheck = 'reloading' | 'latest' | 'unavailable';

/**
 * Manual "check for updates": asks the browser to fetch sw.js now and, if a
 * new version installs, reloads into it.
 */
export async function checkForUpdate(): Promise<UpdateCheck> {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return 'unavailable';
  const reg = await navigator.serviceWorker.getRegistration();
  await reg?.update().catch(() => undefined);
  const incoming = reg?.installing ?? reg?.waiting;
  if (!incoming) {
    // The worker may already be current while this page still runs an older bundle.
    if (await compareWithDeployed(reg)) {
      window.location.reload();
      return 'reloading';
    }
    return reg ? 'latest' : 'unavailable';
  }
  // sw.js calls skipWaiting(), so the new worker takes over on its own.
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 15000);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
  window.location.reload();
  return 'reloading';
}
