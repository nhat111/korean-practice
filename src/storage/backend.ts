// Optional backend settings, in their own key so existing progress/prefs keys
// are untouched. With no URL (the default) the app never calls a backend.

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'kp:backend:v1';

export interface BackendSettings {
  /** Base URL without trailing slash, e.g. https://xyz.onrender.com. Empty = disabled. */
  url: string;
  /** Sent as X-Access-Key when the server requires it. */
  accessKey: string;
}

export function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/** Build-time default, used until the learner saves settings on this device. */
function envDefault(): BackendSettings {
  const url = import.meta.env.VITE_API_BASE_URL;
  return { url: typeof url === 'string' ? normalizeUrl(url) : '', accessKey: '' };
}

function read(): BackendSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return envDefault();
    const data: unknown = JSON.parse(raw);
    if (typeof data === 'object' && data !== null) {
      const { url, accessKey } = data as Record<string, unknown>;
      return {
        url: typeof url === 'string' ? normalizeUrl(url) : '',
        accessKey: typeof accessKey === 'string' ? accessKey : '',
      };
    }
  } catch {
    // Fall through to the default.
  }
  return envDefault();
}

let current: BackendSettings = read();
const listeners = new Set<() => void>();

export function getBackendSettings(): BackendSettings {
  return current;
}

export function setBackendSettings(settings: BackendSettings): void {
  current = { url: normalizeUrl(settings.url), accessKey: settings.accessKey.trim() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Keep the in-memory value for this session.
  }
  listeners.forEach((l) => l());
}

export function useBackendSettings(): BackendSettings {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}

export function isBackendConfigured(s: BackendSettings = current): boolean {
  return s.url !== '';
}
