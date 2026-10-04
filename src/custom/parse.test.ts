import { describe, expect, it } from 'vitest';
import { parseCustomQuestions } from './parse';

const BLOCK = `Q: 넥사크로에서 공통 함수는 어떻게 관리하셨어요?
A: 공통 함수는 lib 폴더에 모아서 include해서 사용했습니다.
VI: Tôi gom hàm dùng chung vào thư mục lib rồi include để dùng.`;

describe('parseCustomQuestions', () => {
  it('parses one block with all three fields', () => {
    const r = parseCustomQuestions(BLOCK);
    expect(r.errors).toEqual([]);
    expect(r.items).toEqual([
      {
        q: '넥사크로에서 공통 함수는 어떻게 관리하셨어요?',
        a: '공통 함수는 lib 폴더에 모아서 include해서 사용했습니다.',
        vi: 'Tôi gom hàm dùng chung vào thư mục lib rồi include để dùng.',
      },
    ]);
  });

  it('treats VI as optional and leaves the key out', () => {
    const r = parseCustomQuestions('Q: 질문입니다\nA: 답변입니다');
    expect(r.errors).toEqual([]);
    expect(r.items).toEqual([{ q: '질문입니다', a: '답변입니다' }]);
    expect('vi' in r.items[0]).toBe(false);
  });

  it('splits blocks on blank lines, however many', () => {
    const text = `${BLOCK}\n\n\n   \nQ: 두 번째\nA: 답\n\n`;
    const r = parseCustomQuestions(text);
    expect(r.errors).toEqual([]);
    expect(r.items.map((i) => i.q)).toEqual([
      '넥사크로에서 공통 함수는 어떻게 관리하셨어요?',
      '두 번째',
    ]);
  });

  it('accepts lowercase prefixes, spaces and full-width colons', () => {
    const r = parseCustomQuestions('q： 질문\n a : 답변\nvi：  nghĩa');
    expect(r.errors).toEqual([]);
    expect(r.items).toEqual([{ q: '질문', a: '답변', vi: 'nghĩa' }]);
  });

  it('continues a value over several lines until the next prefix', () => {
    const r = parseCustomQuestions('Q: 첫째 줄\n둘째 줄\nA:\n답변 하나\n답변 둘\nVI: một\nhai');
    expect(r.errors).toEqual([]);
    expect(r.items).toEqual([{ q: '첫째 줄 둘째 줄', a: '답변 하나 답변 둘', vi: 'một hai' }]);
  });

  it('handles CRLF line endings and a BOM', () => {
    const r = parseCustomQuestions('\uFEFFQ: 질문\r\nA: 답변\r\n\r\nQ: 둘\r\nA: 답');
    expect(r.errors).toEqual([]);
    expect(r.items).toHaveLength(2);
    expect(r.items[0].q).toBe('질문');
  });

  it('returns nothing for empty or blank input', () => {
    expect(parseCustomQuestions('')).toEqual({ items: [], errors: [] });
    expect(parseCustomQuestions('  \n \n')).toEqual({ items: [], errors: [] });
  });

  it('reports a missing Q or A with the block number and keeps the valid blocks', () => {
    const r = parseCustomQuestions('A: 답만 있음\n\nQ: 질문\nA: 답\n\nQ: 질문만 있음');
    expect(r.items).toEqual([{ q: '질문', a: '답' }]);
    expect(r.errors.map((e) => [e.block, e.code])).toEqual([
      [1, 'missingQ'],
      [3, 'missingA'],
    ]);
    expect(r.errors[0].message).toBe('Khối 1: thiếu dòng "Q:" (câu hỏi).');
    expect(r.errors[1].message).toBe('Khối 3: thiếu dòng "A:" (câu trả lời).');
  });

  it('reports an empty required value', () => {
    const r = parseCustomQuestions('Q:\nA: 답');
    expect(r.items).toEqual([]);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toMatchObject({ block: 1, code: 'emptyValue' });
    expect(r.errors[0].message).toContain('"Q:"');
  });

  it('reports a repeated prefix when the blank line between questions is missing', () => {
    const r = parseCustomQuestions('Q: 하나\nA: 답 하나\nQ: 둘\nA: 답 둘');
    expect(r.items).toEqual([]);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toMatchObject({ block: 1, code: 'repeatedPrefix' });
    expect(r.errors[0].message).toContain('"Q:"');
    expect(r.errors[0].message).toContain('dòng trống');
  });

  it('reports text that appears before any prefix', () => {
    const r = parseCustomQuestions('질문입니다\nA: 답');
    expect(r.items).toEqual([]);
    expect(r.errors[0]).toMatchObject({ block: 1, code: 'stray' });
    expect(r.errors[0].message).toContain('질문입니다');
  });

  it('shortens long stray text in the error message', () => {
    const long = 'x'.repeat(100);
    const r = parseCustomQuestions(`${long}\nA: 답`);
    expect(r.errors[0].message).not.toContain(long);
  });

  it('numbers blocks by position even when earlier blocks fail', () => {
    const r = parseCustomQuestions('Q: 하나\n\nQ: 둘\nA: 답\n\nA: 셋');
    expect(r.items).toEqual([{ q: '둘', a: '답' }]);
    expect(r.errors.map((e) => e.block)).toEqual([1, 3]);
  });
});
