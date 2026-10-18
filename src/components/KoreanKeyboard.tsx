import { vi } from '../i18n/vi';
import { KEY_ROWS, SHIFTED, keyFor } from '../typing/hangul';

/**
 * A 두벌식 keyboard map: each key shows its jamo with the QWERTY letter under it.
 * The next key to press is highlighted (with Shift when needed); `teach` marks the
 * keys a lesson introduces.
 */
export function KoreanKeyboard({ nextKey, teach = '' }: { nextKey?: string; teach?: string }) {
  const next = nextKey ? keyFor(nextKey) : undefined;
  const nextBase = next?.shift ? next.latin.toLowerCase() : next?.latin;
  return (
    <div className="kbd" aria-hidden="true">
      {KEY_ROWS.map((row, r) => (
        <div key={r} className={`kbd-row kbd-row--${r}`}>
          {r === 2 && <span className={next?.shift ? 'kbd-key kbd-key--wide kbd-key--next' : 'kbd-key kbd-key--wide'}>{vi.typing.shift}</span>}
          {row.map((k) => {
            const shifted = SHIFTED[k.jamo];
            const cls = [
              'kbd-key',
              k.latin === nextBase ? 'kbd-key--next' : '',
              teach.includes(k.jamo) || (shifted && teach.includes(shifted)) ? 'kbd-key--teach' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <span key={k.latin} className={cls}>
                {shifted && <span className="kbd-shift">{shifted}</span>}
                <span className="kbd-jamo" lang="ko">
                  {k.jamo}
                </span>
                <span className="kbd-latin">{k.latin}</span>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
