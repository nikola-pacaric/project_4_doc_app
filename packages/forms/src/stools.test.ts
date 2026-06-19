import { describe, expect, it } from 'vitest';

import { isCompleteStoolDraft, validateStool, type StoolDraft } from './stools';

const completeDraft: StoolDraft = {
  bristolType: 4,
  urgencyLevel: 'none',
  pain: false,
  mucus: false,
  blood: false,
  fattyStool: false,
  blackStool: false,
  notes: '',
};

describe('stool validation', () => {
  it('accepts a complete stool record with negative boolean answers', () => {
    expect(validateStool(completeDraft)).toEqual({ valid: true, errors: {} });
    expect(isCompleteStoolDraft(completeDraft)).toBe(true);
  });

  it('requires the Bristol type and every medical yes/no answer', () => {
    expect(validateStool({}).errors).toEqual({
      bristolType: 'required',
      urgencyLevel: 'required',
      pain: 'required',
      mucus: 'required',
      blood: 'required',
      fattyStool: 'required',
      blackStool: 'required',
    });
  });

  it('rejects a Bristol type outside the 1-7 scale', () => {
    const result = validateStool({ ...completeDraft, bristolType: 8 as 7 });

    expect(result.errors.bristolType).toBe('invalid');
  });

  it('keeps notes optional', () => {
    expect(validateStool({ ...completeDraft, notes: undefined }).valid).toBe(true);
  });
});
