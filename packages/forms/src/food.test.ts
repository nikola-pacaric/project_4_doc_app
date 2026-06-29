import { describe, expect, it } from 'vitest';

import {
  parseOtherFluids,
  formatOtherFluidsForDisplay,
  serializeOtherFluids,
  normalizeFoodWaterLiters,
  validateFoodHydration,
  validateOtherFluidProgress,
} from './food';

describe('food hydration validation', () => {
  it('accepts liters with up to two decimals and a completed other-fluids answer', () => {
    expect(
      validateFoodHydration({ waterLiters: 1.25, hasOtherFluids: true, otherFluids: 'Tea' }),
    ).toEqual({ valid: true, errors: {} });
    expect(validateFoodHydration({ waterLiters: 0.75, hasOtherFluids: false }).valid).toBe(true);
  });

  it('requires water and the other-fluids answer', () => {
    expect(validateFoodHydration({}).errors).toEqual({
      waterLiters: 'required',
      hasOtherFluids: 'required',
    });
  });

  it('requires details only when other fluids were consumed', () => {
    expect(
      validateFoodHydration({ waterLiters: 2, hasOtherFluids: true, otherFluids: '' }).errors,
    ).toEqual({ otherFluids: 'required' });
    expect(
      validateFoodHydration({ waterLiters: 2, hasOtherFluids: false, otherFluids: '' }).valid,
    ).toBe(true);
  });

  it('rejects an unrealistic liter amount', () => {
    expect(
      validateFoodHydration({ waterLiters: 20.1, hasOtherFluids: false }).errors.waterLiters,
    ).toBe('invalid');
  });

  it('rejects water amounts with more than two decimals', () => {
    expect(
      validateFoodHydration({ waterLiters: 1.257, hasOtherFluids: false }).errors.waterLiters,
    ).toBe('invalid');
  });

  it('normalizes water amounts to two decimals', () => {
    expect(normalizeFoodWaterLiters(1.257)).toBe(1.26);
    expect(normalizeFoodWaterLiters(0.754)).toBe(0.75);
  });

  it('validates repeatable other fluid rows with time and name', () => {
    expect(
      validateOtherFluidProgress([{ occurredAt: '2026-06-28 12:30', name: 'Coffee' }]),
    ).toBe(true);
    expect(validateOtherFluidProgress([{ occurredAt: '2026-06-28 12:30', name: '' }])).toBe(
      false,
    );
    expect(validateOtherFluidProgress([{ occurredAt: 'bad time', name: 'Tea' }])).toBe(false);
  });

  it('serializes and parses repeatable other fluid rows', () => {
    const saved = serializeOtherFluids([{ occurredAt: '2026-06-28 12:30', name: 'Coffee' }]);
    expect(parseOtherFluids(saved)).toEqual([
      { occurredAt: new Date(2026, 5, 28, 12, 30).toISOString(), name: 'Coffee' },
    ]);
    expect(parseOtherFluids('Coffee with oat milk')).toEqual([{ name: 'Coffee with oat milk' }]);
  });

  it('formats structured other fluids without exposing the storage prefix', () => {
    const saved = serializeOtherFluids([
      { occurredAt: '2026-06-28 12:30', name: 'Coffee' },
      { occurredAt: '2026-06-28 17:05', name: 'Tea' },
    ]);

    expect(formatOtherFluidsForDisplay(saved)).toBe('12:30 Coffee, 17:05 Tea');
    expect(formatOtherFluidsForDisplay('Coffee with oat milk')).toBe('Coffee with oat milk');
  });
});
