import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Icon } from '../components/Icon';
import { KoreanLine } from '../components/SpeakButton';
import { StatusPanel } from '../components/StatusPanel';
import { useContent, type ContentState } from '../data/content';
import { vi } from '../i18n/vi';
import { buildPhrases, indexPhrases, searchPhrases, type Phrase, type SearchContent } from '../practice/search';

export function FindPage() {
  // `?q=` keeps the query on reload and when coming back from another page.
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const shadowing = useContent('shadowing');
  const interpret = useContent('interpret');
  const scenarios = useContent('scenarios');
  const messages = useContent('messages');
  const vocab = useContent('vocab');
  const grammar = useContent('grammar');
  // Built once when everything has loaded, not on every keystroke.
  const index = useMemo(() => {
    const content = readyContent({ shadowing, interpret, scenarios, messages, vocab, grammar });
    return content ? indexPhrases(buildPhrases(content)) : null;
  }, [shadowing, interpret, scenarios, messages, vocab, grammar]);
  const results = index ? searchPhrases(index, query) : [];

  function setQuery(q: string) {
    setParams(q ? { q } : {}, { replace: true });
  }

  return (
    <div className="stack">
      <h1>{vi.find.title}</h1>
      <p className="muted">{vi.find.intro}</p>
      <div className="search">
        <Icon name="search" size={20} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={vi.find.placeholder}
          aria-label={vi.find.placeholder}
          autoFocus
          enterKeyHint="search"
        />
        {query && (
          <button type="button" className="search-clear" onClick={() => setQuery('')} aria-label={vi.find.clear}>
            ×
          </button>
        )}
      </div>
      {!index ? (
        <p className="muted center">{vi.common.loading}</p>
      ) : !query.trim() ? (
        <div className="stack-xs">
          <span className="muted small">{vi.find.suggestLabel}</span>
          <div className="chips">
            {vi.find.suggestions.map((s) => (
              <button key={s} type="button" className="chip" onClick={() => setQuery(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : results.length === 0 ? (
        <StatusPanel kind="empty" title={vi.find.noneTitle}>
          <p className="muted">{vi.find.noneText}</p>
        </StatusPanel>
      ) : (
        <>
          <span className="muted small">{vi.find.count(results.length)}</span>
          <ul className="list">
            {results.map((p) => (
              <PhraseRow key={p.ko} phrase={p} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** All six content files once they are loaded; null while any is still loading. Failed files count as empty. */
function readyContent(states: { [K in keyof SearchContent]: ContentState<SearchContent[K][number]> }): SearchContent | null {
  const values = Object.values(states);
  if (values.some((s) => s.status === 'loading')) return null;
  const items = <T,>(s: ContentState<T>): T[] => (s.status === 'ready' ? s.items : []);
  return {
    shadowing: items(states.shadowing),
    interpret: items(states.interpret),
    scenarios: items(states.scenarios),
    messages: items(states.messages),
    vocab: items(states.vocab),
    grammar: items(states.grammar),
  };
}

function PhraseRow({ phrase }: { phrase: Phrase }) {
  const [copied, setCopied] = useState(false);
  const canCopy = typeof navigator !== 'undefined' && !!navigator.clipboard;

  async function copy() {
    try {
      await navigator.clipboard.writeText(phrase.ko);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (permissions, insecure context): the text can still be selected by hand.
    }
  }

  return (
    <li className="card stack-xs find-row">
      <KoreanLine text={phrase.ko} className="ko find-ko" />
      <p className="muted small">{phrase.vi}</p>
      <div className="row-between">
        <span className="badge">{vi.find.sources[phrase.source]}</span>
        {canCopy && (
          <button type="button" className="link-btn small" onClick={copy}>
            {copied ? vi.find.copied : vi.find.copy}
          </button>
        )}
      </div>
    </li>
  );
}
