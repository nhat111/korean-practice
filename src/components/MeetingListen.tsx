import { useEffect, useRef, useState } from 'react';
import { vi } from '../i18n/vi';
import { saveListenResult } from '../practice/listenResult';
import { shuffle } from '../practice/listening';
import { pickKeys } from '../practice/plan';
import { speakKoreanAs, stopSpeaking } from '../speech';
import { todayKey } from '../srs/sm2';
import { getProgressSnapshot } from '../storage/progress';
import type { MeetingItem, MeetingQuestion } from '../types';
import { Icon } from './Icon';
import { ReportButton } from './ReportButton';

const SLOW_RATE = 0.75;
const GAP_MS = 350;

/** Source key under "listen:" in the SRS (answered right when every question is right). */
const sourceKey = (id: string) => `meeting:${id}`;

function ordered(items: MeetingItem[]): MeetingItem[] {
  const byKey = new Map(items.map((m) => [`listen:${sourceKey(m.id)}`, m]));
  return pickKeys([...byKey.keys()], getProgressSnapshot().srs, todayKey(), byKey.size).flatMap((k) => byKey.get(k) ?? []);
}

/** "Họp": one meeting at a time, due ones first. */
export function MeetingListen({ items }: { items: MeetingItem[] }) {
  const [list] = useState(() => ordered(items));
  const [index, setIndex] = useState(0);
  if (list.length === 0) return <p className="muted">{vi.common.empty}</p>;
  const meeting = list[index % list.length];
  return (
    <>
      <p className="muted small">{vi.listening.meeting.intro}</p>
      <MeetingCard key={`${index}:${meeting.id}`} meeting={meeting} onNext={() => setIndex((i) => i + 1)} />
    </>
  );
}

interface ShuffledQuestion extends MeetingQuestion {
  /** Original choice index for each displayed position. */
  order: number[];
}

/**
 * One meeting: play it, answer the questions, then see the transcript. The result
 * is saved as listen:meeting:<id>; `onDone` fires once every question is answered.
 */
export function MeetingCard({
  meeting,
  onDone,
  onNext,
}: {
  meeting: MeetingItem;
  onDone?: () => void;
  onNext?: () => void;
}) {
  const [questions] = useState<ShuffledQuestion[]>(() =>
    meeting.questions.map((q) => ({ ...q, order: shuffle(q.choices.map((_, i) => i)) })),
  );
  const [picked, setPicked] = useState<(number | null)[]>(() => meeting.questions.map(() => null));
  const [current, setCurrent] = useState(-1);
  const run = useRef(0);
  const speaker = (id: string) => meeting.speakers.find((s) => s.id === id);

  useEffect(
    () => () => {
      run.current++;
      stopSpeaking();
    },
    [],
  );

  async function play(rate: number, from = 0, only = false) {
    const id = ++run.current;
    for (let i = from; i < (only ? from + 1 : meeting.lines.length); i++) {
      if (run.current !== id) return;
      setCurrent(i);
      const line = meeting.lines[i];
      await speakKoreanAs(line.ko, speaker(line.speaker)?.voice ?? 'male', rate);
      await new Promise((r) => setTimeout(r, GAP_MS));
    }
    if (run.current === id) setCurrent(-1);
  }

  function stop() {
    run.current++;
    stopSpeaking();
    setCurrent(-1);
  }

  const done = picked.every((p) => p !== null);
  const correct = questions.filter((q, i) => picked[i] !== null && q.order[picked[i] ?? 0] === q.answer).length;

  function answer(qi: number, shown: number) {
    const next = picked.map((p, i) => (i === qi ? shown : p));
    setPicked(next);
    if (next.every((p) => p !== null)) {
      const allRight = questions.every((q, i) => q.order[next[i] ?? 0] === q.answer);
      saveListenResult(sourceKey(meeting.id), allRight);
      onDone?.();
    }
  }

  const playing = current >= 0;
  const now = playing ? meeting.lines[current] : null;

  return (
    <section className="card stack-sm">
      <div className="stack-xs">
        <h2>{meeting.title}</h2>
        <p className="muted small">{meeting.context}</p>
      </div>
      <div className="listen-player">
        <button
          type="button"
          className="listen-play"
          onClick={() => (playing ? stop() : void play(1))}
          aria-label={playing ? vi.listening.meeting.stop : vi.listening.meeting.playAll}
        >
          <Icon name={playing ? 'stop' : 'headphones'} size={30} />
        </button>
        <div className="stack-xs">
          <button type="button" className="chip" onClick={() => void play(SLOW_RATE)}>
            {vi.listening.meeting.slow}
          </button>
          <span className="muted small" aria-live="polite">
            {now
              ? vi.listening.meeting.speaking(speaker(now.speaker)?.name ?? '', current + 1, meeting.lines.length)
              : vi.listening.meeting.playAll}
          </span>
        </div>
      </div>

      <h3>{vi.listening.meeting.questions}</h3>
      {questions.map((q, qi) => (
        <div key={q.q} className="stack-xs">
          <p>
            <strong>{qi + 1}.</strong> {q.q}
          </p>
          <div className="choices">
            {q.order.map((orig, shown) => {
              const p = picked[qi];
              const cls =
                p === null
                  ? 'choice'
                  : orig === q.answer
                    ? 'choice choice--ok'
                    : shown === p
                      ? 'choice choice--bad'
                      : 'choice';
              return (
                <button key={orig} type="button" className={cls} disabled={p !== null} onClick={() => answer(qi, shown)}>
                  {q.choices[orig]}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {done && (
        <>
          <p className="score">{vi.listening.meeting.result(correct, questions.length)}</p>
          <h3>{vi.listening.meeting.transcript}</h3>
          <ol className="meeting-lines">
            {meeting.lines.map((l, i) => (
              <li key={i} className={i === current ? 'meeting-line meeting-line--now' : 'meeting-line'}>
                <div className="row-between">
                  <span className="muted small">{speaker(l.speaker)?.name}</span>
                  <button
                    type="button"
                    className="icon-btn icon-btn--small"
                    onClick={() => void play(1, i, true)}
                    aria-label={vi.common.speak}
                  >
                    <Icon name="volume" size={18} />
                  </button>
                </div>
                <p lang="ko">{l.ko}</p>
                <p className="muted small">{l.vi}</p>
              </li>
            ))}
          </ol>
          <ReportButton reportKey={`listen:${sourceKey(meeting.id)}`} ko={meeting.lines.map((l) => l.ko).join(' ')} />
          {onNext && (
            <button type="button" className="btn" onClick={onNext}>
              {vi.listening.meeting.next}
            </button>
          )}
        </>
      )}
    </section>
  );
}
