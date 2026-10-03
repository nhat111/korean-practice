"""Generate natural-voice MP3s for every sentence in the app (Edge TTS).

Usage:  npm run tts            (= node scripts/tts-jobs.ts > tts-jobs.json; python3 scripts/tts.py tts-jobs.json)
Needs:  pip install edge-tts ; ffmpeg (optional, re-encodes to 24 kbps to keep the repo small)

Existing files are skipped, so after adding content only new sentences are
synthesized, and public/data/audio-index.json lists the files that exist.
--prune deletes files no longer referenced by any sentence.
Edge TTS is an unofficial endpoint: if it stops working, the app falls back
to the device voice for any missing file.
Behind a TLS-inspecting proxy, set TTS_CA_FILE to its CA bundle.
"""

import asyncio
import json
import os
import shutil
import ssl
import subprocess
import sys
import tempfile
from pathlib import Path

import edge_tts
import edge_tts.communicate as communicate

VOICES = {"male": "ko-KR-InJoonNeural", "female": "ko-KR-SunHiNeural"}  # keep in sync with audioKey.ts
OUT = Path("public/audio")
INDEX = Path("public/data/audio-index.json")  # lets the app skip sentences without a file
CONCURRENCY = 12

if os.environ.get("TTS_CA_FILE"):
    communicate._SSL_CTX = ssl.create_default_context(cafile=os.environ["TTS_CA_FILE"])
PROXY = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
FFMPEG = shutil.which("ffmpeg")


def compress(src: Path, dst: Path) -> None:
    if not FFMPEG:
        src.replace(dst)
        return
    subprocess.run(
        [FFMPEG, "-loglevel", "error", "-y", "-i", str(src), "-ac", "1", "-ar", "24000", "-b:a", "24k", str(dst)],
        check=True,
    )
    src.unlink()


async def synth(sem: asyncio.Semaphore, voice: str, text: str, dst: Path, done: list) -> None:
    async with sem:
        # Temp file outside public/ so a concurrent `vite build` never sees it.
        tmp = Path(tempfile.gettempdir()) / f"kp-tts-{dst.parent.name}-{dst.name}"
        for attempt in range(4):
            try:
                await edge_tts.Communicate(text, voice, proxy=PROXY).save(str(tmp))
                compress(tmp, dst)
                break
            except Exception as e:  # network hiccups: retry with backoff
                if attempt == 3:
                    print(f"FAILED {dst.name}: {e}", file=sys.stderr)
                    tmp.unlink(missing_ok=True)
                    return
                await asyncio.sleep(2 ** attempt)
        done.append(dst)
        if len(done) % 50 == 0:
            print(f"  {len(done)} files", flush=True)


async def main() -> None:
    jobs = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    sem = asyncio.Semaphore(CONCURRENCY)
    done: list = []
    tasks = []
    for name, voice in VOICES.items():
        folder = OUT / name
        folder.mkdir(parents=True, exist_ok=True)
        keys = {j["key"] for j in jobs}
        if "--prune" in sys.argv:
            for f in folder.glob("*.mp3"):
                if f.stem not in keys:
                    f.unlink()
        for j in jobs:
            dst = folder / f"{j['key']}.mp3"
            if not dst.exists():
                tasks.append(synth(sem, voice, j["text"], dst, done))
    print(f"{len(jobs)} sentences, {len(tasks)} files to generate")
    await asyncio.gather(*tasks)
    print(f"done: {len(done)} generated")
    index = {"version": 1, "voices": {name: sorted(f.stem for f in (OUT / name).glob("*.mp3")) for name in VOICES}}
    INDEX.write_text(json.dumps(index, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"wrote {INDEX}")


asyncio.run(main())
