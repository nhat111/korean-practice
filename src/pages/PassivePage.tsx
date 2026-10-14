import { useEffect, useRef, useState } from 'react';
import { ContentGate } from '../components/ContentGate';
import { Icon } from '../components/Icon';
import { StatusPanel } from '../components/StatusPanel';
import { useContent } from '../data/content';
import { vi } from '../i18n/vi';
import { EPISODES } from '../practice/episodes';
import { stopSpeaking } from '../speech';
import { removeEpisode, savedEpisodeUrl, saveEpisode } from '../storage/episodes';
import type { Episode } from '../types';

// Same hosts as the sentence MP3s: GitHub Pages, then jsDelivr when Pages is blocked.
const HOSTS = __AUDIO_FALLBACK__ ? [__AUDIO_BASE__, __AUDIO_FALLBACK__] : [__AUDIO_BASE__];
const urlOf = (id: string, host: number) => `${HOSTS[host]}/audio/episodes/${id}.mp3`;
/** Cache key of a downloaded episode: its URL on the first host. */
const keyOf = (id: string) => new URL(urlOf(id, 0), window.location.href).href;

function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Index of the line playing at `time` (0 before the first one). */
function lineAt(lines: Episode['lines'], time: number): number {
  return Math.max(0, lines.findLastIndex((l) => l.start <= time + 0.05));
}

function seekAudio(a: HTMLAudioElement, to: number, duration: number) {
  a.currentTime = Math.min(Math.max(0, to), duration);
}

/** Moves to the start of the previous (-1) or next (+1) line. */
function jumpAudio(a: HTMLAudioElement, episode: Episode, step: number) {
  const i = Math.min(Math.max(0, lineAt(episode.lines, a.currentTime) + step), episode.lines.length - 1);
  seekAudio(a, episode.lines[i].start, episode.duration);
}

function withAudio(a: HTMLAudioElement | null, f: (a: HTMLAudioElement) => void) {
  if (a) f(a);
}

/** /passive: long episodes that keep playing with the screen locked. */
export function PassivePage() {
  const state = useContent('episodes');
  return (
    <div className="stack">
      <header className="stack-xs">
        <h1>{vi.passive.title}</h1>
        <p className="muted">{vi.passive.intro}</p>
      </header>
      <ContentGate state={state}>{(items) => <EpisodeList items={items} />}</ContentGate>
    </div>
  );
}

