import { describe, expect, it } from 'vitest';

import { formatTimeInput } from './timeInput';

describe('web time input', () => {
  it('inserts a separator and removes non-numeric characters', () => {
    expect(formatTimeInput('1a2b3')).toBe('12:3');
    expect(formatTimeInput('1234')).toBe('12:34');
  });

  it('rejects hours above 24 and minutes above 59', () => {
    expect(formatTimeInput('80:80')).toBe('');
    expect(formatTimeInput('25', '2')).toBe('2');
    expect(formatTimeInput('24:6', '24')).toBe('24');
    expect(formatTimeInput('24', '2', 23)).toBe('2');
  });
});
