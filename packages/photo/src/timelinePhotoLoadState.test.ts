import { describe, expect, it } from 'vitest';

import {
  beginTimelinePhotoRecovery,
  completeTimelinePhotoRecovery,
  createTimelinePhotoRecoveryState,
  isCurrentTimelinePhotoLoad,
  markTimelinePhotoRenderFailed,
  nextTimelinePhotoLoadRequest,
  resolveTimelinePhotoLoadStatus,
  shouldShowTimelinePhotoRecovery,
} from './timelinePhotoLoadState';

describe('timeline photo load state', () => {
  it('distinguishes successful no-photo and failed metadata/signing loads', () => {
    expect(resolveTimelinePhotoLoadStatus(0)).toBe('loaded');
    expect(resolveTimelinePhotoLoadStatus(2)).toBe('loaded');
    expect(resolveTimelinePhotoLoadStatus(2, true)).toBe('error');
    expect(resolveTimelinePhotoLoadStatus(0, true)).toBe('loaded');
  });

  it('gives a retry a newer request id than its failed attempt', () => {
    const failedAttempt = nextTimelinePhotoLoadRequest('patient-a', 3);
    const retry = nextTimelinePhotoLoadRequest('patient-a', failedAttempt.requestId);

    expect(retry).toEqual({ patientId: 'patient-a', requestId: 5 });
    expect(isCurrentTimelinePhotoLoad(retry, failedAttempt)).toBe(false);
    expect(isCurrentTimelinePhotoLoad(retry, retry)).toBe(true);
  });

  it('rejects an old patient response after the linked patient changes', () => {
    const previousPatient = nextTimelinePhotoLoadRequest('patient-a', 0);
    const currentPatient = nextTimelinePhotoLoadRequest('patient-b', previousPatient.requestId);

    expect(isCurrentTimelinePhotoLoad(currentPatient, previousPatient)).toBe(false);
  });

  it('turns a metadata or signed-url failure into an explicit recovery state', () => {
    const loading = beginTimelinePhotoRecovery(
      createTimelinePhotoRecoveryState('patient-a'),
      'patient-a',
      1,
    );
    const failed = completeTimelinePhotoRecovery(loading, loading.request, 1, true);

    expect(loading.status).toBe('loading');
    expect(failed.status).toBe('error');
    expect(shouldShowTimelinePhotoRecovery(failed)).toBe(true);
  });

  it('lets a retry supersede a failed request and suppresses its late response', () => {
    const initialRequest = beginTimelinePhotoRecovery(
      createTimelinePhotoRecoveryState('patient-a'),
      'patient-a',
      1,
    );
    const failedRequest = completeTimelinePhotoRecovery(
      initialRequest,
      initialRequest.request,
      1,
      true,
    );
    const retry = beginTimelinePhotoRecovery(failedRequest, 'patient-a', 1);
    const staleCompletion = completeTimelinePhotoRecovery(retry, failedRequest.request, 1);
    const recovered = completeTimelinePhotoRecovery(retry, retry.request, 1);

    expect(failedRequest.status).toBe('error');
    expect(staleCompletion).toBe(retry);
    expect(staleCompletion.status).toBe('loading');
    expect(recovered.status).toBe('loaded');
    expect(shouldShowTimelinePhotoRecovery(recovered)).toBe(false);
  });

  it('uses the same recoverable policy for thumbnail and full-image render errors', () => {
    const loaded = completeTimelinePhotoRecovery(
      beginTimelinePhotoRecovery(createTimelinePhotoRecoveryState('patient-a'), 'patient-a', 1),
      { patientId: 'patient-a', requestId: 1 },
      1,
    );

    const thumbnailFailure = markTimelinePhotoRenderFailed(loaded);
    const fullImageFailure = markTimelinePhotoRenderFailed(loaded);
    const retry = beginTimelinePhotoRecovery(thumbnailFailure, 'patient-a', 1);

    expect(shouldShowTimelinePhotoRecovery(thumbnailFailure)).toBe(true);
    expect(shouldShowTimelinePhotoRecovery(fullImageFailure)).toBe(true);
    expect(retry.hasRenderError).toBe(false);
    expect(retry.status).toBe('loading');
  });
});
