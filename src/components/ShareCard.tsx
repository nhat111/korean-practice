import { useEffect, useState } from 'react';
import { vi } from '../i18n/vi';
import type { ShareStats } from '../practice/share';

// The image is a fixed brand asset (same in light and dark mode), so it uses the light palette
// from index.css directly instead of CSS tokens.
const BG = '#f6f3ec';
const CARD = '#ffffff';
const BORDER = '#e6e0d4';
const TEXT = '#0f172a';
const MUTED = '#565d6e';
const BLUE = '#0047a0';
const RED = '#cd2e3a';
const SANS = "'Pretendard Variable', Pretendard, -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', system-ui, sans-serif";
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, 'Roboto Mono', monospace";
const SIZE = 1080;
const SITE = new URL(__SITE_URL__).host;

/** Square progress image for Facebook / Zalo / Instagram, drawn on a canvas. */
function drawCard(stats: ShareStats, date: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Wordmark: 코데 + 톡 in flag blue + red cursor, "kodevtalk" in mono under it.
  ctx.textBaseline = 'alphabetic';
  ctx.font = `900 88px ${SANS}`;
  ctx.fillStyle = TEXT;
  ctx.fillText('코데', 80, 170);
  const w1 = ctx.measureText('코데').width;
  ctx.fillStyle = BLUE;
  ctx.fillText('톡', 80 + w1, 170);
  const w2 = ctx.measureText('톡').width;
  ctx.fillStyle = RED;
  ctx.fillRect(80 + w1 + w2 + 10, 98, 12, 80);
  ctx.font = `500 30px ${MONO}`;
  ctx.fillStyle = MUTED;
  ctx.fillText('k o d e v t a l k', 84, 222);
  ctx.textAlign = 'right';
  ctx.fillText(`// ${date}`, SIZE - 80, 170);
  ctx.textAlign = 'left';

  // Streak, the headline number.
  ctx.fillStyle = TEXT;
  ctx.font = `900 260px ${SANS}`;
  ctx.fillText(String(stats.streak), 72, 520);
  const sw = ctx.measureText(String(stats.streak)).width;
  ctx.font = `700 52px ${SANS}`;
  ctx.fillText(vi.share.streakUnit, 72 + sw + 24, 520);

  // Three stat tiles.
  const tiles = [
    { value: String(stats.lines), label: vi.share.lines },
    { value: String(stats.minutes), label: vi.share.minutes },
    stats.typingBest > 0
      ? { value: String(stats.typingBest), label: vi.share.typing }
      : { value: `${stats.percent}%`, label: vi.share.percent },
  ];
  const tileW = (SIZE - 160 - 2 * 24) / 3;
  tiles.forEach((t, i) => {
    const x = 80 + i * (tileW + 24);
    const y = 600;
    ctx.fillStyle = CARD;
    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 2;
    ctx.beginPath();
    // roundRect is missing on older Safari; square corners are fine there.
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, tileW, 200, 20);
    else ctx.rect(x, y, tileW, 200);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = BLUE;
    ctx.font = `700 72px ${MONO}`;
    ctx.fillText(t.value, x + 28, y + 110);
    ctx.fillStyle = MUTED;
    ctx.font = `600 30px ${SANS}`;
    ctx.fillText(t.label, x + 28, y + 160);
  });

  // Footer: tagline and site.
  ctx.fillStyle = TEXT;
  ctx.font = `700 40px ${SANS}`;
  ctx.fillText(vi.share.tagline, 80, 920);
  ctx.fillStyle = MUTED;
  ctx.font = `500 32px ${MONO}`;
  ctx.fillText(SITE, 80, 975);
  ctx.fillStyle = RED;
  ctx.fillRect(80, 1000, 64, 8);
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/** Preview of the progress image with Share (Web Share with files) or Download. */
export function ShareCard({ stats }: { stats: ShareStats }) {
  const [url, setUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let active = true;
    const d = new Date();
    void toBlob(drawCard(stats, `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`)).then((blob) => {
      if (!active || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
      setFile(new File([blob], 'kodevtalk.png', { type: 'image/png' }));
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [stats]);

  const canShareFile = file !== null && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

  async function share() {
    if (!file) return;
    try {
      await navigator.share({ files: [file], text: `${vi.share.tagline} ${SITE}` });
    } catch {
      // Cancelled by the user or refused by the browser: the download link stays available.
    }
  }

  return (
    <div className="stack-sm">
      {url ? <img src={url} alt={vi.share.alt(stats.streak)} className="share-preview" /> : <p className="muted small">{vi.common.loading}</p>}
      <div className="row daily-nav">
        {canShareFile && (
          <button type="button" className="btn" onClick={share}>
            {vi.share.share}
          </button>
        )}
        {url && (
          <a href={url} download="kodevtalk.png" className={canShareFile ? 'btn btn--ghost' : 'btn'}>
            {vi.share.download}
          </a>
        )}
      </div>
    </div>
  );
}
