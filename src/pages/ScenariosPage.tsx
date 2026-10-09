import { Link, useSearchParams } from 'react-router';
import { ContentGate } from '../components/ContentGate';
import { Icon } from '../components/Icon';
import { useContent } from '../data/content';
import {
  filterAndSortScenarios,
  SCENARIO_CATEGORIES,
  type ScenarioQuery,
  type SortKey,
  type StatusFilter,
} from '../data/scenarioFilter';
import { vi } from '../i18n/vi';
import { useCustomItems } from '../storage/custom';
import { useProgress } from '../storage/progress';
import type { Scenario } from '../types';

const STATUSES = Object.keys(vi.scenarios.status) as StatusFilter[];
const SORTS = Object.keys(vi.scenarios.sort) as SortKey[];

const categoryLabel = (c: string) => vi.scenarios.categories[c] ?? c;

/** Search/filter/sort state lives in the URL so "back" restores it. */
function useScenarioQuery(): [ScenarioQuery, (patch: Partial<ScenarioQuery>) => void] {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') as StatusFilter | null;
  const sort = params.get('sort') as SortKey | null;
  const query: ScenarioQuery = {
    q: params.get('q') ?? '',
    category: params.get('cat') ?? '',
    status: status && STATUSES.includes(status) ? status : 'all',
    sort: sort && SORTS.includes(sort) ? sort : 'default',
  };
  const update = (patch: Partial<ScenarioQuery>) => {
    const next = { ...query, ...patch };
    const p = new URLSearchParams();
    if (next.q) p.set('q', next.q);
    if (next.category) p.set('cat', next.category);
    if (next.status !== 'all') p.set('status', next.status);
    if (next.sort !== 'default') p.set('sort', next.sort);
    setParams(p, { replace: true });
  };
  return [query, update];
}

export function ScenariosPage() {
  const state = useContent('scenarios');
  const custom = useCustomItems();
  return (
    <div className="stack">
      <h1>{vi.scenarios.title}</h1>
      <div className="grid">
        <Link to="/custom" className="card card--link stack-xs">
          <h2>{vi.custom.title}</h2>
          <p className="muted small">{vi.custom.entryHint(custom.length)}</p>
        </Link>
        <Link to="/emails" className="card card--link stack-xs">
          <h2>{vi.nav.emails}</h2>
          <p className="muted small">{vi.home.sections.emails}</p>
        </Link>
        <Link to="/messages" className="card card--link stack-xs">
          <h2>{vi.messages.title}</h2>
          <p className="muted small">{vi.messages.entry}</p>
        </Link>
      </div>
      <ContentGate state={state}>
        {(items) => (items.length === 0 ? <p className="muted">{vi.common.empty}</p> : <ScenarioList items={items} />)}
      </ContentGate>
    </div>
  );
}

function ScenarioList({ items }: { items: Scenario[] }) {
  const progress = useProgress();
  const [query, update] = useScenarioQuery();
  const shown = filterAndSortScenarios(items, progress.scenarios, query, categoryLabel);
  const present = SCENARIO_CATEGORIES.filter((c) => items.some((s) => s.category === c));
  const countIn = (c: string) => items.filter((s) => s.category === c).length;
  const filtered = query.q || query.category || query.status !== 'all';

  return (
    <>
      <div className="search">
        <Icon name="search" size={20} />
        <input
          type="search"
          inputMode="search"
          value={query.q}
          onChange={(e) => update({ q: e.target.value })}
          placeholder={vi.scenarios.searchPlaceholder}
          aria-label={vi.scenarios.searchPlaceholder}
        />
        {query.q && (
          <button type="button" className="search-clear" onClick={() => update({ q: '' })} aria-label={vi.scenarios.clearSearch}>
            ×
          </button>
        )}
      </div>

      <div className="chips" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={!query.category}
          className={!query.category ? 'chip active' : 'chip'}
          onClick={() => update({ category: '' })}
        >
          {vi.scenarios.allCategories} <span>{items.length}</span>
        </button>
        {present.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={query.category === c}
            className={query.category === c ? 'chip active' : 'chip'}
            onClick={() => update({ category: query.category === c ? '' : c })}
          >
            {categoryLabel(c)} <span>{countIn(c)}</span>
          </button>
        ))}
      </div>

      <div className="filters">
        <label className="field">
          <span className="small muted">{vi.scenarios.statusLabel}</span>
          <select className="select" value={query.status} onChange={(e) => update({ status: e.target.value as StatusFilter })}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {vi.scenarios.status[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="small muted">{vi.scenarios.sortLabel}</span>
          <select className="select" value={query.sort} onChange={(e) => update({ sort: e.target.value as SortKey })}>
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {vi.scenarios.sort[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="row-between">
        <span className="muted small">{vi.scenarios.resultCount(shown.length, items.length)}</span>
        {filtered && (
          <button type="button" className="link-btn small" onClick={() => update({ q: '', category: '', status: 'all' })}>
            {vi.scenarios.resetFilters}
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="muted center">{vi.scenarios.noResults}</p>
      ) : (
        <ul className="list">
          {shown.map((s) => {
            const result = progress.scenarios[s.id];
            return (
              <li key={s.id}>
                <Link to={`/scenarios/${s.id}`} className="card card--link">
                  <h2>{s.title}</h2>
                  <p lang="ko" className="ko-sub">
                    {s.titleKo}
                  </p>
                  <p className="muted">{s.description}</p>
                  <div className="meta">
                    <span className="badge">{categoryLabel(s.category)}</span>
                    <span className="badge">{vi.scenarios.turns(s.turns.length)}</span>
                    <span className={result ? 'badge badge--ok' : 'badge'}>
                      {result ? vi.scenarios.best(result.bestScore, result.totalTurns) : vi.scenarios.notPlayed}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
