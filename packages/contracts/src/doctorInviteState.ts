export type PatientDoctorLinkState = 'loading' | 'unlinked' | 'linked' | 'offline';

export function isDoctorInviteRedemptionEnabled(
  code: string,
  linkState: PatientDoctorLinkState,
  redeeming: boolean,
): boolean {
  return Boolean(code.trim()) && linkState === 'unlinked' && !redeeming;
}
