import { Link, useParams, useSearchParams } from 'react-router';
import { ContentGate } from '../components/ContentGate';
import { GrammarQuiz } from '../components/GrammarQuiz';
import { ReportButton } from '../components/ReportButton';
import { KoreanLine } from '../components/SpeakButton';
import { StatusPanel } from '../components/StatusPanel';
import { useContent } from '../data/content';
import { vi } from '../i18n/vi';
import { GRAMMAR_GROUPS, srsKey } from '../practice/decks';
import { useProgress } from '../storage/progress';
import type { GrammarLesson, PolitenessLevels, VocabItem } from '../types';

/** /grammar: lessons grouped by situation, with a filter and a "practiced" mark. */
export function GrammarPage() {
  const state = useContent('grammar');
  return (
    <div className="stack">
      <header className="stack-xs">
        <h1>{vi.grammar.title}</h1>
        <p className="muted">{vi.grammar.intro}</p>
      </header>
      <ContentGate state={state}>{(items) => <GrammarList items={items} />}</ContentGate>
    </div>
  );
}

function GrammarList({ items }: { items: GrammarLesson[] }) {
  const [params, setParams] = useSearchParams();
  const group = params.get('group') ?? '';
  const setGroup = (g: string) => setParams(g ? { group: g } : {}, { replace: true });
  const { srs } = useProgress();
  const groups = GRAMMAR_GROUPS.filter((g) => items.some((l) => l.group === g));
  const shown = group ? items.filter((l) => l.group === group) : items;
  if (items.length === 0) {
    return (
      <StatusPanel kind="empty">
        <p className="muted">{vi.common.empty}</p>
      </StatusPanel>
    );
  }
  return (
    <>
      <div className="chips chips--scroll" role="tablist">
        <button type="button" role="tab" aria-selected={!group} className={!group ? 'chip active' : 'chip'} onClick={() => setGroup('')}>
          {vi.grammar.all} <span>{items.length}</span>
        </button>
        {groups.map((g) => (
          <button
            key={g}
            type="button"
            role="tab"
            aria-selected={group === g}
            className={group === g ? 'chip active' : 'chip'}
            onClick={() => setGroup(group === g ? '' : g)}
          >
            {vi.grammar.groups[g]} <span>{items.filter((l) => l.group === g).length}</span>
          </button>
        ))}
      </div>
      <ul className="list list--cards">
        {shown.map((l) => (
          <li key={l.id}>
            <Link to={`/grammar/${l.id}`} className="card card--link grammar-card">
              <div className="row-between">
                <h2 lang="ko" className="grammar-title">
                  {l.pattern}
                </h2>
                {srs[srsKey.grammar(l.id)] && <span className="badge badge--ok">{vi.grammar.practiced}</span>}
              </div>
              <p className="muted small">{l.meaningVi}</p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

/** /grammar/:id: meaning, politeness ladder, examples, a typical mistake and a quick quiz. */
export function GrammarLessonPage() {
  const { id } = useParams();
  const state = useContent('grammar');
  const vocab = useContent('vocab');
  return (
    <div className="stack">
      <Link to="/grammar" className="back-link">
        ← {vi.grammar.toList}
      </Link>
      <ContentGate state={state}>
        {(items) => {
          const i = items.findIndex((l) => l.id === id);
          if (i < 0) return <p className="muted">{vi.common.notFound}</p>;
          return (
            <GrammarLessonView
              key={items[i].id}
              lesson={items[i]}
              next={items[i + 1]}
              vocab={vocab.status === 'ready' ? vocab.items : []}
            />
          );
        }}
      </ContentGate>
    </div>
  );
}

const LEVELS: (keyof PolitenessLevels)[] = ['peer', 'lead', 'client'];

function GrammarLessonView({ lesson, next, vocab }: { lesson: GrammarLesson; next?: GrammarLesson; vocab: VocabItem[] }) {
  // Vocab example sentences annotated with the same pattern (up to three).
  const levels = lesson.levels;
  const related = vocab.filter((v) => v.example.grammar?.some((g) => g.pattern === lesson.pattern)).slice(0, 3);
  return (
    <>
      <header className="stack-xs">
        <p className="page-kicker">{vi.grammar.groups[lesson.group]}</p>
        <h1 lang="ko" className="grammar-title grammar-title--big">
          {lesson.pattern}
        </h1>
        <p>
          <strong>{lesson.meaningVi}</strong>
        </p>
        <p className="muted">{lesson.usageVi}</p>
      </header>

      {levels && (
        <section className="card stack-sm">
          <h2 className="section-title">{vi.grammar.levelsTitle}</h2>
          <ol className="grammar-levels">
            {LEVELS.map((k) => (
              <li key={k}>
                <span className="grammar-level-label">{vi.grammar.levels[k]}</span>
                <KoreanLine text={levels[k].ko} />
                <p className="muted small">{levels[k].vi}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="card stack-sm">
        <h2 className="section-title">{vi.grammar.examples}</h2>
        <ul className="list grammar-examples">
          {lesson.examples.map((e) => (
            <li key={e.ko} className="stack-xs">
              <KoreanLine text={e.ko} />
              <p className="muted small">{e.vi}</p>
            </li>
          ))}
        </ul>
        {related.length > 0 && (
          <>
            <h3>{vi.grammar.fromVocab}</h3>
            <ul className="list grammar-examples">
              {related.map((v) => (
                <li key={v.id} className="stack-xs">
                  <KoreanLine text={v.example.ko} />
                  <p className="muted small">{v.example.vi}</p>
                </li>
              ))}
            </ul>
          </>
        )}
        <ReportButton reportKey={srsKey.grammar(lesson.id)} ko={lesson.pattern} />
      </section>

      {lesson.mistake && (
        <section className="card stack-sm">
          <h2 className="section-title">{vi.grammar.mistake}</h2>
          <p lang="ko" className="grammar-wrong">
            {lesson.mistake.wrong}
          </p>
          <KoreanLine text={lesson.mistake.right} className="ko grammar-right" />
          <p className="small">{lesson.mistake.vi}</p>
          <p className="muted small">{lesson.mistake.noteVi}</p>
        </section>
      )}

      <section className="card stack-sm">
        <h2 className="section-title">{vi.grammar.quiz}</h2>
        <GrammarQuiz lesson={lesson} />
      </section>

      {next && (
        <Link to={`/grammar/${next.id}`} className="btn btn--ghost">
          {vi.grammar.next}: <span lang="ko">{next.pattern}</span> →
        </Link>
      )}
    </>
  );
}
