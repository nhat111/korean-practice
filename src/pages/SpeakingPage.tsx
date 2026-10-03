import { useState } from 'react';
import { ContentGate } from '../components/ContentGate';
import { SpeakingDrill, type SpeakingLine } from '../components/SpeakingDrill';
import { useContent } from '../data/content';
import { vi } from '../i18n/vi';
import { isSpeechSupported } from '../speech';
import { isRecognitionSupported } from '../speaking/recognition';
import { isRecordingSupported } from '../speaking/recorder';
import { useProgress, type SpeakingAttempt } from '../storage/progress';
import type { Scenario, VocabItem } from '../types';

type Source = 'scenarios' | 'vocab';

function scenarioLines(items: Scenario[]): SpeakingLine[] {
  return items.flatMap((s) =>
    s.turns.map((t, i) => ({ source: `scenario:${s.id}:${i}`, ko: t.modelAnswer, vi: t.modelAnswerVi })),
  );
}

function vocabLines(items: VocabItem[]): SpeakingLine[] {
  return items.map((v) => ({ source: `vocab:${v.id}`, ko: v.example.ko, vi: v.example.vi }));
}

export function SpeakingPage() {
  const [source, setSource] = useState<Source>('scenarios');
  const scenarios = useContent('scenarios');
  const vocab = useContent('vocab');

  return (
    <div className="stack">
      <h1>{vi.speaking.title}</h1>
      <SupportInfo />

      <div className="segmented" role="tablist">
        {(['scenarios', 'vocab'] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={source === s}
            className={source === s ? 'active' : ''}
            onClick={() => setSource(s)}
          >
            {s === 'scenarios' ? vi.speaking.sourceScenarios : vi.speaking.sourceVocab}
          </button>
        ))}
      </div>

      {source === 'scenarios' ? (
        <ContentGate state={scenarios}>
          {(items) => <LinePicker key="scenarios" lines={scenarioLines(items)} />}
        </ContentGate>
      ) : (
        <ContentGate state={vocab}>
          {(items) => <LinePicker key="vocab" lines={vocabLines(items)} />}
        </ContentGate>
      )}

      <History />
    </div>
  );
}

function SupportInfo() {
  const features = [
    { label: vi.speaking.supportTts, ok: isSpeechSupported() },
    { label: vi.speaking.supportRecording, ok: isRecordingSupported() },
    { label: vi.speaking.supportRecognition, ok: isRecognitionSupported() },
  ];
  return (
    <p className="meta" aria-label={vi.speaking.support}>
      {features.map((f) => (
        <span key={f.label} className={f.ok ? 'badge badge--ok' : 'badge badge--bad'}>
          {f.ok ? '✓' : '✗'} {f.label}
        </span>
      ))}
    </p>
  );
}

function LinePicker({ lines }: { lines: SpeakingLine[] }) {
  const [index, setIndex] = useState(0);
  if (lines.length === 0) return <p className="muted">{vi.common.empty}</p>;
  const line = lines[index];

  function random() {
    if (lines.length < 2) return;
    let next = index;
    while (next === index) next = Math.floor(Math.random() * lines.length);
    setIndex(next);
  }

  return (
    <div className="stack">
      <div className="row-between">
        <button
          type="button"
          className="btn btn--ghost"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          {vi.speaking.prev}
        </button>
        <span className="muted small">{vi.speaking.lineOf(index + 1, lines.length)}</span>
        <button
          type="button"
          className="btn btn--ghost"
          disabled={index === lines.length - 1}
          onClick={() => setIndex(index + 1)}
        >
          {vi.speaking.next}
        </button>
      </div>
      <button type="button" className="link-btn" onClick={random}>
        🔀 {vi.speaking.random}
      </button>
      {/* Remount per line so recordings and results reset. */}
      <SpeakingDrill key={line.source} line={line} />
    </div>
  );
}

const HISTORY_SHOWN = 15;

function attemptResult(a: SpeakingAttempt): string {
  if (a.score !== undefined) return `${a.score}%`;
  if (a.selfRating) return vi.speaking.ratingLabel[a.selfRating];
  return '';
}

function History() {
  const { speaking } = useProgress();
  return (
    <section className="stack-sm">
      <h2>{vi.speaking.history}</h2>
      {speaking.length === 0 ? (
        <p className="muted">{vi.speaking.noHistory}</p>
      ) : (
        <ul className="list history">
          {speaking.slice(0, HISTORY_SHOWN).map((a) => (
            <li key={a.at + a.source} className="card stack-xs">
              <div className="row-between">
                <span className="badge">{vi.speaking.modeLabel[a.mode]}</span>
                <span className="muted small">{new Date(a.at).toLocaleString('vi-VN')}</span>
              </div>
              <p lang="ko">{a.target}</p>
              {a.transcript && (
                <p lang="ko" className="muted small">
                  🎤 {a.transcript}
                </p>
              )}
              <strong>{attemptResult(a)}</strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
