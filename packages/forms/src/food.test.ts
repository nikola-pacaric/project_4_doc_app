import { describe, expect, it } from 'vitest';

import { normalizeFoodWaterLiters, validateFoodHydration } from './food';

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
});
