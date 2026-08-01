import { describe, expect, it } from 'vitest';

import {
  parseOtherFluids,
  formatOtherFluidsForDisplay,
  serializeOtherFluids,
  normalizeFoodWaterLiters,
  validateFoodHydration,
  validateOtherFluidProgress,
  isFoodFormComplete,
  isFoodFormStarted,
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
    const saved = serializeOtherFluids([
      { entryId: 'fluid-entry-1', occurredAt: '2026-06-28 12:30', name: 'Coffee' },
    ]);
    expect(parseOtherFluids(saved)).toEqual([
      {
        entryId: 'fluid-entry-1',
        occurredAt: '2026-06-28T10:30:00.000Z',
        name: 'Coffee',
      },
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

  describe('isFoodFormComplete & isFoodFormStarted', () => {
    it('is complete when hydration is complete and at least one meal is complete', () => {
      const hydration = { waterLiters: 1.5, hasOtherFluids: false };
      const meals = [{ type: 'breakfast', name: 'Eggs' }];
      expect(isFoodFormComplete(hydration, meals)).toBe(true);
    });

    it('is not complete when water is missing', () => {
      const hydration = { hasOtherFluids: false } as any;
      const meals = [{ type: 'breakfast', name: 'Eggs' }];
      expect(isFoodFormComplete(hydration, meals)).toBe(false);
    });

    it('is not complete when hasOtherFluids is true but otherFluids has no items', () => {
      const hydration = { waterLiters: 1.5, hasOtherFluids: true, otherFluids: '' };
      const meals = [{ type: 'breakfast', name: 'Eggs' }];
      expect(isFoodFormComplete(hydration, meals)).toBe(false);
    });

    it('is not complete when structured other-fluid details are still a draft', () => {
      const hydration = {
        waterLiters: 1.5,
        hasOtherFluids: true,
        otherFluids:
          'project4:other-fluids:v1:[{"entryId":"fluid-entry-1","occurredAt":"2026-06-23T12:00:00.000Z","name":""}]',
      };
      const meals = [{ type: 'breakfast', name: 'Eggs' }];
      expect(isFoodFormComplete(hydration, meals)).toBe(false);
    });

    it('is complete when structured other-fluid details are complete', () => {
      const hydration = {
        waterLiters: 1.5,
        hasOtherFluids: true,
        otherFluids: serializeOtherFluids([
          { occurredAt: '2026-06-23 12:00', name: 'Tea' },
        ]),
      };
      const meals = [{ type: 'breakfast', name: 'Eggs' }];
      expect(isFoodFormComplete(hydration, meals)).toBe(true);
    });

    it('is not complete when meals array is empty', () => {
      const hydration = { waterLiters: 1.5, hasOtherFluids: false };
      expect(isFoodFormComplete(hydration, [])).toBe(false);
    });

    it('is not complete when any meal is incomplete', () => {
      const hydration = { waterLiters: 1.5, hasOtherFluids: false };
      const meals = [{ type: 'breakfast', name: 'Eggs' }, { type: null, name: 'Snack' }];
      expect(isFoodFormComplete(hydration, meals)).toBe(false);
    });

    it('is started when any meal is logged or any hydration fields are set', () => {
      expect(isFoodFormStarted(null, [{ type: 'breakfast', name: 'Eggs' }])).toBe(true);
      expect(isFoodFormStarted({ waterLiters: 1.5 } as any, [])).toBe(true);
      expect(isFoodFormStarted({ hasOtherFluids: false } as any, [])).toBe(true);
      expect(isFoodFormStarted(null, [])).toBe(false);
    });
  });
});
