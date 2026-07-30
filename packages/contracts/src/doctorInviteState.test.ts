import { describe, expect, it } from 'vitest';

import { isDoctorInviteRedemptionEnabled } from './doctorInviteState';

describe('doctor invite redemption state', () => {
  it('enables redemption only for a nonblank code after an unlinked state loads', () => {
    expect(isDoctorInviteRedemptionEnabled(' ABC123 ', 'unlinked', false)).toBe(true);
    expect(isDoctorInviteRedemptionEnabled('   ', 'unlinked', false)).toBe(false);
    expect(isDoctorInviteRedemptionEnabled('ABC123', 'loading', false)).toBe(false);
    expect(isDoctorInviteRedemptionEnabled('ABC123', 'linked', false)).toBe(false);
    expect(isDoctorInviteRedemptionEnabled('ABC123', 'offline', false)).toBe(false);
    expect(isDoctorInviteRedemptionEnabled('ABC123', 'unlinked', true)).toBe(false);
  });
});
