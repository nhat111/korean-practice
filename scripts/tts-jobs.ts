// Prints the list of sentences to synthesize as JSON: [{ key, text }].
// Usage: node scripts/tts-jobs.ts > tts-jobs.json (then scripts/tts.py).
import { readFileSync } from 'node:fs';
import { audioKey, spokenTexts } from '../src/speaking/audioKey.ts';

const load = (name: string) => JSON.parse(readFileSync(`public/data/${name}.json`, 'utf8')).items;

const texts = spokenTexts({
  scenarios: load('scenarios'),
  vocab: load('vocab'),
  emails: load('emails'),
  songs: load('songs'),
});
const jobs = new Map(texts.map((text) => [audioKey(text), text]));
process.stdout.write(JSON.stringify([...jobs].map(([key, text]) => ({ key, text }))));
