/** Commit + build time, injected by vite.config.ts. */
declare const __APP_VERSION__: string;
/** Production origin without a trailing slash (VITE_SITE_URL), injected by vite.config.ts. */
declare const __SITE_URL__: string;
/**
 * Where the natural-voice MP3s are served from, without a trailing slash: the
 * GitHub Pages site in production builds, '' (this origin, public/audio) in dev.
 * Injected by vite.config.ts; see VITE_AUDIO_BASE_URL there.
 */
declare const __AUDIO_BASE__: string;
/** Second audio host tried when the first fails (jsDelivr in production); '' = none. */
declare const __AUDIO_FALLBACK__: string;
