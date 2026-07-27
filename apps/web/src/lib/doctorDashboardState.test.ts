import type { DoctorInviteCode, LinkedPatientSummary } from '@project4/supabase-client';
import { describe, expect, it } from 'vitest';

import { clearStaleLinkedPatients } from './doctorDashboardState';

describe('web doctor dashboard state', () => {
  it('removes stale linked-patient data while preserving doctor-owned invite state', () => {
    const invites = [{ id: 'invite-1' } as DoctorInviteCode];
    const patients = [{ accessId: 'access-1' } as LinkedPatientSummary];

    const next = clearStaleLinkedPatients({ invites, patients });

    expect(next.invites).toBe(invites);
    expect(next.patients).toEqual([]);
  });
});
