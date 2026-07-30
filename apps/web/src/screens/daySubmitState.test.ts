import { describe, expect, it } from 'vitest';

import { isDaySubmitDisabled } from './daySubmitState';

const readyState = {
  dailyCompleted: false,
  dailyEntryId: 'daily-entry-1',
  dailyReadyToSubmit: true,
  exerciseCompleted: false,
  exerciseRequired: false,
  foodCompleted: true,
  loading: false,
  medicationCompleted: false,
  medicationRequired: false,
  offlineMode: false,
  periodCompleted: false,
  periodRequired: false,
  stoolCompleted: true,
  submittingDay: false,
  symptomsCompleted: true,
};

describe('isDaySubmitDisabled', () => {
  it('disables submission while patient data is loading', () => {
    expect(isDaySubmitDisabled({ ...readyState, loading: true })).toBe(true);
  });

  it('enables submission when all required sections are ready', () => {
    expect(isDaySubmitDisabled(readyState)).toBe(false);
  });

  it('keeps conditional sections required when their daily answers apply', () => {
    expect(
      isDaySubmitDisabled({
        ...readyState,
        exerciseRequired: true,
        medicationRequired: true,
        periodRequired: true,
      }),
    ).toBe(true);
  });
});
