import { useState } from 'react';
import { vi } from '../i18n/vi';
import { shuffle } from '../practice/listening';
import { srsKey } from '../practice/decks';
import { review, todayKey } from '../srs/sm2';
import { getProgressSnapshot, saveReview } from '../storage/progress';
import type { GrammarLesson } from '../types';

/**
 * The lesson's quick questions, one at a time. When the last one is answered the
 * lesson is reviewed in the SRS as grammar:<id> (grade 4 if all right, else 1).
 */
export function GrammarQuiz({ lesson, onDone }: { lesson: GrammarLesson; onDone?: () => void }) {
  const [round, setRound] = useState(0);
  return <QuizRound key={round} lesson={lesson} onDone={onDone} onRetry={() => setRound((r) => r + 1)} />;
}

function QuizRound({ lesson, onDone, onRetry }: { lesson: GrammarLesson; onDone?: () => void; onRetry: () => void }) {
  // Shuffle once per round so the right answer isn't always first.
  const [orders] = useState(() => lesson.quiz.map((q) => shuffle(q.choices.map((_, i) => i))));
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = lesson.quiz[index];
  const last = index + 1 === lesson.quiz.length;

  function pick(i: number) {
    setPicked(i);
    const ok = i === q.answer;
    if (ok) setCorrect((n) => n + 1);
    if (last) {
      const allRight = correct + (ok ? 1 : 0) === lesson.quiz.length;
      const key = srsKey.grammar(lesson.id);
      saveReview(key, review(getProgressSnapshot().srs[key], allRight ? 4 : 1, todayKey()));
      setFinished(true);
      onDone?.();
    }
  }

  return (
    <div className="stack-sm">
      {lesson.quiz.length > 1 && <span className="muted small mono">{vi.grammar.question(index + 1, lesson.quiz.length)}</span>}
      <p>{q.q}</p>
      <div className="choices">
        {orders[index].map((i) => {
          const cls =
            picked === null ? 'choice' : i === q.answer ? 'choice choice--ok' : i === picked ? 'choice choice--bad' : 'choice';
          return (
            <button key={i} type="button" lang="ko" className={cls} disabled={picked !== null} onClick={() => pick(i)}>
              {q.choices[i]}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className={picked === q.answer ? 'feedback feedback--ok' : 'feedback feedback--bad'}>
          <strong>{picked === q.answer ? `✓ ${vi.grammar.right}` : `✗ ${vi.grammar.wrong}`}</strong>
          <p lang="ko">{q.choices[q.answer]}</p>
          <p>{q.answerVi}</p>
          <p className="muted small">{q.explainVi}</p>
        </div>
      )}
      {picked !== null && !last && (
        <button
          type="button"
          className="btn"
          onClick={() => {
            setIndex((n) => n + 1);
            setPicked(null);
          }}
        >
          {vi.grammar.nextQuestion}
        </button>
      )}
      {finished && (
        <div className="row-between">
          <span className="muted small">{vi.grammar.quizDone(correct, lesson.quiz.length)}</span>
          <button type="button" className="link-btn small" onClick={onRetry}>
            {vi.grammar.retry}
          </button>
        </div>
      )}
    </div>
  );
}
