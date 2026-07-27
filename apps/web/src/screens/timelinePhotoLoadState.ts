export type TimelinePhotoLoadStatus = 'idle' | 'loading' | 'error';

interface TimelinePhotoLoadStateInput {
  eligibleEntryCount: number;
  failed?: boolean;
  offlineMode: boolean;
}

export function getTimelinePhotoLoadStatus({
  eligibleEntryCount,
  failed = false,
  offlineMode,
}: TimelinePhotoLoadStateInput): TimelinePhotoLoadStatus {
  if (offlineMode || eligibleEntryCount === 0) return 'idle';
  return failed ? 'error' : 'loading';
}
