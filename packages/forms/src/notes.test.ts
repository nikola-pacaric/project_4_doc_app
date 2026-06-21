import { describe, expect, it } from 'vitest';

import { isCompleteNoteDraft, normalizeNoteDateTime, validateNote } from './notes';

describe('note validation', () => {
  it('accepts and normalizes a complete note', () => {
    const draft = { text: ' Felt better after lunch. ', occurredAt: '2026-06-21 14:30' };

    expect(validateNote(draft)).toEqual({ valid: true, errors: {} });
    expect(isCompleteNoteDraft(draft)).toBe(true);
    expect(normalizeNoteDateTime(draft.occurredAt)).toBe(
      new Date(2026, 5, 21, 14, 30).toISOString(),
    );
  });

  it('requires non-blank text and an occurrence time', () => {
    expect(validateNote({ text: '   ' }).errors).toEqual({
      text: 'required',
      occurredAt: 'required',
    });
  });

  it('rejects an invalid occurrence time', () => {
    expect(validateNote({ text: 'A note', occurredAt: '2026-02-30 12:00' }).errors).toEqual({
      occurredAt: 'invalid',
    });
    expect(normalizeNoteDateTime('not-a-date')).toBeNull();
  });
});
