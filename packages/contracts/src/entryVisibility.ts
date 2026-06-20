import type { PatientEntry } from './entries';
import type { PatientSex } from './profiles';

export function filterPatientTimelineEntries(
  entries: PatientEntry[],
  sex: PatientSex | null | undefined,
): PatientEntry[] {
  return sex === 'female' ? entries : entries.filter((entry) => entry.kind !== 'menstruation');
}
