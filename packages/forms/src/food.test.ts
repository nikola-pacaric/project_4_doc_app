import { describe, expect, it } from 'vitest';

import { validateFoodHydration } from './food';

describe('food hydration validation', () => {
  it('accepts liters and a completed other-fluids answer', () => {
    expect(
      validateFoodHydration({ waterLiters: 1.75, hasOtherFluids: true, otherFluids: 'Tea' }),
    ).toEqual({ valid: true, errors: {} });
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
});
