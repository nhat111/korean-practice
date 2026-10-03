import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { execSync } from 'node:child_process'
import { defineConfig, type Plugin } from 'vite'

/** Recursively lists files under `dir`. */
function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? listFiles(join(dir, e.name)) : [join(dir, e.name)],
  )
}

/**
 * Generates dist/sw.js from sw/sw.js after the build: injects the list of
 * files to precache and a version hash of their contents, so every deploy
 * with changed files installs a fresh service worker.
 */
function pwaPlugin(): Plugin {
  let root = process.cwd()
  let outDir = 'dist'
  return {
    name: 'kp-service-worker',
    apply: 'build',
    configResolved(config) {
      root = config.root
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
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
      writeFileSync(join(outDir, 'sw.js'), sw)
      console.log(`sw.js: ${precache.length} files precached, version ${version}`)
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
export default defineConfig({
  plugins: [react(), pwaPlugin()],
  define: { __APP_VERSION__: JSON.stringify(appVersion()) },
})
