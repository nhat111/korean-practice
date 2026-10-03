import { isSpeechSupported, speakKorean } from '../speech';
import { vi } from '../i18n/vi';
import { Icon } from './Icon';

interface Props {
  text: string;
  /** Smaller inline variant. */
  small?: boolean;
}

export function SpeakButton({ text, small }: Props) {
  if (!isSpeechSupported()) return null;
  return (
    <button
      type="button"
      className={small ? 'icon-btn icon-btn--small' : 'icon-btn'}
      onClick={(e) => {
        // Don't trigger parent click handlers (e.g. flipping a flashcard).
        e.stopPropagation();
        void speakKorean(text);
      }}
      aria-label={vi.common.speak}
      title={vi.common.speak}
    >
      <Icon name="volume" size={small ? 18 : 22} />
    </button>
  );
}

/** Korean text with a speak button next to it. */
export function KoreanLine({ text, className }: { text: string; className?: string }) {
  return (
    <div className="ko-line">
      <p lang="ko" className={className ?? 'ko'}>
        {text}
      </p>
      <SpeakButton text={text} small />
    </div>
  );
}
