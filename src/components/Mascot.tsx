/**
 * "Ko", the KoDevTalk mascot: the app icon's navy chat bubble with a face,
 * a laptop and a small taegeuk. Decorative only (aria-hidden).
 */
export function Mascot({ size = 112, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 160 160"
      aria-hidden
      focusable="false"
    >
      {/* Taegeuk behind the bubble */}
      <g transform="translate(118 40) rotate(33.7)" opacity="0.9">
        <path fill="#cd2e3a" d="M-26 0A26 26 0 0 1 26 0A13 13 0 0 0 0 0A13 13 0 0 1 -26 0z" />
        <path fill="#2f6fd6" d="M-26 0A26 26 0 0 0 26 0A13 13 0 0 0 0 0A13 13 0 0 1 -26 0z" />
      </g>
      {/* Bubble body */}
      <path
        fill="#0a3a8c"
        stroke="#ffffff"
        strokeWidth="4"
        strokeLinejoin="round"
        d="M48 30h60a28 28 0 0 1 28 28v34a28 28 0 0 1-28 28H82l-26 19a3 3 0 0 1-4.7-2.7L54 120a28 28 0 0 1-34-27V58a28 28 0 0 1 28-28z"
      />
      <path fill="#ffffff" opacity="0.12" d="M48 36h40a26 26 0 0 0-26 26v6H26v-10a22 22 0 0 1 22-22z" />
      {/* Face */}
      <ellipse cx="62" cy="70" rx="6" ry="7.5" fill="#ffffff" />
      <ellipse cx="98" cy="70" rx="6" ry="7.5" fill="#ffffff" />
      <circle cx="63.5" cy="72" r="3" fill="#0a2a66" />
      <circle cx="99.5" cy="72" r="3" fill="#0a2a66" />
      <ellipse cx="50" cy="86" rx="7" ry="4" fill="#ff6b75" opacity="0.55" />
      <ellipse cx="110" cy="86" rx="7" ry="4" fill="#ff6b75" opacity="0.55" />
      <path d="M70 88q10 10 20 0" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
      {/* Laptop with </> */}
      <g transform="translate(92 104)">
        <rect x="0" y="0" width="46" height="30" rx="4" fill="#e8f0fb" stroke="#0a2a66" strokeWidth="3" />
        <path d="M-6 30h58l-4 7H-2z" fill="#0a2a66" />
        <path
          d="M15 9l-6 6 6 6M31 9l6 6-6 6"
          fill="none"
          stroke="#0047a0"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M26 8l-6 14" stroke="#cd2e3a" strokeWidth="3" strokeLinecap="round" />
      </g>
      {/* Sparkles */}
      <path d="M22 26l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" fill="#fbbf24" />
      <circle cx="146" cy="88" r="3.5" fill="#fbbf24" />
    </svg>
  );
}
