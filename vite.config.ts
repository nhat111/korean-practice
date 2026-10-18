import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { execSync } from 'node:child_process'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { vi } from './src/i18n/vi.ts'
import { buildReminderIcs, DEFAULT_SITE_URL, REMINDER_MINUTES, reminderIcsPath, REMINDER_TIMES } from './src/practice/reminder.ts'

/** Recursively lists files under `dir`. */
function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? listFiles(join(dir, e.name)) : [join(dir, e.name)],
  )
}

/**
 * Where production builds load the natural-voice MP3s from: the GitHub Pages
 * site that `.github/workflows/audio-pages.yml` publishes public/audio to.
 * They are ~140 MB; kept out of every Vercel deployment, which stores each
 * deployment's whole output (Deployment Storage, 10 GB on the free plan).
 */
const PAGES_AUDIO_BASE = 'https://nhat111.github.io/korean-practice'

/**
 * The same files through jsDelivr (straight from the repo), tried when Pages
 * fails: some company networks block *.github.io but not this CDN.
 */
const CDN_AUDIO_BASE = 'https://cdn.jsdelivr.net/gh/nhat111/korean-practice@master/public'

/**
 * VITE_AUDIO_BASE_URL overrides it; set it to an empty value to serve the
 * MP3s from this origin again (dist/audio is then kept). Dev always uses
 * this origin, where public/audio is served as is.
 */
function audioBase(command: string, env: Record<string, string>): string {
  const raw = env.VITE_AUDIO_BASE_URL
  if (raw !== undefined) return raw.trim().replace(/\/+$/, '')
  return command === 'build' ? PAGES_AUDIO_BASE : ''
}

/**
 * Generates dist/sw.js from sw/sw.js after the build: injects the list of
 * files to precache and a version hash of their contents, so every deploy
 * with changed files installs a fresh service worker. With the MP3s hosted
 * elsewhere it also drops the copy of public/audio Vite put in dist.
 */
function pwaPlugin(audio: string, fallback: string, build: string): Plugin {
  let root = process.cwd()
  let outDir = 'dist'
  return {
    name: 'kp-service-worker',
    apply: 'build',
    // Open the connection to the audio host early: the first MP3 then starts sooner after a tap.
    transformIndexHtml() {
      if (!audio.startsWith('http')) return []
      return [{ tag: 'link', attrs: { rel: 'preconnect', href: new URL(audio).origin, crossorigin: '' }, injectTo: 'head' }]
    },
    configResolved(config) {
      root = config.root
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      if (audio !== '') rmSync(join(outDir, 'audio'), { recursive: true, force: true })
      const files = listFiles(outDir)
        .map((f) => relative(outDir, f).split(sep).join('/'))
        .filter((f) => f !== 'sw.js' && f !== 'version.json' && !f.endsWith('.map') && !f.startsWith('audio/') && !f.startsWith('reminder/'))
        .sort()
      const hash = createHash('sha256')
      for (const f of files) hash.update(f).update(readFileSync(join(outDir, f)))
      const version = hash.digest('hex').slice(0, 12)
      const precache = files.map((f) => `/${f}`)
      const sw = readFileSync(resolve(root, 'sw/sw.js'), 'utf8')
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(precache))
        .replace('__AUDIO_BASE__', audio)
        .replace('__AUDIO_FALLBACK__', fallback)
      writeFileSync(join(outDir, 'sw.js'), sw)
      // Read (never cached) by the running app to tell that a newer deploy is live: src/registerSW.ts.
      writeFileSync(join(outDir, 'version.json'), JSON.stringify({ version: build }))
      console.log(`sw.js: ${precache.length} files precached, version ${version}, audio from ${audio || 'this origin'}`)
    },
  }
}

/**
 * Daily reminder calendar files (src/practice/reminder.ts), one per time at
 * /reminder/HHMM.ics. Static files, not blobs: iOS Safari only offers "Add to
 * Calendar" for a real text/calendar response. Served in dev too.
 */
function reminderPlugin(site: string): Plugin {
  const text = { title: vi.reminder.eventTitle, details: vi.reminder.eventDetails }
  const files = new Map(REMINDER_TIMES.map((t) => [reminderIcsPath(t), buildReminderIcs(t, REMINDER_MINUTES, text, site)]))
  return {
    name: 'kp-reminder',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const body = files.get((req.url ?? '').split('?')[0])
        if (body === undefined) return next()
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
        res.end(body)
      })
    },
    generateBundle() {
      for (const [path, source] of files) this.emitFile({ type: 'asset', fileName: path.slice(1), source })
    },
  }
}

/**
 * Public address of the production site, without a trailing slash: the link in
 * the reminder files, the Open Graph tags and the share image. Set
 * VITE_SITE_URL to override; unset uses DEFAULT_SITE_URL (kodevtalk.nhatlab.com).
 */
function siteUrl(env: Record<string, string>): string {
  const raw = (env.VITE_SITE_URL ?? '').trim().replace(/\/+$/, '')
  if (raw === '') return DEFAULT_SITE_URL
  if (!/^https?:\/\/[^/]+$/.test(raw)) throw new Error(`VITE_SITE_URL must be an origin like https://example.com, got "${raw}"`)
  return raw
}

/** Fills %SITE_URL% in index.html (absolute Open Graph URLs). */
function siteUrlPlugin(site: string): Plugin {
  return {
    name: 'kp-site-url',
    transformIndexHtml: { order: 'pre', handler: (html) => html.replaceAll('%SITE_URL%', site) },
  }
}

// Shown in Settings so the learner can tell which deploy is running.
function appVersion(): string {
  let sha = process.env.VERCEL_GIT_COMMIT_SHA ?? ''
  if (!sha) {
    try {
      sha = execSync('git rev-parse HEAD').toString().trim()
    } catch {
      sha = 'dev'
    }
  }
  const date = new Date().toISOString().slice(0, 16).replace('T', ' ')
  return `${sha.slice(0, 7)} · ${date} UTC`
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // loadEnv reads .env files and the process env (Vercel's project variables).
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const audio = audioBase(command, env)
  const site = siteUrl(env)
  const fallback = audio === PAGES_AUDIO_BASE ? CDN_AUDIO_BASE : ''
  // One value for the bundle and dist/version.json, so they compare equal.
  const build = appVersion()
  return {
    plugins: [react(), siteUrlPlugin(site), reminderPlugin(site), pwaPlugin(audio, fallback, build)],
    define: { __APP_VERSION__: JSON.stringify(build), __SITE_URL__: JSON.stringify(site), __AUDIO_BASE__: JSON.stringify(audio), __AUDIO_FALLBACK__: JSON.stringify(fallback) },
  }
})
