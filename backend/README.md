# Backend (optional, Phase 2)

A Spring Boot 3 (Java 21) service that adds AI features and progress sync to the static
app. **The frontend never depends on it.** Without a configured backend URL the app runs
exactly as in Phase 1, and if the server is asleep or unreachable the app shows a notice
and keeps working from local data.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Status, AI provider, whether an access key is required. Always open (no key) so the app can detect and wake the server. |
| POST | `/api/roleplay` | Free conversation with a Korean client at TOPIK 3-4 level. Returns `reply`, `replyVi`, `corrections[]`, `naturalVersion`, `explanationVi`. |
| POST | `/api/email/check` | Checks a Korean email or message. Returns `corrected`, `corrections[]`, `explanationVi`, `score`. |
| GET | `/api/progress` | Last uploaded progress snapshot (`404` if none). |
| PUT | `/api/progress` | Stores `{ "progress": <kp:progress:v1 object> }`. |

Errors are returned as `{ "error": code, "message": text }`:

- `unauthorized` (401)
- `bad_request` (400)
- `ai_disabled` (503)
- `ai_failed` (502)
- `too_large` (413)

Request examples:

```bash
curl -s localhost:8080/api/health

curl -s localhost:8080/api/roleplay -H 'Content-Type: application/json' \
  -d '{"scenario":"로그인 기능 진행 상황 보고","history":[],"message":""}'      # client opens

curl -s localhost:8080/api/roleplay -H 'Content-Type: application/json' \
  -d '{"history":[{"role":"client","text":"진행 상황이 어떻게 되나요?"}],"message":"거의 다 했어요"}'

curl -s localhost:8080/api/email/check -H 'Content-Type: application/json' \
  -d '{"text":"김 팀장님, 안녕?\n확인 부탁해.","politeness":"hasipsio"}'
```

Add `-H 'X-Access-Key: …'` when `APP_ACCESS_KEY` is set.

## AI providers

`AiProvider` has three implementations, selected with `AI_PROVIDER`:

| `AI_PROVIDER` | Implementation | Needs |
| --- | --- | --- |
| `none` (default) | `NoAiProvider`: AI endpoints return 503; progress sync still works | nothing |
| `claude` | `ClaudeProvider`: official Anthropic Java SDK, structured outputs (JSON schema derived from the response records) | `ANTHROPIC_API_KEY` |
| `ollama` | `OllamaProvider`: `POST {OLLAMA_BASE_URL}/api/chat` in JSON mode | a running Ollama with the model pulled |

- **Claude** uses `claude-opus-5-5` with effort `medium` by default (override with
  `CLAUDE_MODEL` / `CLAUDE_EFFORT`). Requests opt into server-side refusal fallbacks
  (`fallbacks: "default"`): if a safety classifier declines a request, the API retries it
  on a suitable fallback model within the same call. If the whole chain refuses, the
  endpoint returns `ai_failed`.
- If `AI_PROVIDER=claude` but `ANTHROPIC_API_KEY` is missing, the server still starts with
  AI disabled and logs a warning.
- API keys are read **only** from environment variables. Never put them in
  `application.yml` or commit them.

## Configuration (environment variables)

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `8080` | Render sets this. |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:4173` | Comma-separated. Add your Vercel URL. Wildcards work for preview deploys (`https://korean-practice-*.vercel.app`), and a trailing `/` is ignored. |
| `APP_ACCESS_KEY` | (empty) | Shared secret for every `/api/**` call except health. **Set it on any public URL**, otherwise anyone who finds the URL can spend your AI credits and overwrite your progress. |
| `AI_PROVIDER` | `none` | `none`, `claude` or `ollama`. |
| `ANTHROPIC_API_KEY` | | Needed for `claude`. |
| `CLAUDE_MODEL` | `claude-opus-5-5` | |
| `CLAUDE_EFFORT` | `medium` | `low`, `medium`, `high`, `xhigh` or `max`. Use `low` for faster, cheaper chat. |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | |
| `OLLAMA_MODEL` | `qwen2.5:7b` | Any model that handles Korean reasonably. |
| `AI_TIMEOUT` | `PT90S` | ISO-8601 duration. |
| `PROGRESS_FILE` | `./data/progress.json` | |

## Run locally

```bash
cd backend
./mvnw test                     # unit + integration tests (no API key needed)
./mvnw spring-boot:run          # http://localhost:8080, AI disabled

AI_PROVIDER=claude ANTHROPIC_API_KEY=sk-ant-... ./mvnw spring-boot:run
AI_PROVIDER=ollama OLLAMA_MODEL=qwen2.5:7b ./mvnw spring-boot:run
```

Then run the frontend (`npm run dev`), open **Settings (⚙️)**, and enter
`http://localhost:8080` (plus the access key, if you set one).

## Docker image

`Dockerfile` is a multi-stage build tuned for the free tier (0.1 CPU, 512 MB):

1. **Build stage:** `maven:3.9-eclipse-temurin-21` runs `mvn package`. Dependencies are
   cached in their own layer.
2. **Runtime stage:** `eclipse-temurin:21-jre`, running as a non-root user.
   - The Spring Boot jar is extracted, then a training run creates a **CDS archive** (Class
     Data Sharing). Measured on 1 CPU: ready in ~2.2 s instead of ~7.9 s, with RSS ~184 MB
     instead of ~232 MB. This matters most for cold starts.
   - JVM flags (`JAVA_OPTS`): 60% heap, serial GC, C1-only JIT, small thread stacks, and
     exit on OOM so that Render restarts the service.

```bash
docker build -t korean-practice-backend backend/
docker run --rm -p 8080:8080 -e PORT=8080 korean-practice-backend
```

## Deploy to Render (free tier)

1. Push the repo to GitHub.
2. In Render, go to **New + → Blueprint** and pick the repo. `render.yaml` at the repo root
   defines a Docker web service in **Singapore** (closest to Vietnam/Korea) on the free
   plan, with a health check on `/api/health`. It only redeploys when `backend/**` changes.
3. Fill in the environment variables when prompted:
   - `CORS_ALLOWED_ORIGINS`: your Vercel URL, e.g. `https://kodevtalk.vercel.app` (plus `https://korean-practice-*.vercel.app` for preview deploys)
   - `APP_ACCESS_KEY`: generated automatically; copy it from the dashboard
   - To enable AI, set `AI_PROVIDER=claude` and `ANTHROPIC_API_KEY`
4. After the deploy, open the app → **Settings**, then enter the Render URL and the access
   key.

Free tier caveats:

- **Sleeps after ~15 minutes idle.** The first request takes ~30-60 s while it wakes up.
  The app shows "Đang đánh thức máy chủ…" and stays usable in the meantime.
- **Ephemeral disk.** `progress.json` is lost on every redeploy or restart. Sync is a
  manual backup or transfer, not durable storage. The browser's `localStorage` is always
  the source of truth.
- 512 MB RAM and 0.1 CPU. The Dockerfile caps the heap and uses CDS to start faster, and
  Tomcat is limited to 20 threads.
- An external uptime pinger can keep the service awake, but it uses up the free monthly
  hours. Waking on demand, as the app does now, is usually enough.
