import { describe, expect, it } from 'vitest';

import {
  formatRecentMajorWeightChange,
  isCompleteBaselineProfile,
  parseRecentMajorWeightChange,
  validateBaselineProfile,
} from './baseline';

describe('baseline profile validation', () => {
  it('accepts a complete profile', () => {
    expect(
      validateBaselineProfile(
        {
          sex: 'female',
          birthYear: 1988,
          occupation: 'Teacher',
          chronicDiseases: '',
          chronicTherapy: '',
          menstrualHistory: 'Regular cycle',
          weightKg: 68.5,
          heightCm: 172,
          recentMajorWeightChange: 'no',
        },
        2026,
      ),
    ).toEqual({ valid: true, errors: {} });
  });

  it('rejects missing and unsafe numeric values', () => {
    const result = validateBaselineProfile(
      {
        sex: 'male',
        birthYear: 2027,
        occupation: ' ',
        weightKg: 0,
        heightCm: 300,
        recentMajorWeightChange: undefined,
      },
      2026,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual({
      birthYear: 'invalid',
      occupation: 'required',
      weightKg: 'invalid',
      heightCm: 'invalid',
      recentMajorWeightChange: 'required',
    });
  });

  it('does not require menstrual history for any recorded sex', () => {
    const result = validateBaselineProfile(
      {
        sex: 'female',
        birthYear: 1995,
        occupation: 'Engineer',
        weightKg: 62,
        heightCm: 168,
        recentMajorWeightChange: 'no',
      },
      2026,
    );

    expect(result.errors.menstrualHistory).toBeUndefined();
  });

  it('requires an explanation when major weight change is yes', () => {
    const result = validateBaselineProfile(
      {
        sex: 'female',
        birthYear: 1995,
        occupation: 'Engineer',
        weightKg: 62,
        heightCm: 168,
        recentMajorWeightChange: 'yes',
        recentMajorWeightChangeDescription: ' ',
      },
      2026,
    );

    expect(result.errors.recentMajorWeightChangeDescription).toBe('required');
  });

  it('round-trips structured and legacy stored weight-change answers', () => {
    expect(parseRecentMajorWeightChange('no')).toEqual({
      recentMajorWeightChange: 'no',
      recentMajorWeightChangeDescription: '',
    });
    expect(parseRecentMajorWeightChange('yes: Lost 8 kg')).toEqual({
      recentMajorWeightChange: 'yes',
      recentMajorWeightChangeDescription: 'Lost 8 kg',
    });
    expect(parseRecentMajorWeightChange('Lost weight after illness')).toEqual({
      recentMajorWeightChange: 'yes',
      recentMajorWeightChangeDescription: 'Lost weight after illness',
    });

    const draft = {
      sex: 'male' as const,
      birthYear: 1980,
      occupation: 'Teacher',
      weightKg: 80,
      heightCm: 180,
      recentMajorWeightChange: 'yes' as const,
      recentMajorWeightChangeDescription: 'Gained 6 kg',
    };
    expect(isCompleteBaselineProfile(draft)).toBe(true);
    expect(formatRecentMajorWeightChange(draft)).toBe('yes: Gained 6 kg');
  });
});
