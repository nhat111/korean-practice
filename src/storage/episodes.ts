// Passive-listening episodes saved for offline use ("Tải về"), in the Cache API.
// Kept by the service worker (kp-episodes-v1) across app versions.

const CACHE = 'kp-episodes-v1';

const supported = () => typeof window !== 'undefined' && 'caches' in window;

/** Object URL of a saved episode, or null when it is not saved (or storage is unavailable). */
export async function savedEpisodeUrl(key: string): Promise<string | null> {
  if (!supported()) return null;
  try {
    const res = await (await caches.open(CACHE)).match(key);
    return res ? URL.createObjectURL(await res.blob()) : null;
  } catch {
    return null;
  }
}

/** Downloads the first URL that answers with audio and saves it under `key`. */
export async function saveEpisode(key: string, urls: string[]): Promise<boolean> {
  if (!supported()) return false;
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('audio/')) continue;
      await (await caches.open(CACHE)).put(key, res);
      return true;
    } catch {
      // try the next host
    }
  }
  return false;
}

export async function removeEpisode(key: string): Promise<void> {
  if (!supported()) return;
  try {
    await (await caches.open(CACHE)).delete(key);
  } catch {
    // nothing saved, or storage unavailable
  }
}
