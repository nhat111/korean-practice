# Luyện tiếng Hàn IT

A practice app for Korean IT workplace communication with Korean clients (outsourcing),
built for a Vietnamese Java developer at TOPIK 3. UI in Vietnamese, content in Korean.

- **Scenarios**: scripted client dialogues. Answer by choice, free text or voice.
- **Emails**: fix a Korean email draft, then see the corrections explained.
- **Flashcards**: 200+ IT and workplace words with SM-2 spaced repetition.
- **Speaking**: shadowing (TTS at 0.7x-1x plus recording) and a pronunciation check
  with speech recognition.
- **Progress**: everything is stored in `localStorage` on the device.

It is a static React + Vite + TypeScript site with no backend. It installs as a PWA and
works offline. See [CLAUDE.md](CLAUDE.md) for architecture and conventions.

## Local development

Requires Node.js 22.12 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Command           | What it does                                               |
| ----------------- | ---------------------------------------------------------- |
| `npm run dev`     | Vite dev server (no service worker)                        |
| `npm test`        | Vitest: SM-2, answer comparison, validation of all content |
| `npm run lint`    | oxlint                                                     |
| `npm run build`   | Type-check and production build into `dist/`, plus `dist/sw.js` |
| `npm run check`   | lint + test + build: the same command Vercel runs           |
| `npm run preview` | Serve `dist/` at http://localhost:4173 (service worker active) |

Microphone features need a secure context, which means `localhost` or HTTPS.

## Adding content

Append items to `public/data/scenarios.json`, `emails.json` or `vocab.json` (types are in
`src/types.ts`), then run `npm test`. No code changes are needed. Never rename an existing
`id`, because saved progress is keyed by it. Invalid content fails `npm run check`, so it
can't be deployed by accident.

## Deploy to Vercel

The repo is ready to deploy as-is. `vercel.json` sets:

- the build command (`npm run check`) and output directory (`dist`)
- SPA rewrites to `index.html` for client-side routes (`/scenarios/...`, `/flashcards`, ...),
  except real files: `/data`, `/assets`, `/icons`, `sw.js` and the manifest
- cache headers: hashed `/assets/*` are immutable, while `sw.js` and the manifest are always
  revalidated so updates reach users
- `Permissions-Policy` that allows the microphone for this site only

### Option A: Vercel dashboard (recommended)

1. Push the repo to GitHub.
2. Go to <https://vercel.com/new>, then **Import** the `korean-practice` repository.
3. Keep the detected settings: Framework **Vite**. Build and output come from
   `vercel.json`, and no environment variables are needed.
4. Click **Deploy**. Every push to the default branch deploys to production, and other
   branches get preview URLs.

### Option B: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel          # first run links the project and creates a preview deployment
vercel --prod   # production deployment
```

### After deploying

1. Open the production URL and check that a deep link such as `/scenarios` loads directly.
2. Install on your phone:
   - **Android (Chrome)**: open the menu (⋮) and choose **Install app** or **Add to Home
     screen**.
   - **iPhone (Safari)**: tap **Share**, then **Add to Home Screen**.
3. Open the app once while online, so every page and all content is cached. After that it
   works offline.

### Updates and offline behaviour

- Each build generates `dist/sw.js` with a list of every built file and a version hash
  (see `pwaPlugin` in `vite.config.ts` and the template in `sw/sw.js`).
- On a new deploy, the new service worker installs in the background, caches the new
  files and deletes the old cache. Users get the new version the next time they open
  the app.
- Page navigations go to the network first (with a 3 s timeout), then fall back to the
  cached app shell. Everything else is served from the cache.
- Works offline: all pages, content, flashcards, progress, recording and text-to-speech
  (if the device has a Korean voice).
- Needs a network connection: speech recognition (Chrome sends audio to Google's servers).
  The app shows an error message instead of failing silently.

### Troubleshooting

- **No Korean voice**: install a Korean text-to-speech voice in the phone's settings
  (Android: *Settings → Text-to-speech*; iOS: *Settings → Accessibility → Spoken Content
  → Voices*).
- **Microphone blocked**: allow it in the site settings. In the installed app, check the
  app's permissions.
- **Stale version after a deploy**: close every tab and window of the app, then open it
  again. As a last resort, clear the site data. This also deletes local progress.
