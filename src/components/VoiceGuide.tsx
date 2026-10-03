import { useState } from 'react';
import { vi } from '../i18n/vi';

type Platform = keyof typeof vi.voice.guide.platforms;
type MenuLang = 'en' | 'vi';

const PLATFORMS: Platform[] = ['ios', 'android', 'windows', 'mac'];

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac with touch support.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Windows/.test(ua)) return 'windows';
  if (/Macintosh/.test(ua)) return 'mac';
  return 'android';
}

function detectMenuLang(): MenuLang {
  return navigator.language.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

/** Step-by-step instructions for installing/choosing Korean voices in the OS. */
export function VoiceGuide({ open }: { open: boolean }) {
  const [detected] = useState(detectPlatform);
  const [platform, setPlatform] = useState<Platform>(detected);
  const [menuLang, setMenuLang] = useState<MenuLang>(detectMenuLang);
  const g = vi.voice.guide;
  const steps = g.platforms[platform].steps;

  return (
    <details className="guide" open={open}>
      <summary>{g.title}</summary>
      <div className="stack-sm guide-body">
        <p className="muted small">{g.intro}</p>

        <div className="stack-xs">
          <span className="small muted">{g.platformLabel}</span>
          <div className="segmented segmented--wrap" role="tablist">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={platform === p}
                className={platform === p ? 'active' : ''}
                onClick={() => setPlatform(p)}
              >
                {g.platforms[p].name}
                {p === detected ? ' •' : ''}
              </button>
            ))}
          </div>
        </div>

        <div className="stack-xs">
          <span className="small muted">{g.menuLangLabel}</span>
          <div className="segmented" role="tablist">
            {(['en', 'vi'] as const).map((l) => (
              <button
                key={l}
                type="button"
                role="tab"
                aria-selected={menuLang === l}
                className={menuLang === l ? 'active' : ''}
                onClick={() => setMenuLang(l)}
              >
                {g.menuLang[l]}
              </button>
            ))}
          </div>
        </div>

        <ol className="steps">
          {steps.map((step, i) => (
            <li key={i}>
              {step.path[menuLang].length > 0 && (
                <p className="menu-path">
                  {step.path[menuLang].map((item, j) => (
                    <span key={j}>
                      {j > 0 && <span className="menu-sep">›</span>}
                      <kbd>{item}</kbd>
                    </span>
                  ))}
                </p>
              )}
              <p className="small">{step.note}</p>
            </li>
          ))}
        </ol>
        <p className="muted small">{g.vendorNote}</p>
      </div>
    </details>
  );
}
