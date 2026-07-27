import { describe, expect, it } from 'vitest';

import {
  isDailyProgressActionComplete,
  primarySubmitHelpKey,
  type DailyProgressCompletionState,
} from './dailyProgressState';

function incompleteState(): DailyProgressCompletionState {
  return {
    dailyCompleted: false,
    dailyReadyToSubmit: false,
    exerciseCompleted: false,
    foodCompleted: false,
    medicationCompleted: false,
    noteCompleted: false,
    periodCompleted: false,
    stoolCompleted: false,
    symptomsCompleted: false,
  };
}

describe('mobile daily progress state', () => {
  it('does not count an incomplete medication draft as completed progress', () => {
    const completion = incompleteState();

    expect(isDailyProgressActionComplete('medication', completion)).toBe(false);
    expect(
      isDailyProgressActionComplete('medication', {
        ...completion,
        medicationCompleted: true,
      }),
    ).toBe(true);
  });

  it('prioritizes the completed-day message while the offline notice remains visible', () => {
    expect(primarySubmitHelpKey({ dailyCompleted: true, offlineMode: true })).toBe(
      'home.submitCompletedHelp',
    );
    expect(primarySubmitHelpKey({ dailyCompleted: false, offlineMode: true })).toBe(
      'offline.actionsDisabled',
    );
  });
});
