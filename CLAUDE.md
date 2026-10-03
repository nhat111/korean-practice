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

## Intended structure

```
/
├── public/data/          # Learning content (JSON), one file per topic/lesson set
├── src/
│   ├── components/       # Reusable UI components
│   ├── pages/            # Route-level screens
│   ├── data/             # Content loading + TypeScript types for the JSON schema
│   ├── storage/          # localStorage access (the only place that touches it)
│   ├── api/              # Phase 2 backend client (optional, with fallback)
│   ├── i18n/vi.ts        # Vietnamese UI strings
│   └── main.tsx
├── backend/              # Phase 2 only: Spring Boot 3, Java 21
├── vercel.json           # SPA rewrites
└── CLAUDE.md
```

## Content (JSON) conventions

- Every JSON file has a matching TypeScript type in `src/data/`. Validate the shape when
  loading (a small hand-written type guard is enough; no need for a schema library unless it
  grows).
- Each item has a stable string `id` (e.g. `"standup-001"`). Progress is keyed by these ids,
  so **never rename or reuse an id** once it ships.
- Typical item fields: `id`, `ko` (Korean), `vi` (Vietnamese meaning), optional `romanization`,
  `note` (usage/politeness note in Vietnamese), `tags`, `level`.
- Include a top-level `version` field in each file so content changes can be detected.
- Korean content must be natural workplace Korean. Pay attention to the politeness level and
  mention it in `note` when it matters.

## localStorage conventions

- All access goes through `src/storage/`. Components never call `localStorage` directly.
- Use a single namespaced key prefix (e.g. `kp:`) and a **schema version** (e.g.
  `kp:progress:v1`). When the shape changes, write a migration instead of silently dropping
  user data.
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

(Fill in once the project is scaffolded. Expected:)

```bash
npm install
npm run dev        # Vite dev server
npm run build      # Type-check + production build
npm run lint
npm run test       # If/when tests are added (Vitest)

# Phase 2
cd backend && ./mvnw spring-boot:run   # or ./gradlew bootRun
```

Run `npm run build` (which type-checks) before considering a frontend change done.

## Deployment

- **Vercel**: framework preset Vite, output `dist/`. `vercel.json` rewrites all routes to
  `index.html` for client-side routing.
- **Render (Phase 2)**: free tier web service from `/backend`. Expect cold starts. Configure
  CORS to allow only the Vercel domain(s) and localhost.
- No secrets in the frontend. Anything `VITE_*` is public.
