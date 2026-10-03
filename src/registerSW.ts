// Registers the service worker in production builds only (dev uses Vite's
// own server; a service worker there would serve stale modules).
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e: unknown) => {
      console.warn('[sw] registration failed', e);
    });
  });
}
