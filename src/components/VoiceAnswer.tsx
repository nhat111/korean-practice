import { vi } from '../i18n/vi';
import { isSpeechSupported, speakKorean } from '../speech';
import { compareAnswer, type Comparison } from '../speaking/compare';
import { isRecognitionSupported, recognitionUnsupportedMessage, useSpeechRecognition } from '../speaking/recognition';
import { playAudio, useRecorder } from '../speaking/recorder';
import { ListenButton, RecordButton } from './SpeakingDrill';

interface Props {
  modelAnswer: string;
  /** True once a result was submitted; the parent then shows the model answer. */
  answered: boolean;
  /** `comparison` is null when the answer was only recorded (no recognition). */
  onResult: (text: string, comparison: Comparison | null) => void;
}

/**
 * Answer a scenario turn by voice. Uses speech recognition when available;
 * otherwise records the answer for replay and self-comparison.
 */
export function VoiceAnswer(props: Props) {
  return isRecognitionSupported() ? <RecognizedAnswer {...props} /> : <RecordedAnswer {...props} />;
}

function RecognizedAnswer({ modelAnswer, answered, onResult }: Props) {
  const recognition = useSpeechRecognition();
  return (
    <div className="stack-sm">
      <ListenButton
        recognition={recognition}
        again={answered}
        label={vi.speaking.voiceAnswer}
        onStart={() =>
          recognition.start((transcript) => onResult(transcript, compareAnswer(modelAnswer, transcript)))
        }
      />
      {recognition.status === 'listening' && (
        <p lang="ko" className="interim">
          {recognition.interim || vi.speaking.listening}
        </p>
      )}
      {recognition.error && <p className="error">{recognition.error}</p>}
    </div>
  );
}

function RecordedAnswer({ modelAnswer, answered, onResult }: Props) {
  const recorder = useRecorder();
  const { url } = recorder;
  const ready = url !== null && recorder.status === 'idle';

  return (
    <div className="stack-sm">
      {!answered && (
        <>
          <p className="muted small">{recognitionUnsupportedMessage()}</p>
          <RecordButton recorder={recorder} />
        </>
      )}
      {recorder.status === 'recording' && <p className="recording-dot">{vi.speaking.recording}</p>}
      {recorder.error && <p className="error">{recorder.error}</p>}
      {ready && (
        <div className="row">
          <button type="button" className="btn btn--ghost" onClick={() => void playAudio(url)}>
            {vi.speaking.playRecording}
          </button>
          {answered && isSpeechSupported() && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={async () => {
                await speakKorean(modelAnswer);
                await playAudio(url);
              }}
            >
              {vi.speaking.playBoth}
            </button>
          )}
          {!answered && (
            <button
              type="button"
              className="btn"
              onClick={() => onResult(vi.speaking.recordedAnswer, null)}
            >
              {vi.speaking.useRecording}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
