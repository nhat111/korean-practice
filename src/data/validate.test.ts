import { describe, expect, it } from 'vitest';
import { validateVocab } from './validate';

const base = {
  id: 'baepo',
  ko: '배포',
  vi: 'triển khai',
  example: { ko: '오늘 저녁에 배포할 예정입니다.', vi: 'Tối nay sẽ deploy.' },
  tags: ['deploy'],
};

describe('validateVocab grammar', () => {
  it('accepts items without grammar (field is optional)', () => {
    expect(validateVocab(base)).toEqual([]);
  });

  it('accepts grammar whose form appears in the example', () => {
    const item = {
      ...base,
      example: {
        ...base.example,
        grammar: [{ pattern: '-(으)ㄹ 예정이다', form: '배포할 예정입니다', meaningVi: 'dự định sẽ' }],
      },
    };
    expect(validateVocab(item)).toEqual([]);
  });

  it('rejects a form that is not in the sentence and missing fields', () => {
    const item = {
      ...base,
      example: { ...base.example, grammar: [{ pattern: '-기 때문에', form: '때문에', meaningVi: '' }] },
    };
    const errors = validateVocab(item);
    expect(errors.some((e) => e.includes('form'))).toBe(true);
    expect(errors.some((e) => e.includes('meaningVi'))).toBe(true);
  });
});
