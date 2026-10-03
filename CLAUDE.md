# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project purpose

A practice app for one learner: a **Vietnamese Java developer at TOPIK level 3** who works
in outsourcing and needs to communicate with **Korean clients** in an IT workplace.

Content should target realistic situations, for example:
- Daily stand-ups, progress reports, and explaining delays (진행 상황 보고, 일정 지연 설명)
- Clarifying requirements and specs (요구사항 확인)
- Bug reports, incident handling, and deploy notices (버그, 장애 대응, 배포 공지)
- Code review and technical explanation (Java, Spring, DB, API terms)
- Email, Slack/KakaoWork messages, and meeting phrases
- Appropriate politeness levels (하십시오체 / 해요체) and business honorifics

The difficulty should sit at TOPIK 3–4: build from intermediate grammar toward natural business
Korean. Don't assume beginner-level explanations are needed, and don't use advanced literary
Korean either.

## Language rules

- **All UI text is in Vietnamese** (buttons, labels, instructions, feedback, error messages).
- **All learning content is in Korean** (phrases, dialogues, example sentences).
- Translations and explanations of the content are in Vietnamese. English IT terms may appear
  where Koreans actually use them (e.g. 배포, 커밋, 머지, PR).
- Keep UI strings in one place (e.g. `src/i18n/vi.ts`). Don't scatter literal strings across
  components.
- Code, identifiers, comments, and commit messages are in English.

## Phases

### Phase 1 (current): static frontend only
- **React + Vite + TypeScript**, no backend.
- Content lives in **JSON files under `public/data/`** and is fetched at runtime with `fetch`.
- User progress is stored in **`localStorage`**.
- Deployed to **Vercel** as a static site.

### Phase 2 (optional): backend
- **Spring Boot 3 on Java 21**, in `/backend`, deployed on **Render free tier**.
- Likely uses: progress sync across devices and possibly answer checking or content APIs.
- **Hard rule: the frontend must always work without the backend.** The backend only adds
  to the app and is never required:
  - JSON + localStorage stay the source of truth for offline/standalone use.
  - All backend calls go through one API module, with a short timeout and a silent fallback
    to local data. Render free tier cold starts can take 30s or more, so never block the UI
    waiting on it.
  - The backend URL comes from an env var (`VITE_API_BASE_URL`). If it is unset, the app runs
    without any backend calls.
- Don't add backend code or dependencies until Phase 2 is explicitly started.

## Structure

```
/
├── public/data/          # Learning content: scenarios.json, emails.json, vocab.json
├── src/
│   ├── types.ts          # Content types (Scenario, EmailExercise, VocabItem)
│   ├── components/       # Layout, SpeakButton, ContentGate, SpeakingDrill, VoiceAnswer, ...
│   ├── pages/            # Home, Scenarios(+Player), Emails(+Exercise), Flashcards, Speaking, Progress
│   ├── data/             # validate.ts (runtime checks), content.ts (fetch + useContent)
│   ├── storage/          # progress.ts + prefs.ts: the only modules that touch localStorage
│   ├── srs/sm2.ts        # SM-2 spaced repetition
│   ├── speech.ts         # SpeechSynthesis (ko-KR), rate from prefs (0.7x-1x)
│   ├── speaking/         # compare.ts (answer similarity), recognition.ts, recorder.ts
│   ├── i18n/vi.ts        # Vietnamese UI strings
│   └── main.tsx, App.tsx # Router setup (react-router, BrowserRouter)
├── backend/              # Phase 2 only: Spring Boot 3, Java 21
├── public/manifest.webmanifest, public/icons/   # PWA manifest + icons
├── sw/sw.js              # Service worker template (built into dist/sw.js by vite.config.ts)
├── vercel.json           # Build command, SPA rewrites, cache headers
├── README.md             # Setup + deploy steps
└── CLAUDE.md
```

## Content (JSON) conventions

- Each file is `{ "version": 1, "items": [...] }`. Item types live in `src/types.ts`; the
  hand-written runtime checks in `src/data/validate.ts` must mirror them. When a type changes,
  update both.
- **Adding content needs no code changes**: append items to the JSON file and run `npm test`
  (`src/data/content.test.ts` validates every file, unique ids, and for emails that each
  `corrections[].wrong` is an exact substring of `draft`). At runtime, invalid items are
  skipped with a console warning instead of breaking the app.
