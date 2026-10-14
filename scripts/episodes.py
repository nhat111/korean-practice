"""Build the passive-listening episodes ("Nghe thụ động"): one long MP3 each.

Usage:  node scripts/episodes-jobs.ts > episodes-jobs.json && python3 scripts/episodes.py episodes-jobs.json
        (run after scripts/tts.py: it reuses the Korean sentence MP3s in public/audio/male)
Needs:  pip install edge-tts ; ffmpeg

Each sentence becomes: Korean, a pause as long as the sentence (to shadow it),
Korean again, the Vietnamese meaning (Edge TTS, cached in public/audio/vi), a
short pause. One continuous file keeps playing with the phone locked, where a
JavaScript playlist would be suspended. Episodes whose lines (hash) did not
change are kept; public/data/episodes.json lists each episode's duration and
the start time of every line, for the transcript.
"""

import asyncio
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from tts import CONCURRENCY, OUT, compress, synth  # noqa: E402,F401

VI_VOICE = "vi-VN-HoaiMyNeural"
KO_DIR = OUT / "male"
VI_DIR = OUT / "vi"
EP_DIR = OUT / "episodes"
INDEX = Path("public/data/episodes.json")
MIN_PAUSE = 1.5  # seconds to repeat a sentence, at least
KO_TO_VI = 0.6
AFTER_LINE = 1.5


RATE = 24000  # samples per second, mono 16-bit PCM while assembling


def pcm(path: Path, cache: dict) -> bytes:
    """Decoded samples of an MP3. Assembling PCM (not concatenating MP3s) keeps the
    line start times exact: every MP3 adds encoder padding that would drift."""
    if path not in cache:
        cache[path] = subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-i", str(path), "-f", "s16le", "-ac", "1", "-ar", str(RATE), "-"],
            check=True, capture_output=True,
        ).stdout
    return cache[path]


def silence(seconds: float) -> bytes:
    return bytes(2 * int(seconds * RATE))


async def ensure_vi(jobs: list) -> tuple:
    """Synthesizes missing Vietnamese clips; returns (missing, made)."""
    VI_DIR.mkdir(parents=True, exist_ok=True)
    wanted = {l["viKey"]: l["vi"] for j in jobs for l in j["lines"]}
    missing = {k: t for k, t in wanted.items() if not (VI_DIR / f"{k}.mp3").exists()}
    sem = asyncio.Semaphore(CONCURRENCY)
    done: list = []
    await asyncio.gather(*(synth(sem, VI_VOICE, t, VI_DIR / f"{k}.mp3", done) for k, t in missing.items()))
    print(f"vi clips: {len(missing)} to make, {len(done)} made")
    return len(missing), len(done)


def build(job: dict, cache: dict) -> dict:
    audio = bytearray()
    lines: list = []
    for l in job["lines"]:
        ko = KO_DIR / f"{l['koKey']}.mp3"
        vi = VI_DIR / f"{l['viKey']}.mp3"
        if not ko.exists():
            print(f"  skip (no Korean audio): {l['ko']}", file=sys.stderr)
            continue
        lines.append({"ko": l["ko"], "vi": l["vi"], "start": round(len(audio) / 2 / RATE, 2)})
        k = pcm(ko, cache)
        audio += k + silence(max(MIN_PAUSE, len(k) / 2 / RATE)) + k
        if vi.exists():
            audio += silence(KO_TO_VI) + pcm(vi, cache)
        audio += silence(AFTER_LINE)

    EP_DIR.mkdir(parents=True, exist_ok=True)
    out = EP_DIR / f"{job['id']}.mp3"
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-y", "-f", "s16le", "-ac", "1", "-ar", str(RATE), "-i", "-",
         "-c:a", "libmp3lame", "-b:a", "32k", str(out)],
        input=bytes(audio), check=True,
    )
    seconds = round(len(audio) / 2 / RATE, 1)
    print(f"  {job['id']}: {len(lines)} lines, {seconds / 60:.1f} min")
    return {"id": job["id"], "hash": job["hash"], "duration": seconds, "lines": lines}


def main() -> None:
    jobs = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    old = {}
    if INDEX.exists():
        old = {e["id"]: e for e in json.loads(INDEX.read_text(encoding="utf-8")).get("items", [])}
    stale = [j for j in jobs if old.get(j["id"], {}).get("hash") != j["hash"] or not (EP_DIR / f"{j['id']}.mp3").exists()]
    print(f"{len(jobs)} episodes, {len(stale)} to build")
    missing, made = asyncio.run(ensure_vi(stale)) if stale else (0, 0)
    if missing and not made:
        # The endpoint refused us: fail loudly instead of building Korean-only episodes.
        sys.exit("no Vietnamese audio generated")
    cache: dict = {}
    items = [build(j, cache) if j in stale else old[j["id"]] for j in jobs]
    INDEX.write_text(json.dumps({"version": 1, "items": items}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {INDEX}")


if __name__ == "__main__":
    main()
