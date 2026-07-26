import { describe, expect, it } from 'vitest';

import { pendingSyncErrorKey } from './pendingSyncError';

describe('pendingSyncErrorKey', () => {
  it('uses save copy for pending creates', () => {
    expect(pendingSyncErrorKey('create_text_entry')).toBe('entry.saveError');
  });

  it('uses update copy for pending note and timestamp updates', () => {
    expect(pendingSyncErrorKey('update_note')).toBe('entry.updateError');
    expect(pendingSyncErrorKey('update_entry_timestamp')).toBe('entry.updateError');
  });
});
