import type { PatientEntry } from './entries';
import type { PatientSex } from './profiles';

export function filterPatientTimelineEntries(
  entries: PatientEntry[],
  sex: PatientSex | null | undefined,
  options: { includeFluidEntries?: boolean; visibleDailyEntryIds?: string[] } = {},
): PatientEntry[] {
  const visibleDailyEntryIds = new Set(options.visibleDailyEntryIds);
  const filterDailyEntries = options.visibleDailyEntryIds !== undefined;
  return entries.filter((entry) => {
    if (entry.kind === 'fluid' && !options.includeFluidEntries) return false;
    if (entry.kind === 'menstruation' && sex !== 'female') return false;
    if (entry.kind === 'daily' && filterDailyEntries) {
      return visibleDailyEntryIds.has(entry.id);
    }
    return true;
  });
}

export function filterCachedCompactTimelineEntries(entries: PatientEntry[]): PatientEntry[] {
  return entries.filter((entry) => entry.kind !== 'fluid');
}
