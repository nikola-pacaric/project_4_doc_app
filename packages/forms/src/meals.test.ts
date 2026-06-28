import { describe, expect, it } from 'vitest';

import { getStartedMeals, validateMeal, validateMealProgress, validateMeals } from './meals';

describe('meal validation', () => {
  it('requires a meal type and name', () => {
    expect(validateMeal({ description: 'Optional detail' }).errors).toEqual({
      occurredAt: 'required',
      type: 'required',
      name: 'required',
    });
  });

  it('accepts multiple named meals with optional descriptions', () => {
    expect(
      validateMeals([
        { occurredAt: '2026-06-23 08:15', type: 'breakfast', name: 'Oatmeal' },
        { occurredAt: '2026-06-23 12:30', type: 'lunch', name: 'Soup', description: 'With bread' },
      ]),
    ).toBe(true);
  });

  it('requires at least one meal for the tracked day', () => {
    expect(validateMeals([])).toBe(false);
  });

  it('ignores an untouched placeholder while validating draft progress', () => {
    const drafts = [
      { description: '' },
      { occurredAt: '2026-06-23 08:15', type: 'breakfast' as const, name: 'Eggs' },
    ];

    expect(validateMealProgress(drafts)).toBe(true);
    expect(getStartedMeals(drafts)).toEqual([
      { occurredAt: '2026-06-23 08:15', type: 'breakfast', name: 'Eggs' },
    ]);
  });

  it('rejects a partially started meal during progress saves', () => {
    expect(validateMealProgress([{ type: 'lunch' }])).toBe(false);
  });
});
