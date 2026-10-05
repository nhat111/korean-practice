import { vi } from '../i18n/vi';
import { compareAnswer, type Comparison } from '../speaking/compare';
import { isRecognitionSupported, recognitionUnsupportedMessage, useSpeechRecognition } from '../speaking/recognition';
import { useRecorder } from '../speaking/recorder';
import { ComparePlayback, ListenButton, MicHelp, RecordControl } from './SpeakPractice';

interface Props {
  modelAnswer: string;
  /** True once a result was submitted; the parent then shows the model answer. */
  answered: boolean;
  /** `comparison` is null when the answer was only recorded (no recognition). */
  onResult: (text: string, comparison: Comparison | null) => void;
  /** Called when the learner starts speaking (e.g. to pause a countdown). */
  onStart?: () => void;
}

/**
 * Answer a scenario turn by voice. Uses speech recognition when available;
 * otherwise records the answer for replay and self-comparison.
 */
export function VoiceAnswer(props: Props) {
  return isRecognitionSupported() ? <RecognizedAnswer {...props} /> : <RecordedAnswer {...props} />;
}

function RecognizedAnswer({ modelAnswer, answered, onResult, onStart }: Props) {
  const recognition = useSpeechRecognition();
  return (
    <div className="stack-sm">
      <ListenButton
        recognition={recognition}
        again={answered}
        label={vi.speaking.voiceAnswer}
        onStart={() => {
          onStart?.();
          recognition.start((transcript) => onResult(transcript, compareAnswer(modelAnswer, transcript)));
        }}
      />
      {recognition.status === 'listening' && (
        <p lang="ko" className="interim">
          {recognition.interim || vi.speaking.listening}
        </p>
      )}
      {recognition.error && <p className="error">{recognition.error}</p>}
      {answered && <ComparePlayback ko={modelAnswer} url={null} />}
    </div>
  );
}

function RecordedAnswer({ modelAnswer, answered, onResult, onStart }: Props) {
  const recorder = useRecorder();
  const { url } = recorder;
  const ready = url !== null && recorder.status === 'idle';

  return (
    <div className="stack-sm">
      {!answered && (
        <>
          <p className="muted small">{recognitionUnsupportedMessage()}</p>
          <RecordControl recorder={recorder} onStart={onStart} />
        </>
      )}
      {recorder.error && <p className="error">{recorder.error}</p>}
      {recorder.errorKind === 'denied' && <MicHelp />}
      {ready && !answered && (
        <button type="button" className="btn" onClick={() => onResult(vi.speaking.recordedAnswer, null)}>
          {vi.speaking.useRecording}
        </button>
      )}
      {answered && <ComparePlayback ko={modelAnswer} url={ready ? url : null} />}
    </div>
  );
}
