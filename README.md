# KoDevTalk (Luyện tiếng Hàn IT)

A practice app for Korean IT workplace communication with Korean clients (outsourcing),
built for a Vietnamese Java developer at TOPIK 3. UI in Vietnamese, content in Korean.

- **Scenarios**: scripted client dialogues. Answer by choice, free text or voice.
- **Emails**: fix a Korean email draft, then see the corrections explained.
- **Flashcards**: 200+ IT and workplace words with SM-2 spaced repetition.
- **Speaking**: one shared core (`SpeakPractice`: tap or hold to record with a level meter,
  model / mine / interleaved playback, 0.7x-1x model speed, self-rating into SM-2), used by:
  - **Shadowing** (`shadowing.json`): sentences with their real pronunciation (`pron`,
    e.g. `[화긴해 보겓씀니다]`), a "câu cứu nguy" survival deck and polite cushion phrases;
    show-text or listen-only mode.
  - **Pattern drills** (`patterns.json`): say a frame with new words; particles (은/는, 이/가,
    을/를, 으로/로…) follow the batchim automatically (`src/speaking/josa.ts`).
  - **Scenarios "Tự nói"** with an optional 10-20 s answer countdown, and **speaking
    flashcards** (Vietnamese → say it in Korean).
  - **Luyện 5 phút hôm nay**: 3 shadowing + 3 patterns + 1 survival + 1 scenario turn,
    due items first; streak, lines spoken today and minutes recorded on the home page.
  Long lines can be shadowed part by part, and "Nghe → nói → so sánh" does model → record (auto-stops
  when you go quiet) → playback in one tap.
  **Interpreting** (`/interpret`): BrSE-style, read Vietnamese and say it in Korean, or hear Korean
  and say it in Vietnamese.
  **Listening** (`/listening`): pick the meaning, type what you hear, or catch numbers, dates and
  amounts (`numbers.json`), at natural speed with replay and slow playback.
  Speech recognition is an optional extra (syllable-level highlighting); everything works with
  recording alone, including the iPhone Home Screen app.
- **Progress**: everything is stored in `localStorage` on the device; Settings can export and
  import it as a JSON file (iOS may clear site data).

It is a static React + Vite + TypeScript site. It installs as a PWA and works offline. An
**optional** Spring Boot backend in [`backend/`](backend/README.md) adds free AI
conversation, AI email checking and progress sync. The app works fully without it. See
[CLAUDE.md](CLAUDE.md) for architecture and conventions.

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
| `npm run tts`     | Generate natural-voice MP3s (male InJoon, female SunHi) for new content |

Microphone features need a secure context, which means `localhost` or HTTPS.

## Adding content

Append items to `public/data/scenarios.json`, `emails.json`, `vocab.json`, `shadowing.json`
or `patterns.json` (types are in
`src/types.ts`), then run `npm test`. No code changes are needed. Never rename an existing
`id`, because saved progress is keyed by it. Invalid content fails `npm run check`, so it
can't be deployed by accident.

Then run `npm run tts` to generate the natural male/female voice files for the new
sentences (`pip install edge-tts`, plus `ffmpeg` to compress them). It only creates
missing files and updates `public/data/audio-index.json`; commit `public/audio/` too.
Sentences without a file are read by the device voice instead. Edge TTS is an unofficial
endpoint; behind a TLS-inspecting proxy set `TTS_CA_FILE` to the proxy's CA bundle.

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
  (natural-voice MP3s that were played at least once, otherwise the device's Korean voice).
- Needs a network connection: speech recognition (Chrome sends audio to Google's servers).
  The app shows an error message instead of failing silently.

## Optional backend (Phase 2)

Setup, configuration and Render deployment are in [backend/README.md](backend/README.md).
In short:

1. Deploy `backend/` to Render using `render.yaml` (**New + → Blueprint**). Set
   `CORS_ALLOWED_ORIGINS` to your Vercel URL. Set `AI_PROVIDER=claude` and
   `ANTHROPIC_API_KEY` if you want AI.
2. In the app, open **⚙️ Settings**, then enter the Render URL and the `APP_ACCESS_KEY`.
   Alternatively, set `VITE_API_BASE_URL` in Vercel as the default (see `.env.example`).
   The Settings page overrides it per device.

Environment variables for the backend (set in the Render dashboard; full list in
[backend/README.md](backend/README.md#configuration-environment-variables)):

| Variable | Required | Example / default |
| --- | --- | --- |
| `CORS_ALLOWED_ORIGINS` | yes | `https://kodevtalk.vercel.app,https://korean-practice-*.vercel.app` |
| `APP_ACCESS_KEY` | strongly recommended | generated by the Blueprint; paste it into ⚙️ Settings |
| `AI_PROVIDER` | no | `none` (default), `claude` or `ollama` |
| `ANTHROPIC_API_KEY` | only when `AI_PROVIDER=claude` | `sk-ant-…` (secret, never commit) |
| `CLAUDE_MODEL` / `CLAUDE_EFFORT` | no | `claude-opus-5-5` / `medium` |
| `OLLAMA_BASE_URL` / `OLLAMA_MODEL` | only when `AI_PROVIDER=ollama` | `http://…:11434` / `qwen2.5:7b` |
| `PORT` | set by Render | `10000` |

Frontend (Vercel, optional): `VITE_API_BASE_URL` sets the default backend URL at build time.
It is public, so never put a key in a `VITE_*` variable.

With no URL configured, the app never calls a backend. If the backend is asleep or down,
the app shows a notice and keeps working from local data.

### Troubleshooting

- **No Korean voice**: install a Korean text-to-speech voice in the phone's settings
  (Android: *Settings → Text-to-speech*; iOS: *Settings → Accessibility → Spoken Content
  → Voices*).
- **Microphone blocked**: allow it in the site settings. In the installed app, check the
  app's permissions.
- **Stale version after a deploy**: close every tab and window of the app, then open it
  again. As a last resort, clear the site data. This also deletes local progress.

## Analytics, link previews and feedback

- **Vercel Web Analytics** is built in (`@vercel/analytics`): turn on *Analytics → Web Analytics* in the
  Vercel project to start receiving page views. It uses no cookies and never sends recordings or
  learning content; learners can switch it off in Settings.
- **Link previews** (Facebook, Zalo, KakaoTalk, Slack) use `public/og.jpg` through the Open Graph tags in
  `index.html`. If the site moves to another domain, update `og:url` and `og:image` there.
- **Feedback link**: set `VITE_FEEDBACK_URL` (for example a Google Form URL) in the Vercel project's
  environment variables to show a "Góp ý" link on Home and in Settings.
