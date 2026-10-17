import type { ReactNode } from 'react';

/*
 * Small line-art covers for the Home section cards. Strokes use `currentColor` (the skill tone),
 * paper shapes and the red cursor use CSS tokens (`.art-*` in index.css), so dark mode follows.
 * No text: glyphs are drawn as strokes so nothing depends on device fonts.
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
      <path className="art-paper" d="M18 16h58a8 8 0 0 1 8 8v24a8 8 0 0 1-8 8H34l-10 8v-8h-6a8 8 0 0 1-8-8V24a8 8 0 0 1 8-8z" transform="translate(4 -2)" />
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
      <rect className="art-paper" x="40" y="46" width="16" height="26" rx="6" />
      <rect className="art-paper" x="104" y="46" width="16" height="26" rx="6" />
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
  // A chat window: the client's message, then my reply being typed.
  scenarios: (
    <>
      <rect className="art-paper" x="22" y="8" width="116" height="66" rx="9" />
      <path d="M22 22h116" />
      <path className="art-soft" d="M32 15h.01M39 15h.01M46 15h.01" />
      <rect x="32" y="30" width="56" height="13" rx="6.5" />
      <path className="art-soft" d="M40 36.5h32" />
      <rect className="art-fill" x="74" y="51" width="54" height="13" rx="6.5" />
      <path className="art-on-fill" d="M82 57.5h22" />
      <Cursor x={109} y={52} h={11} />
    </>
  ),
  // A small stack of flashcards with a flip arrow.
  flashcards: (
    <>
      <rect className="art-paper art-soft" x="40" y="12" width="70" height="50" rx="7" transform="rotate(-8 75 37)" />
      <rect className="art-paper" x="50" y="18" width="70" height="50" rx="7" />
      <path d="M62 36h30" strokeWidth="4" />
      <Cursor x={96} y={29} />
      <path className="art-soft" d="M62 52h40" />
      <path d="M130 30a14 14 0 0 1 0 22m-6 0h6v-6" />
    </>
  ),
  // A letter sliding out of an envelope.
  emails: (
    <>
      <rect className="art-paper" x="48" y="8" width="64" height="44" rx="5" />
      <path className="art-soft" d="M58 18h36M58 26h24" />
      <Cursor x={86} y={20} h={10} />
      <path className="art-paper" d="M36 32h88v34a6 6 0 0 1-6 6H42a6 6 0 0 1-6-6z" />
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
