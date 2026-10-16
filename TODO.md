# TODO

Next improvements for KoDevTalk, in suggested order. Tick an item and link its PR when it ships.

## 1. Check usage before adding more (no code)

- [ ] After 1–2 weeks of Vercel Web Analytics, look at:
  - how many visitors finish the welcome (`onboarding` event) vs. open Home only;
  - how many finish the daily session (`daily_done`) and come back the next days;
  - which pages get used (`/shadowing`, `/listening`, `/messages`, `/interpret`…).
- [ ] Read the "Báo câu sai" exports from testers and fix the flagged lines (content only, then `npm run tts`).
- [ ] Ask a native speaker (or a BrSE) to review the newer content: `meetings.json`, `messages.json`,
      the BrSE/tester interview scenarios and the `qa` shadowing deck.

If few people come back after day 1, do **3** before **2**.

## 2. AI correction of the learner's own Korean (needs the backend)

Today free answers are only compared with a model, so a correct answer worded differently
looks "wrong".

- [ ] Backend: `POST /api/correct` `{ text, context?, politeness }` → `{ corrected, issues: [{ wrong, right, type, explanationVi }], natural? }`
      using the existing `AiProvider` (structured output like `/api/email/check`).
- [ ] Frontend: one call in `src/api/client.ts`, with timeout and fallback (the app must work without it).
- [ ] Use it in: `/messages` (after "Xem tin nhắn mẫu"), custom questions (`/custom/:id`) and scenario
      "Tự nói" (on the recognized transcript).
- [ ] Owner tasks: deploy `backend/` on Render, set `ANTHROPIC_API_KEY`, `APP_ACCESS_KEY`,
      `CORS_ALLOWED_ORIGINS`; decide a monthly cost cap.

## 3. 4-week learning path for TOPIK 2–3 learners (frontend only)

New learners see many sections and don't know where to start. Reference: the "Bài học hôm nay" lesson
cards on bjtlab.me (cover, "N từ · N câu hỏi · N phút", progress bar, "Bắt đầu").

- [x] A "Lộ trình 4 tuần" card on Home (no new tab), built from existing content:
  - Week 1: greetings, survival lines, cushion words;
  - Week 2: progress reports, schedule and delays;
  - Week 3: bugs, incidents, deploy notices, chat messages;
  - Week 4: meetings (listening "Họp"), interpreting, interviews.
- [x] Each week: a checklist of decks/scenarios with progress from the SRS; the role from the welcome
      reorders it (tester → QA earlier, interview → interview scenarios earlier).
- [x] Store only the chosen start date in `kp:prefs:v1` (additive field).
- [ ] Later: lesson covers/illustrations on the steps (see 4).

## 4. Visual identity (needs design assets)

Reference: NihongoBiz (bjtlab.me) feels polished thanks to a mascot, illustrations and a warm palette.

- [x] Warm background, per-skill icon tones, item counts on the Home cards (PR #21).
- [x] Mascot dropped: the identity is now typographic (코데톡 wordmark + red cursor, Hangul greeting hero).
- [x] Wordmark style across the app: page kickers, flat cards, mono counts, cursor progress bars, welcome logo.
- [x] App icon, favicon and OG image: 톡 + red cursor, 코데톡 link preview.
- [x] Empty states and "done" screens (`StatusPanel`).
- [ ] Small illustrations for the six Home entries and for lessons (once the 4-week path exists).
      Keep them light (SVG or small WebP) so offline caching stays small.
- [ ] Owner task: provide or approve the artwork (designer or AI-generated, with usage rights).

## Later / ideas

- [ ] Natural-voice audio for custom questions (needs backend TTS or on-device generation).
- [x] More meetings (`meetings.json`) with 3 speakers and faster speech for TOPIK 4 (10 → 20; faster speech = the 1.15x listening speed).
- [ ] Listening "Họp" with a "replay one line" step before the questions for TOPIK 2 learners.
- [x] Grammar: one grammar quiz in the daily plan, grammar bar on the Progress page.
- [ ] Grammar: more lessons (next: -아/어도, -(으)ㄹ 만하다, -는 대신(에), -에 따르면, -(으)ㄹ지도 모르다).

## Done

- [x] "Ngữ pháp công sở" (`grammar.json`, 45 lessons in 4 groups with politeness ladder, examples, a typical
      mistake and a quiz in the SRS) replaces the K-pop songs section.
- [x] Home "Mục tiêu hôm nay" (practice turns today / daily target, week dots T2–CN, one start button),
      "Từ của ngày", progress overview (ring + per-skill bars), friendlier empty states.
- [x] "Câu cần luyện lại" resolves chat messages (`message:<id>`) and meetings (`listen:meeting:<id>`);
      keys whose content is gone no longer use one of the 20 slots.
- [x] Daily plan: one chat message per 5 minutes; one meeting in the 10- and 15-minute sessions.