- Scenario turns have 2-3 choices with exactly one `correct: true`; vary its position.
- Vocab `tags` are lowercase English (e.g. `dev`, `db`, `deploy`, `pm`, `meeting`, `email`);
  the flashcard tag filter is built from them. Tech vocab ids start with `t-`, workplace
  vocab with `w-`. No duplicate `ko` values.
- Each item has a stable string `id` (e.g. `"standup-001"`). Progress is keyed by these ids,
  so **never rename or reuse an id** once it ships.
- Typical item fields: `id`, `ko` (Korean), `vi` (Vietnamese meaning), optional `romanization`,
  `note` (usage/politeness note in Vietnamese), `tags`, `level`.
- Include a top-level `version` field in each file so content changes can be detected.
- Korean content must be natural workplace Korean. Pay attention to the politeness level and
  mention it in `note` when it matters.

## Speaking practice

- All browser speech features are optional. Always feature-detect (`isSpeechSupported`,
  `isRecordingSupported`, `isRecognitionSupported`) and keep a fallback:
  no SpeechRecognition (e.g. Firefox) → record with MediaRecorder + self-assessment.
- Recordings are in-memory object URLs only (never stored); speaking *history* (text, score,
  self-rating) is stored in progress, capped at 300 entries.
- `compareAnswer` in `src/speaking/compare.ts` is pure and unit-tested: score is a
  character-level similarity (ignores spaces/punctuation), highlighting is per 어절.
- Chromium headless has no mic or recognition: browser tests use
  `--use-fake-device-for-media-stream` and mock `webkitSpeechRecognition`/`speechSynthesis`.

## localStorage conventions

- All access goes through `src/storage/`. Components never call `localStorage` directly.
- Use a single namespaced key prefix (`kp:`) and a **schema version**. Keys:
  `kp:progress:v1` (learning progress) and `kp:prefs:v1` (device preferences such as speech
  rate). When the shape changes, write a migration instead of silently dropping user data;
  purely additive fields may instead default when missing (as `speaking` does).
- Wrap reads and writes in try/catch. The app must still work if storage is unavailable or
  contains corrupted data. In that case, fall back to empty progress.

## Code style

- **Simple and well-typed.** TypeScript `strict` mode on. No `any`; use `unknown` and narrow.
- Prefer plain React (hooks + context) over state libraries. Add a dependency only when it
  clearly pays for itself.
- Small, focused components. Prefer function components and named exports.
- No premature abstraction: this is a personal learning tool, not a platform.

## UI / mobile

- **Mobile-first.** The main use is practicing on a phone. Design for ~360px width first,
  then scale up.
- Touch targets are at least 44px. No hover-only interactions.
- Use a font stack that renders Hangul well (e.g. `"Pretendard", "Noto Sans KR", system-ui`)
  and also covers Vietnamese diacritics.
- Respect `prefers-color-scheme` and `prefers-reduced-motion`.

## Commands

```bash
npm install
npm run dev        # Vite dev server
npm run build      # Type-check (tsc -b) + production build
npm run lint       # oxlint
npm test           # Vitest: SM-2, answer comparison, content validation
npm run check      # lint + test + build (Vercel's build command)

# Phase 2
cd backend && ./mvnw spring-boot:run   # or ./gradlew bootRun
```

Run `npm run check` before considering a change done.

Test files (`src/**/*.test.ts`) are type-checked by `tsconfig.node.json`, not
`tsconfig.app.json`.

## Deployment

- **Vercel**: `vercel.json` runs `npm run check` (so invalid content blocks a deploy),
  outputs `dist/`, rewrites client-side routes to `index.html` (not real files like `/data`,
  `/assets`, `/icons`, `sw.js`) and sets cache headers. Deploy steps are in README.md.
- **PWA / offline**: `pwaPlugin` in `vite.config.ts` writes `dist/sw.js` after each build
  with every built file in the precache list and a content-hash version. Navigations are
  network-first with an offline fallback to `index.html`, and other precached files are
  cache-first. The service worker is registered only in production builds
  (`src/registerSW.ts`). When adding new static file types or top-level public folders,
  update the rewrite exclusions in `vercel.json`.
- **Render (Phase 2)**: free tier web service from `/backend`. Expect cold starts. Configure
  CORS to allow only the Vercel domain(s) and localhost.
- No secrets in the frontend. Anything `VITE_*` is public.
