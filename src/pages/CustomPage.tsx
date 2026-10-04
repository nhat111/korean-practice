import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { bestScore, isWeak } from '../custom/score';
import { parseCustomQuestions, type ParseResult } from '../custom/parse';
import { vi } from '../i18n/vi';
import {
  addCustomItems,
  exportCustomJson,
  importCustomJson,
  removeCustomItem,
  useCustomItems,
} from '../storage/custom';
import { useProgress } from '../storage/progress';

type Filter = 'all' | 'weak';

/** Saves the questions as a .json file; on phones the share sheet can save it to Files. */
async function downloadJson(json: string): Promise<void> {
  const name = `kodevtalk-cau-hoi-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([json], name, { type: 'application/json' });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      // Sharing failed: fall back to a normal download.
    }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function CustomPage() {
  const items = useCustomItems();
  const { speaking } = useProgress();
  const [filter, setFilter] = useState<Filter>('all');
  const [notice, setNotice] = useState<string | null>(null);

  const weak = items.filter((i) => isWeak(bestScore(speaking, i.id)));
  const shown = filter === 'weak' ? weak : items;

  return (
    <div className="stack">
      <h1>{vi.custom.title}</h1>
      <p className="muted">{vi.custom.intro}</p>

      <AddForm onNotice={setNotice} />

      <section className="stack-sm">
        <div className="row">
          <button type="button" className="btn btn--ghost" disabled={items.length === 0} onClick={() => void downloadJson(exportCustomJson())}>
            {vi.custom.export}
          </button>
          <ImportButton onNotice={setNotice} />
        </div>
        {items.length === 0 && <p className="muted small">{vi.custom.exportEmpty}</p>}
        {notice && (
          <p className="muted" role="status">
            {notice}
          </p>
        )}
      </section>

      <section className="stack-sm">
        <h2>{vi.custom.listTitle}</h2>
        {items.length === 0 ? (
          <p className="muted">{vi.custom.empty}</p>
        ) : (
          <>
            <div className="chips" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={filter === 'all'}
                className={filter === 'all' ? 'chip active' : 'chip'}
                onClick={() => setFilter('all')}
              >
                {vi.custom.filterAll(items.length)}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={filter === 'weak'}
                className={filter === 'weak' ? 'chip active' : 'chip'}
                onClick={() => setFilter('weak')}
              >
                {vi.custom.filterWeak(weak.length)}
              </button>
            </div>

            {weak.length > 0 && (
              <Link to={`/custom/${weak[0].id}?weak=1`} className="btn">
                {vi.custom.practiceWeak}
              </Link>
            )}

            {shown.length === 0 ? (
              <p className="muted center">{vi.custom.weakEmpty}</p>
            ) : (
              <ul className="list">
                {shown.map((item) => {
                  const best = bestScore(speaking, item.id);
                  return (
                    <li key={item.id} className="card stack-sm">
                      <p lang="ko" className="custom-q">
                        {item.q}
                      </p>
                      <div className="row-between">
                        <span className={best === null ? 'badge' : isWeak(best) ? 'badge badge--bad' : 'badge badge--ok'}>
                          {best === null ? vi.custom.notPracticed : vi.custom.best(best)}
                        </span>
                        <div className="row">
                          <button
                            type="button"
                            className="btn btn--ghost"
                            onClick={() => {
                              if (window.confirm(vi.custom.removeConfirm)) removeCustomItem(item.id);
                            }}
                          >
                            {vi.custom.remove}
                          </button>
                          <Link to={`/custom/${item.id}${filter === 'weak' ? '?weak=1' : ''}`} className="btn">
                            {vi.custom.practice}
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}

/** Paste box with a preview (valid items + per-block errors) before saving. */
function AddForm({ onNotice }: { onNotice: (message: string | null) => void }) {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<ParseResult | null>(null);

  function save() {
    if (!preview || preview.items.length === 0) return;
    const { added, duplicates } = addCustomItems(preview.items);
    onNotice(vi.custom.saved(added, duplicates));
    setText('');
    setPreview(null);
  }

  return (
    <section className="card stack-sm">
      <h2>{vi.custom.formatTitle}</h2>
      <p className="muted small">{vi.custom.formatHelp}</p>
      <pre lang="ko" className="custom-example">
        {vi.custom.formatExample}
      </pre>
      <label className="field">
        <span className="small muted">{vi.custom.inputLabel}</span>
        <textarea
          rows={8}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setPreview(null); // a preview of older text would be misleading
            onNotice(null);
          }}
          spellCheck={false}
        />
      </label>
      <button type="button" className="btn btn--ghost" disabled={text.trim() === ''} onClick={() => setPreview(parseCustomQuestions(text))}>
        {vi.custom.preview}
      </button>

      {preview && (
        <div className="stack-sm" role="status">
          <div className="meta">
            <span className="badge badge--ok">{vi.custom.previewValid(preview.items.length)}</span>
            {preview.errors.length > 0 && (
              <span className="badge badge--bad">{vi.custom.previewErrors(preview.errors.length)}</span>
            )}
          </div>
          {preview.errors.map((e, i) => (
            <p key={i} className="error">
              {e.message}
            </p>
          ))}
          {preview.items.length === 0 && preview.errors.length === 0 && (
            <p className="muted">{vi.custom.previewNothing}</p>
          )}
          {preview.items.length > 0 && (
            <>
              <ul className="list custom-preview">
                {preview.items.map((p, i) => (
                  <li key={i} className="stack-xs">
                    <span lang="ko" className="custom-q">
                      {p.q}
                    </span>
                    <span lang="ko" className="muted small">
                      {p.a}
                    </span>
                    {p.vi && <span className="muted small">{p.vi}</span>}
                  </li>
                ))}
              </ul>
              <button type="button" className="btn" onClick={save}>
                {vi.custom.save(preview.items.length)}
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function ImportButton({ onNotice }: { onNotice: (message: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    const result = importCustomJson(await file.text());
    if (result.ok) onNotice(vi.custom.importDone(result.added, result.duplicates, result.invalid));
    else onNotice(result.reason === 'notJson' ? vi.custom.importNotJson : vi.custom.importInvalid);
  }

  return (
    <>
      <button type="button" className="btn btn--ghost" onClick={() => inputRef.current?.click()}>
        {vi.custom.import}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = ''; // allow choosing the same file again
        }}
      />
    </>
  );
}
