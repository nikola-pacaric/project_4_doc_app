import { createAuthSessionTransitionTracker } from '@project4/sync';
import { describe, expect, it } from 'vitest';

describe('web auth visibility lifecycle', () => {
  it('preserves loaded user state when tab refocus reconfirms the same session', () => {
    const tracker = createAuthSessionTransitionTracker();

    const initialSession = tracker.next('patient-1');
    const refocusedSession = tracker.next('patient-1');

    expect(initialSession.shouldResetUserState).toBe(true);
    expect(refocusedSession).toMatchObject({
      previousUserId: 'patient-1',
      nextUserId: 'patient-1',
      shouldClearMedicalCache: false,
      shouldResetUserState: false,
    });
  });

  it('resets user state when another tab signs out the current user', () => {
    const tracker = createAuthSessionTransitionTracker('patient-1');

    expect(tracker.next(null)).toMatchObject({
      previousUserId: 'patient-1',
      nextUserId: null,
      shouldClearMedicalCache: true,
      shouldResetUserState: true,
    });
  });
});
