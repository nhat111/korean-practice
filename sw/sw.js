// Service worker template. `vite.config.ts` (pwaPlugin) replaces the two
// placeholders at build time and writes the result to dist/sw.js.
//
// Strategy:
// - Install: precache every built file (app shell, JSON content, icons) into a
//   cache named after the build version, so the whole app works offline.
// - Navigations: network first (fresh deploys show up), cached index.html offline.
// - Everything else that was precached: cache first.
// - /audio/*.mp3: cache on first use (AUDIO_CACHE survives new versions),
//   from this origin or from AUDIO_BASE (GitHub Pages in production).
// - Activate: delete caches from older builds.

const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const CACHE = `kp-${VERSION}`;
const NAV_TIMEOUT_MS = 3000;
// Natural-voice MP3s (public/audio) are too many to precache; they are cached
// on first play and kept across versions (file names are text hashes).
const AUDIO_CACHE = 'kp-audio-v1';
// Passive-listening episodes saved by the page ("Tải về"); played from there, never fetched here.
const EPISODE_CACHE = 'kp-episodes-v1';
// Where production MP3s live ('' = this origin). Files cached when they were
// served from this origin are still found: see handleAudio.
const AUDIO_BASE = '__AUDIO_BASE__';
// Second host the app falls back to (jsDelivr); '' = none.
const AUDIO_FALLBACK = '__AUDIO_FALLBACK__';
const AUDIO_HOSTS = [AUDIO_BASE, AUDIO_FALLBACK].filter((b) => b !== '');

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
        Promise.all(keys.filter((k) => k.startsWith('kp-') && k !== CACHE && k !== AUDIO_CACHE && k !== EPISODE_CACHE).map((k) => caches.delete(k))),
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

/** The `/audio/...` path of an MP3 URL, wherever it is hosted; null when it is not one. */
function audioPath(url) {
  if (url.origin === self.location.origin) return url.pathname.startsWith('/audio/') ? url.pathname : null;
  const host = AUDIO_HOSTS.find((b) => url.href.startsWith(`${b}/audio/`));
  return host === undefined ? null : url.href.slice(host.length);
}

async function handleAudio(request, path) {
  const cache = await caches.open(AUDIO_CACHE);
  // Before the move to GitHub Pages the same file was cached under this
  // origin; its name is a hash of the text, so that copy is still right.
  // The same file may also be cached from the other host (names are text hashes).
  let cached = (await cache.match(request)) ?? (await cache.match(path));
  for (const host of AUDIO_HOSTS) cached ??= await cache.match(host + path);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const audio = request.mode === 'navigate' ? null : audioPath(url);
  // Long episodes stream with Range requests (206), which the audio cache cannot store.
  if (audio !== null && audio.startsWith('/audio/episodes/')) return;
  if (audio !== null) {
    event.respondWith(handleAudio(request, audio));
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
  } else if (PRECACHE.includes(url.pathname)) {
    event.respondWith(handleAsset(request));
  }
});
