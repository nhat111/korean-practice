// Service worker template. `vite.config.ts` (pwaPlugin) replaces the two
// placeholders at build time and writes the result to dist/sw.js.
//
// Strategy:
// - Install: precache every built file (app shell, JSON content, icons) into a
//   cache named after the build version, so the whole app works offline.
// - Navigations: network first (fresh deploys show up), cached index.html offline.
// - Everything else that was precached: cache first.
// - /audio/*.mp3: cache on first use (AUDIO_CACHE survives new versions).
// - Activate: delete caches from older builds.

const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const CACHE = `kp-${VERSION}`;
const NAV_TIMEOUT_MS = 3000;
// Natural-voice MP3s (public/audio) are too many to precache; they are cached
// on first play and kept across versions (file names are text hashes).
const AUDIO_CACHE = 'kp-audio-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((p) => new Request(p, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith('kp-') && k !== CACHE && k !== AUDIO_CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}

async function handleNavigation(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await Promise.race([fetch(request), timeout(NAV_TIMEOUT_MS)]);
    if (response.ok) return response;
    throw new Error(`HTTP ${response.status}`);
  } catch {
    // SPA: every route is served by index.html.
    return (await cache.match('/index.html')) ?? Response.error();
  }
}

async function handleAsset(request) {
  const cached = await caches.match(request, { cacheName: CACHE, ignoreSearch: true });
  return cached ?? fetch(request);
}

async function handleAudio(request) {
  const cache = await caches.open(AUDIO_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
  } else if (url.pathname.startsWith('/audio/')) {
    event.respondWith(handleAudio(request));
  } else if (PRECACHE.includes(url.pathname)) {
    event.respondWith(handleAsset(request));
  }
});
