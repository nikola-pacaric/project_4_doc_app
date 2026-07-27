import type { DoctorInviteCode, LinkedPatientSummary } from '@project4/supabase-client';

export interface DoctorDashboardData {
  invites: DoctorInviteCode[];
  patients: LinkedPatientSummary[];
}

export function clearStaleLinkedPatients(data: DoctorDashboardData): DoctorDashboardData {
  return {
    invites: data.invites,
    patients: [],
  };
}
