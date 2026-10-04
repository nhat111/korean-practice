# Spec: custom interview questions ("Bộ câu hỏi của tôi")

Status: **not implemented**. Agreed scope for a first, minimal version. Read `CLAUDE.md` first.

## Goal

The learner pastes their own interview questions + answers (Korean, optional Vietnamese) and
practises answering them by voice or typing, with the same similarity scoring as the
Speaking page. No backend needed.

## Input format (paste into a textarea)

```
Q: 넥사크로에서 공통 함수는 어떻게 관리하셨어요?
A: 공통 함수는 lib 폴더에 모아서 include해서 사용했습니다.
VI: Tôi gom hàm dùng chung vào thư mục lib rồi include để dùng.
```

- Blocks separated by blank lines; `Q:` and `A:` required, `VI:` optional. Accept lowercase
  prefixes and full-width colons. Multi-line values continue until the next prefix.
- Parse with a pure, unit-tested function (`src/custom/parse.ts`) that returns items + per-block
  errors (Vietnamese messages from `vi.ts`). Show a preview with errors before saving.
- Also: export all items as a `.json` file and import that file (same validation).

## Storage

- New key `kp:custom:v1` in a new module `src/storage/custom.ts` (all localStorage access stays
  in `src/storage/`, try/catch, corrupted data → empty list). Shape:
  `{ version: 1, items: [{ id, q, a, vi?, createdAt }] }`, id = `custom-<random>`.
- Practice results go into progress like other speaking attempts (`saveSpeakingAttempt` with
  `source: 'custom:<id>'`), so history and sync keep working without a migration.
- Optional backend sync is out of scope for v1 (export/import file covers device moves).

## UI

- Entry point: a card/chip at the top of the Scenarios page ("Bộ câu hỏi của tôi"), route
  `/custom` (list + add/import/export/delete) and `/custom/:id` or a sequential practice view.
- Practice: question shown and read aloud (`speakKorean`), answer via voice or text. Reuse
  `useSpeechRecognition` / the recording fallback (`VoiceAnswer` pattern) and `compareAnswer`
  for score + highlighting, then show and play the model answer.
- Filter "chưa thuộc" (best score < `PASS_SCORE`) to review weak questions.
- No multiple choice (there are no distractors).

## Known limits (tell the user in the UI where relevant)

- Custom text has no natural-voice MP3 (those are generated at build time), so it is read by
  the device voice (Yuna on iOS). Later option: a backend TTS endpoint.
- The app does not check the learner's Korean. Later option: "AI sửa đáp án" via the existing
  backend AI provider when a backend is configured.

## Done when

`npm run check` passes, parser has unit tests, works offline, 360px layout checked, CLAUDE.md
updated (new key, routes, module).
