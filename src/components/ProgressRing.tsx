const R = 42;
const C = 2 * Math.PI * R;

/** Circular percentage (0-100) with a label under the number. */
export function ProgressRing({ percent, label }: { percent: number; label: string }) {
  const p = Math.max(0, Math.min(100, percent));
  return (
    <div className="ring" role="img" aria-label={`${p}% ${label}`}>
      <svg viewBox="0 0 100 100" aria-hidden>
        <circle className="ring-track" cx="50" cy="50" r={R} />
        <circle
          className="ring-fill"
          cx="50"
          cy="50"
          r={R}
          strokeDasharray={C}
          strokeDashoffset={C * (1 - p / 100)}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <span className="ring-text" aria-hidden>
        <strong>{p}%</strong>
        <span>{label}</span>
      </span>
    </div>
  );
}
