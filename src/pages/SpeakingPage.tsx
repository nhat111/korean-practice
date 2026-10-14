import { useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '../components/Icon';
import { ContentGate } from '../components/ContentGate';
import { SpeakingDrill, type SpeakingLine } from '../components/SpeakingDrill';
import { StatusPanel } from '../components/StatusPanel';
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

/** Hub cards, coloured like the matching home sections. */
const DRILLS = [
  { to: '/shadowing', icon: 'waves', tone: 'blue', title: vi.shadowing.title, desc: vi.home.cards.shadowing },
  { to: '/patterns', icon: 'puzzle', tone: 'amber', title: vi.patterns.title, desc: vi.speaking.patternsDesc },
  { to: '/listening', icon: 'headphones', tone: 'teal', title: vi.listening.title, desc: vi.home.cards.listening },
  { to: '/interpret', icon: 'languages', tone: 'violet', title: vi.interpret.title, desc: vi.home.cards.interpret },
  { to: '/passive', icon: 'radio', tone: 'teal', title: vi.passive.title, desc: vi.passive.card },
] as const;

export function SpeakingPage() {
  return (
    <div className="stack">
      <h1>{vi.speaking.title}</h1>
      <SupportInfo />
      <div className="grid">
        {DRILLS.map((d) => (
          <Link key={d.to} to={d.to} className="card card--link">
            <span className={`card-icon card-icon--${d.tone}`}>
              <Icon name={d.icon} />
            </span>
            <h2>{d.title}</h2>
            <p className="muted">{d.desc}</p>
          </Link>
        ))}
      </div>
      <Link to="/speaking/free" className="card card--link suggest-card">
        <span className="card-icon card-icon--red">
          <Icon name="mic" />
        </span>
        <div>
          <h2>{vi.speaking.freeTitle}</h2>
          <p className="muted">{vi.speaking.freeDesc}</p>
        </div>
      </Link>
      <History />
    </div>
  );
}

/** "/speaking/free": walk any model answer or vocab example and check it by voice. */
export function SpeakingFreePage() {
  const [source, setSource] = useState<Source>('scenarios');
  const scenarios = useContent('scenarios');
  const vocab = useContent('vocab');

  return (
    <div className="stack">
      <Link to="/speaking" className="back-link">
        {vi.speaking.backToHub}
      </Link>
      <h1>{vi.speaking.freeTitle}</h1>
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
    </div>
  );
}

function SupportInfo() {
  const features = [
    { label: vi.speaking.supportTts, ok: isSpeechSupported() },
    { label: vi.speaking.supportRecording, ok: isRecordingSupported() },
    { label: vi.speaking.supportRecognition, ok: isRecognitionSupported() },
  ];
  // Only worth a line when something is missing (e.g. no recognition in Firefox).
  const missing = features.filter((f) => !f.ok);
  if (missing.length === 0) return null;
  return (
    <p className="meta" aria-label={vi.speaking.supportMissing}>
      {missing.map((f) => (
        <span key={f.label} className="badge badge--bad">
          {vi.speaking.unsupported(f.label)}
        </span>
      ))}
    </p>
  );
}

function LinePicker({ lines }: { lines: SpeakingLine[] }) {
  const [index, setIndex] = useState(0);
  if (lines.length === 0) return (
      <StatusPanel kind="empty">
        <p className="muted">{vi.common.empty}</p>
      </StatusPanel>
    );
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