function EpisodeList({ items }: { items: Episode[] }) {
  // Display order and titles come from EPISODES / vi.passive; the JSON only has what was built.
  const episodes = EPISODES.flatMap((spec) => items.filter((e) => e.id === spec.id));
  const [current, setCurrent] = useState<string | null>(null);
  if (episodes.length === 0) {
    return (
      <StatusPanel kind="empty">
        <p className="muted">{vi.passive.preparing}</p>
      </StatusPanel>
    );
  }
  const playing = episodes.find((e) => e.id === current);
  return (
    <>
      {playing && <EpisodePlayer key={playing.id} episode={playing} />}
      <h2 className="section-title">{playing ? vi.passive.toList : vi.passive.title}</h2>
      <ul className="list list--cards">
        {episodes.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              className={e.id === current ? 'card card--link episode-card active' : 'card card--link episode-card'}
              aria-pressed={e.id === current}
              onClick={() => setCurrent(e.id)}
            >
              <span className="card-icon card-icon--teal">
                <Icon name="radio" />
              </span>
              <span className="stack-xs">
                <strong>{vi.passive.episodes[e.id]?.title ?? e.id}</strong>
                <span className="muted small">{vi.passive.episodes[e.id]?.desc}</span>
                <span className="muted small mono">
                  {clock(e.duration)} · {vi.passive.lines(e.lines.length)}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function EpisodePlayer({ episode }: { episode: Episode }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [host, setHost] = useState(0);
  const [saved, setSaved] = useState<string | null>(null); // object URL of the copy downloaded before opening
  const [downloaded, setDownloaded] = useState(false);
  const [checked, setChecked] = useState(false);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [download, setDownload] = useState<'idle' | 'busy' | 'failed'>('idle');
  const title = vi.passive.episodes[episode.id]?.title ?? episode.id;

  // Prefer the downloaded copy (works offline); otherwise stream.
  useEffect(() => {
    let url: string | null = null;
    let alive = true;
    void savedEpisodeUrl(keyOf(episode.id)).then((u) => {
      url = u;
      if (alive) {
        setSaved(u);
        setDownloaded(u !== null);
        setChecked(true);
      } else if (u) URL.revokeObjectURL(u);
    });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [episode.id]);

  const lineIndex = lineAt(episode.lines, time);

  function seek(to: number) {
    if (audio.current) seekAudio(audio.current, to, episode.duration);
  }
  function jumpLine(step: number) {
    if (audio.current) jumpAudio(audio.current, episode, step);
  }

  // Lock-screen / headset controls.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    ms.metadata = new MediaMetadata({
      title,
      artist: vi.appName,
      album: vi.passive.title,
      artwork: [{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
    });
    const el = () => audio.current;
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => void el()?.play()],
      ['pause', () => el()?.pause()],
      ['seekbackward', () => withAudio(el(), (a) => seekAudio(a, a.currentTime - 10, episode.duration))],
      ['seekforward', () => withAudio(el(), (a) => seekAudio(a, a.currentTime + 10, episode.duration))],
      ['previoustrack', () => withAudio(el(), (a) => jumpAudio(a, episode, -1))],
      ['nexttrack', () => withAudio(el(), (a) => jumpAudio(a, episode, 1))],
      ['seekto', (d) => withAudio(el(), (a) => d.seekTime !== undefined && seekAudio(a, d.seekTime, episode.duration))],
    ];
    for (const [action, handler] of handlers) {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        // action not supported by this browser
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          ms.setActionHandler(action, null);
        } catch {
          // ignore
        }
      }
      ms.metadata = null;
    };
  }, [episode, title]);

  // The source is not switched while the episode is open (that would restart it);
  // a new download is played from the next visit.
  async function toggleDownload() {
    if (downloaded) {
      await removeEpisode(keyOf(episode.id));
      setDownloaded(false);
      return;
    }
    setDownload('busy');
    const ok = await saveEpisode(keyOf(episode.id), HOSTS.map((_, h) => urlOf(episode.id, h)));
    setDownload(ok ? 'idle' : 'failed');
    setDownloaded(ok);
  }

  const src = saved ?? urlOf(episode.id, host);
  return (
    <section className="card stack-sm episode-player">
      <div className="row-between">
        <h2>{title}</h2>
        <span className="muted small mono">
          {clock(time)} / {clock(episode.duration)}
        </span>
      </div>
      {checked && (
        <audio
          ref={audio}
          src={src}
          preload="metadata"
          onPlay={() => {
            stopSpeaking();
            setPlaying(true);
            setFailed(false);
          }}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onError={() => {
            // Streaming: try the next host (e.g. GitHub Pages blocked at work).
            if (!saved && host + 1 < HOSTS.length) setHost(host + 1);
            else setFailed(true);
          }}
        />
      )}
      <input
        type="range"
        className="episode-seek"
        min={0}
        max={episode.duration}
        step={1}
        value={Math.min(time, episode.duration)}
        onChange={(e) => seek(Number(e.target.value))}
        aria-label={`${clock(time)} / ${clock(episode.duration)}`}
      />
      <div className="episode-controls">
        <button type="button" className="icon-btn" onClick={() => jumpLine(-1)} aria-label={vi.passive.prevLine} title={vi.passive.prevLine}>
          <Icon name="skip-back" />
        </button>
        <button
          type="button"
          className="episode-play"
          onClick={() => (playing ? audio.current?.pause() : void audio.current?.play().catch(() => setFailed(true)))}
          aria-label={playing ? vi.passive.pause : vi.passive.play}
          disabled={!checked}
        >
          <Icon name={playing ? 'pause' : 'play'} size={28} />
        </button>
        <button type="button" className="icon-btn" onClick={() => jumpLine(1)} aria-label={vi.passive.nextLine} title={vi.passive.nextLine}>
          <Icon name="skip-forward" />
        </button>
      </div>
      <p className="muted small center">{vi.passive.lockHint}</p>
      {failed && <p className="error">{vi.passive.loadFailed}</p>}
      <button type="button" className="link-btn small" onClick={() => void toggleDownload()} disabled={download === 'busy'}>
        <Icon name="download" size={18} />{' '}
        {download === 'busy' ? vi.passive.downloading : downloaded ? `${vi.passive.downloaded} · ${vi.passive.remove}` : vi.passive.download}
      </button>
      {download === 'failed' && <p className="error">{vi.passive.downloadFailed}</p>}
      <h3>{vi.passive.transcript}</h3>
      <ol className="episode-lines">
        {episode.lines.map((l, i) => (
          <li key={l.start}>
            <button type="button" className={i === lineIndex ? 'episode-line active' : 'episode-line'} onClick={() => seek(l.start)}>
              <span lang="ko">{l.ko}</span>
              <span className="muted small">{l.vi}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
