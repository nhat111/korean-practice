import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { execSync } from 'node:child_process'
import { defineConfig, loadEnv, type Plugin } from 'vite'

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
function pwaPlugin(audio: string): Plugin {
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
        .filter((f) => f !== 'sw.js' && !f.endsWith('.map') && !f.startsWith('audio/'))
        .sort()
      const hash = createHash('sha256')
      for (const f of files) hash.update(f).update(readFileSync(join(outDir, f)))
      const version = hash.digest('hex').slice(0, 12)
      const precache = files.map((f) => `/${f}`)
      const sw = readFileSync(resolve(root, 'sw/sw.js'), 'utf8')
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(precache))
        .replace('__AUDIO_BASE__', audio)
      writeFileSync(join(outDir, 'sw.js'), sw)
      console.log(`sw.js: ${precache.length} files precached, version ${version}, audio from ${audio || 'this origin'}`)
    },
  }
}

// https://vite.dev/config/
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
  const audio = audioBase(command, loadEnv(mode, process.cwd(), 'VITE_'))
  return {
    plugins: [react(), pwaPlugin(audio)],
    define: { __APP_VERSION__: JSON.stringify(appVersion()), __AUDIO_BASE__: JSON.stringify(audio) },
  }
})
