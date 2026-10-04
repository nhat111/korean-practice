import { describe, expect, it } from 'vitest';
import { mergeItems, newId, questionKey, readCustomData, toItems, type CustomItem } from './items';

const NOW = '2026-10-04T12:00:00.000Z';

const item = (id: string, q: string, a = '답'): CustomItem => ({ id, q, a, createdAt: NOW });

describe('readCustomData', () => {
  it('reads a valid file and keeps ids, vi and createdAt', () => {
    const r = readCustomData(
      {
        version: 1,
        items: [{ id: 'custom-1', q: '질문', a: '답', vi: 'nghĩa', createdAt: '2026-01-01T00:00:00.000Z' }],
      },
      NOW,
    );
    expect(r).toEqual({
      items: [{ id: 'custom-1', q: '질문', a: '답', vi: 'nghĩa', createdAt: '2026-01-01T00:00:00.000Z' }],
      invalid: 0,
    });
  });

  it('returns null when it is not custom-question data', () => {
    expect(readCustomData(null)).toBeNull();
    expect(readCustomData([])).toBeNull();
    expect(readCustomData({ items: [] })).toBeNull();
    expect(readCustomData({ version: 2, items: [] })).toBeNull();
    expect(readCustomData({ version: 1, items: 'x' })).toBeNull();
    // A progress snapshot must not be accepted by mistake.
    expect(readCustomData({ version: 1, cards: {}, scenarios: {}, emails: {}, speaking: [] })).toBeNull();
  });

  it('drops invalid entries and counts them', () => {
    const r = readCustomData(
      {
        version: 1,
        items: [
          { id: 'a', q: '질문', a: '답' },
          { id: 'b', q: '', a: '답' },
          { id: 'c', q: '질문', a: '   ' },
          { id: 'd', q: 5, a: '답' },
          'text',
          null,
        ],
      },
      NOW,
    );
    expect(r?.items.map((i) => i.id)).toEqual(['a']);
    expect(r?.invalid).toBe(5);
  });

  it('fills a missing id and createdAt, trims text and drops an empty vi', () => {
    const r = readCustomData({ version: 1, items: [{ q: '  질문 ', a: ' 답 ', vi: '  ', createdAt: 'nope' }] }, NOW);
    const first = r?.items[0];
    expect(first?.id.startsWith('custom-')).toBe(true);
    expect(first).toMatchObject({ q: '질문', a: '답', createdAt: NOW });
    expect(first && 'vi' in first).toBe(false);
  });

  it('drops a repeated id', () => {
    const r = readCustomData(
      {
        version: 1,
        items: [
          { id: 'x', q: '하나', a: '답' },
          { id: 'x', q: '둘', a: '답' },
        ],
      },
      NOW,
    );
    expect(r?.items.map((i) => i.q)).toEqual(['하나']);
    expect(r?.invalid).toBe(1);
  });
});

describe('toItems', () => {
  it('adds ids and a timestamp, keeping vi only when present', () => {
    const items = toItems([{ q: '질문', a: '답', vi: 'nghĩa' }, { q: '둘', a: '답' }], NOW);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ q: '질문', a: '답', vi: 'nghĩa', createdAt: NOW });
    expect(items[0].id.startsWith('custom-')).toBe(true);
    expect('vi' in items[1]).toBe(false);
  });
});

describe('newId', () => {
  it('returns custom-prefixed ids that differ between calls', () => {
    const ids = new Set(Array.from({ length: 50 }, () => newId()));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id.startsWith('custom-')).toBe(true);
  });
});

describe('questionKey', () => {
  it('ignores case and spacing', () => {
    expect(questionKey('  API  는 뭐예요? ')).toBe(questionKey('api 는 뭐예요?'));
  });
});

describe('mergeItems', () => {
  it('appends new questions in order', () => {
    const r = mergeItems([item('1', '하나')], [item('2', '둘'), item('3', '셋')]);
    expect(r.items.map((i) => i.q)).toEqual(['하나', '둘', '셋']);
    expect(r).toMatchObject({ added: 2, duplicates: 0 });
  });

  it('skips a question that already exists, including repeats within the incoming list', () => {
    const r = mergeItems([item('1', '하나')], [item('2', ' 하나 '), item('3', '둘'), item('4', '둘')]);
    expect(r.items.map((i) => i.q)).toEqual(['하나', '둘']);
    expect(r).toMatchObject({ added: 1, duplicates: 2 });
  });

  it('gives a new id when an incoming id is already taken', () => {
    const r = mergeItems([item('same', '하나')], [item('same', '둘')]);
    expect(r.items).toHaveLength(2);
    expect(r.items[1].q).toBe('둘');
    expect(r.items[1].id).not.toBe('same');
    expect(new Set(r.items.map((i) => i.id)).size).toBe(2);
  });

  it('does not change the existing list', () => {
    const existing = [item('1', '하나')];
    mergeItems(existing, [item('2', '둘')]);
    expect(existing).toHaveLength(1);
  });
});
