import type { ReactNode } from 'react';

/*
 * Small line-art covers for the Home section cards. Strokes use `currentColor` (the skill tone),
 * paper shapes and the red cursor use CSS tokens (`.art-*` in index.css), so dark mode follows.
 * No text: glyphs are drawn as strokes so nothing depends on device fonts.
 * Shared rules: 160x80 frame, content inside x 10-150, 2.5 strokes, radius 8 for paper shapes, one red cursor each.
 */

export type ArtName = 'shadowing' | 'listening' | 'interpret' | 'scenarios' | 'flashcards' | 'emails';

const BARS = [8, 16, 24, 14, 20, 10];

/** Speech-like waveform bars centred on `cy`, starting at `x`. */
function Bars({ x, cy, soft }: { x: number; cy: number; soft?: boolean }) {
  return (
    <g className={soft ? 'art-soft' : undefined}>
      {BARS.map((h, i) => (
        <path key={i} d={`M${x + i * 7} ${cy - h / 2}v${h}`} />
      ))}
    </g>
  );
}

function Cursor({ x, y, h = 14 }: { x: number; y: number; h?: number }) {
  return <rect className="art-cursor" x={x} y={y} width="3" height={h} rx="1" />;
}

const ART: Record<ArtName, ReactNode> = {
  // Model line, then the learner's echo of it.
  shadowing: (
    <>
      <path className="art-paper" d="M22 14h58a8 8 0 0 1 8 8v24a8 8 0 0 1-8 8H38l-10 8v-8h-6a8 8 0 0 1-8-8V22a8 8 0 0 1 8-8z" />
      <Bars x={30} cy={34} />
      <path className="art-paper" d="M88 30h50a8 8 0 0 1 8 8v22a8 8 0 0 1-8 8h-6v8l-10-8H88a8 8 0 0 1-8-8V38a8 8 0 0 1 8-8z" />
      <Bars x={92} cy={49} soft />
      <Cursor x={136} y={42} />
    </>
  ),
  // Headphones with a waveform between the ear cups.
  listening: (
    <>
      <path d="M48 52v-6a32 32 0 0 1 64 0v6" />
      <rect className="art-paper" x="40" y="46" width="16" height="26" rx="8" />
      <rect className="art-paper" x="104" y="46" width="16" height="26" rx="8" />
      <path d="M70 54v10M76 50v18M82 55v8" />
      <Cursor x={87} y={52} />
      <path className="art-soft" d="M130 50q6 9 0 18M138 44q11 15 0 30M30 50q-6 9 0 18M22 44q-11 15 0 30" />
    </>
  ),
  // A Vietnamese line turning into a Korean one (가).
  interpret: (
    <>
      <path className="art-paper" d="M24 10h52a8 8 0 0 1 8 8v20a8 8 0 0 1-8 8H40l-10 8v-8h-6a8 8 0 0 1-8-8V18a8 8 0 0 1 8-8z" />
      <path d="M28 20l5 12 5-12" />
      <path className="art-soft" d="M46 22h26M46 30h18" />
      <path className="art-paper" d="M84 30h52a8 8 0 0 1 8 8v22a8 8 0 0 1-8 8h-6v8l-10-8H84a8 8 0 0 1-8-8V38a8 8 0 0 1 8-8z" />
      <path d="M88 40h11v16M106 38v22M106 49h6" />
      <path className="art-soft" d="M120 44h14M120 52h8" />
      <Cursor x={130} y={47} h={10} />
      <path className="art-soft" d="M90 18h20m-5-5 5 5-5 5" />
    </>
  ),
  // A chat with the client: their question, my confirmation being typed.
  scenarios: (
    <>
      <rect className="art-paper" x="20" y="8" width="120" height="66" rx="8" />
      <path d="M20 20h120" />
      <path className="art-soft" d="M30 14h.01M37 14h.01M44 14h.01" />
      <rect x="30" y="28" width="62" height="16" rx="8" />
      <path d="M37.5 33.5a3 3 0 1 1 3 3v1.5M40.5 41h.01" strokeWidth="2" />
      <path className="art-soft" d="M50 36h34" />
      <rect className="art-fill" x="68" y="50" width="62" height="16" rx="8" />
      <path className="art-on-fill" d="M76 58l3 3 6-6M92 58h20" />
      <Cursor x={117} y={52.5} h={11} />
    </>
  ),
  // A flashcard on its stack: word, reading, meaning, and a flip arrow.
  flashcards: (
    <>
      <rect className="art-paper art-soft" x="36" y="12" width="76" height="52" rx="8" transform="rotate(-7 74 38)" />
      <rect className="art-paper" x="46" y="16" width="76" height="52" rx="8" />
      <path d="M58 32h34" />
      <Cursor x={96} y={25} />
      <path className="art-soft" d="M58 44h20M58 54h44" />
      <path d="M132 30a14 14 0 0 1 0 22m-6 0h6v-6" />
    </>
  ),
  // A letter sliding out of an envelope.
  emails: (
    <>
      <rect className="art-paper" x="48" y="8" width="64" height="44" rx="8" />
      <path className="art-soft" d="M58 18h36M58 26h24" />
      <Cursor x={86} y={20} h={10} />
      <path className="art-paper" d="M36 32h88v32a8 8 0 0 1-8 8H44a8 8 0 0 1-8-8z" />
      <path d="M36 34l44 22 44-22" />
      <path className="art-soft" d="M132 22l12-6-4 13M144 16l-12 13" />
    </>
  ),
};

/** Decorative: the card's title says what it is. */
export function Illustration({ name }: { name: ArtName }) {
  return (
    <svg
      className="art"
      viewBox="0 0 160 80"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ART[name]}
    </svg>
  );
}
