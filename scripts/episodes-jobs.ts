// Prints the passive-listening episodes to build as JSON: [{ id, hash, lines: [{ ko, vi, koKey, viKey }] }].
// Usage: node scripts/episodes-jobs.ts > episodes-jobs.json (then scripts/episodes.py).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { EPISODES, episodeLines } from '../src/practice/episodes.ts';
import { audioKey } from '../src/speaking/audioKey.ts';

const load = (name: string) => JSON.parse(readFileSync(`public/data/${name}.json`, 'utf8')).items;
const content = { shadowing: load('shadowing'), grammar: load('grammar') };

// Bump when the episode layout (pauses, order of voices) changes, so every episode is rebuilt.
const LAYOUT = 'ko-pause-ko-vi-1';

const jobs = EPISODES.map((spec) => {
  const lines = episodeLines(spec, content).map((l) => ({ ...l, koKey: audioKey(l.ko), viKey: audioKey(l.vi) }));
  const hash = createHash('sha256').update(LAYOUT).update(JSON.stringify(lines)).digest('hex').slice(0, 16);
  return { id: spec.id, hash, lines };
});
process.stdout.write(JSON.stringify(jobs));
