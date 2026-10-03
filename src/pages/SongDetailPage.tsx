import { Link, useParams } from 'react-router';
import { ContentGate } from '../components/ContentGate';
import { Icon } from '../components/Icon';
import { KoreanLine } from '../components/SpeakButton';
import { useContent } from '../data/content';
import { vi } from '../i18n/vi';
import type { SongLesson } from '../types';

export function SongDetailPage() {
  const { id } = useParams();
  const state = useContent('songs');
  return (
    <div className="stack">
      <Link to="/songs" className="back-link">
        ← {vi.common.back}
      </Link>
      <ContentGate state={state}>
        {(items) => {
          const song = items.find((s) => s.id === id);
          return song ? <SongDetail song={song} /> : <p className="muted">{vi.common.notFound}</p>;
        }}
      </ContentGate>
    </div>
  );
}

function SongDetail({ song }: { song: SongLesson }) {
  const youtube = `https://www.youtube.com/results?search_query=${encodeURIComponent(song.youtubeQuery)}`;
  return (
    <>
      <section className="song-hero stack-sm">
        <span className="song-hero-meta">
          {song.artist} · {song.year}
        </span>
        <h1 lang="ko">{song.title}</h1>
        <p>{song.aboutVi}</p>
        <a className="pill" href={youtube} target="_blank" rel="noopener noreferrer">
          <Icon name="external" size={18} />
          {vi.songs.listen}
        </a>
      </section>
      <p className="muted small">{vi.songs.copyright}</p>

      <section className="card stack-sm">
        <h2>{vi.songs.words}</h2>
        <ul className="list song-words">
          {song.words.map((w) => (
            <li key={w.ko} className="stack-xs">
              <KoreanLine text={w.ko} className="ko song-word" />
              <p>{w.vi}</p>
              {w.noteVi && <p className="muted small">{w.noteVi}</p>}
            </li>
          ))}
        </ul>
      </section>

      {song.grammar.map((g) => (
        <section key={g.pattern} className="card stack-sm">
          <h2 lang="ko" className="grammar-pattern">
            {g.pattern}
          </h2>
          <p>{g.meaningVi}</p>
          <p className="muted small">
            <strong>{vi.songs.link}:</strong> {g.linkVi}
          </p>
          <div className="model">
            <h3>{vi.songs.atWork}</h3>
            <KoreanLine text={g.example.ko} />
            <p className="muted">{g.example.vi}</p>
          </div>
          {g.noteVi && <p className="hint small">💡 {g.noteVi}</p>}
        </section>
      ))}
    </>
  );
}
