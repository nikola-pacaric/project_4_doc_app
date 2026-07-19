import { describe, expect, it } from 'vitest';

import { isTransientSupabaseError } from './errors';

describe('isTransientSupabaseError', () => {
  it('accepts network, timeout, availability, and resource failures', () => {
    expect(isTransientSupabaseError(new TypeError('Network request failed'))).toBe(true);
    expect(isTransientSupabaseError({ message: 'Failed to fetch' })).toBe(true);
    expect(isTransientSupabaseError({ status: 503, message: 'unavailable' })).toBe(true);
    expect(isTransientSupabaseError({ statusCode: '429', message: 'busy' })).toBe(true);
    expect(isTransientSupabaseError({ code: '08006', message: 'connection failure' })).toBe(true);
    expect(isTransientSupabaseError({ code: 'PGRST002', message: 'schema unavailable' })).toBe(
      true,
    );
    expect(isTransientSupabaseError({ code: '53300', message: 'too many connections' })).toBe(true);
    expect(isTransientSupabaseError({ code: '57P03', message: 'cannot connect now' })).toBe(true);
  });

  it('rejects authorization, validation, conflict, and constraint failures', () => {
    expect(isTransientSupabaseError({ status: 401, message: 'unauthorized' })).toBe(false);
    expect(isTransientSupabaseError({ status: 403, message: 'forbidden' })).toBe(false);
    expect(isTransientSupabaseError({ status: 409, message: 'conflict' })).toBe(false);
    expect(isTransientSupabaseError({ code: '42501', message: 'permission denied' })).toBe(false);
    expect(isTransientSupabaseError({ code: '22007', message: 'invalid datetime' })).toBe(false);
    expect(isTransientSupabaseError({ code: '23514', message: 'check violation' })).toBe(false);
  });

  it('rejects unknown application errors', () => {
    expect(isTransientSupabaseError(new Error('Cannot persist an incomplete note draft.'))).toBe(
      false,
    );
    expect(isTransientSupabaseError(null)).toBe(false);
    expect(isTransientSupabaseError('offline')).toBe(false);
  });
});
