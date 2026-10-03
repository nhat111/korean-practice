import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { AiEmailCheck } from '../components/AiEmailCheck';
import { ContentGate } from '../components/ContentGate';
import { SpeakButton } from '../components/SpeakButton';
import { useContent } from '../data/content';
import { vi } from '../i18n/vi';
import { saveEmailDone } from '../storage/progress';
import type { EmailCorrection, EmailExercise } from '../types';

export function EmailExercisePage() {
  const { id } = useParams();
  const state = useContent('emails');

  return (
    <div className="stack">
      <Link to="/emails" className="back-link">
        ← {vi.common.back}
      </Link>
      <ContentGate state={state}>
        {(items) => {
          const exercise = items.find((e) => e.id === id);
          if (!exercise) return <p className="muted">{vi.common.notFound}</p>;
          return <EmailExerciseView key={exercise.id} exercise={exercise} />;
        }}
      </ContentGate>
    </div>
  );
}

function EmailExerciseView({ exercise }: { exercise: EmailExercise }) {
  const [text, setText] = useState(exercise.draft);
  const [revealed, setRevealed] = useState(false);

  function reveal() {
    setRevealed(true);
    saveEmailDone(exercise.id);
  }

  function reset() {
    setText(exercise.draft);
    setRevealed(false);
  }

  return (
    <>
      <header>
        <h1>{exercise.title}</h1>
      </header>

      <section className="card stack-sm">
        <h3>{vi.emails.situation}</h3>
        <p>{exercise.situation}</p>
        <h3>{vi.emails.politeness}</h3>
        <p>
          <span className="badge" lang="ko">
            {vi.politeness[exercise.politeness]}
          </span>
        </p>
        <p className="muted">{exercise.politenessNote}</p>
      </section>

      <section className="card stack-sm">
        <h3>{revealed ? vi.emails.yourVersion : vi.emails.draft}</h3>
        {!revealed && <p className="muted">{vi.emails.draftHelp}</p>}
        <textarea
          lang="ko"
          className="email-text"
          rows={Math.max(6, exercise.draft.split('\n').length + 1)}
          value={text}
          onChange={(e) => setText(e.target.value)}
          readOnly={revealed}
        />
        {!revealed ? (
          <button type="button" className="btn" onClick={reveal}>
            {vi.emails.reveal}
          </button>
        ) : (
          <button type="button" className="btn btn--ghost" onClick={reset}>
            {vi.emails.reset}
          </button>
        )}
      </section>

      {revealed && (
        <>
          <section className="card stack-sm">
            <h3>{vi.emails.highlighted}</h3>
            <pre lang="ko" className="email-text email-text--static">
              {highlight(exercise.draft, exercise.corrections)}
            </pre>
          </section>

          <section className="card stack-sm">
            <div className="row-between">
              <h3>{vi.emails.corrected}</h3>
              <SpeakButton text={exercise.corrected} small />
            </div>
            <pre lang="ko" className="email-text email-text--static email-text--ok">
              {exercise.corrected}
            </pre>
          </section>

          <AiEmailCheck exercise={exercise} text={text} />

          <section className="stack-sm">
            <h3>{vi.emails.corrections}</h3>
            <ol className="corrections">
              {exercise.corrections.map((c, i) => (
                <li key={i} className="card stack-xs">
                  <span className="badge">{vi.correctionType[c.type]}</span>
                  <p lang="ko">
                    <del>{c.wrong}</del> → <ins>{c.right}</ins>
                  </p>
                  <p className="muted">{c.explanation}</p>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </>
  );
}

/** Wraps each correction's `wrong` text in <mark>, earliest match first. */
function highlight(draft: string, corrections: EmailCorrection[]) {
  const ranges: [number, number][] = [];
  for (const c of corrections) {
    const start = draft.indexOf(c.wrong);
    if (start >= 0) ranges.push([start, start + c.wrong.length]);
  }
  ranges.sort((a, b) => a[0] - b[0]);

  const parts: React.ReactNode[] = [];
  let pos = 0;
  ranges.forEach(([start, end], i) => {
    if (start < pos) return; // overlapping range: skip
    if (start > pos) parts.push(draft.slice(pos, start));
    parts.push(<mark key={i}>{draft.slice(start, end)}</mark>);
    pos = end;
  });
  parts.push(draft.slice(pos));
  return parts;
}
