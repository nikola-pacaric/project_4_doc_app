import { describe, expect, it } from 'vitest';

import { getTimelinePhotoLoadStatus } from './timelinePhotoLoadState';

describe('web timeline photo load state', () => {
  it('loads eligible online photo entries and reports failures', () => {
    expect(getTimelinePhotoLoadStatus({ eligibleEntryCount: 2, offlineMode: false })).toBe(
      'loading',
    );
    expect(
      getTimelinePhotoLoadStatus({ eligibleEntryCount: 2, failed: true, offlineMode: false }),
    ).toBe('error');
  });

  it('stays idle without eligible entries', () => {
    expect(
      getTimelinePhotoLoadStatus({ eligibleEntryCount: 0, failed: true, offlineMode: false }),
    ).toBe('idle');
  });

  it('does not surface a photo error while offline', () => {
    expect(
      getTimelinePhotoLoadStatus({ eligibleEntryCount: 2, failed: true, offlineMode: true }),
    ).toBe('idle');
  });
});
