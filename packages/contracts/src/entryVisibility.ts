import type { PatientEntry } from './entries';
import type { PatientSex } from './profiles';

export function filterPatientTimelineEntries(
  entries: PatientEntry[],
  sex: PatientSex | null | undefined,
  options: { visibleDailyEntryIds?: string[] } = {},
): PatientEntry[] {
  const visibleDailyEntryIds = new Set(options.visibleDailyEntryIds);
  const filterDailyEntries = options.visibleDailyEntryIds !== undefined;
  return entries.filter((entry) => {
    if (entry.kind === 'fluid') return false;
    if (entry.kind === 'menstruation' && sex !== 'female') return false;
    if (entry.kind === 'daily' && filterDailyEntries) {
      return visibleDailyEntryIds.has(entry.id);
    }
    return true;
  });
}
