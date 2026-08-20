export type TimelinePhotoLoadStatus = 'loading' | 'loaded' | 'error';

export interface TimelinePhotoLoadRequest {
  patientId: string;
  requestId: number;
}

/**
 * Shared, UI-neutral recovery state for the doctor timeline photo section.
 * Both clients use it so a failed metadata/signing request and a failed image
 * render follow the same retry and stale-response policy.
 */
export interface TimelinePhotoRecoveryState {
  request: TimelinePhotoLoadRequest;
  status: TimelinePhotoLoadStatus;
  hasRenderError: boolean;
}

export function createTimelinePhotoRecoveryState(patientId: string): TimelinePhotoRecoveryState {
  return {
    request: { patientId, requestId: 0 },
    status: 'loaded',
    hasRenderError: false,
  };
}

/**
 * Begin a distinct photo metadata/signing request. A newer request always
 * supersedes an older one, including a manual retry for the same patient.
 */
export function nextTimelinePhotoLoadRequest(
  patientId: string,
  previousRequestId: number,
): TimelinePhotoLoadRequest {
  return { patientId, requestId: previousRequestId + 1 };
}

/** Do not let an unmounted, replaced, or retried request replace current UI state. */
export function isCurrentTimelinePhotoLoad(
  current: TimelinePhotoLoadRequest,
  response: TimelinePhotoLoadRequest,
): boolean {
  return current.patientId === response.patientId && current.requestId === response.requestId;
}

/** An empty eligible set is a successful, loaded "no photos" result. */
export function resolveTimelinePhotoLoadStatus(
  eligibleEntryCount: number,
  failed = false,
): TimelinePhotoLoadStatus {
  return failed && eligibleEntryCount > 0 ? 'error' : 'loaded';
}

/** Begin a load or retry, replacing any older request for the same screen. */
export function beginTimelinePhotoRecovery(
  previous: TimelinePhotoRecoveryState,
  patientId: string,
  eligibleEntryCount: number,
): TimelinePhotoRecoveryState {
  return {
    request: nextTimelinePhotoLoadRequest(patientId, previous.request.requestId),
    status: eligibleEntryCount > 0 ? 'loading' : 'loaded',
    hasRenderError: false,
  };
}

/**
 * Apply a metadata/signing result only when it belongs to the latest request.
 * Returning the prior state makes stale responses safe to ignore in either UI.
 */
export function completeTimelinePhotoRecovery(
  current: TimelinePhotoRecoveryState,
  response: TimelinePhotoLoadRequest,
  eligibleEntryCount: number,
  failed = false,
): TimelinePhotoRecoveryState {
  if (!isCurrentTimelinePhotoLoad(current.request, response)) return current;

  return {
    request: current.request,
    status: resolveTimelinePhotoLoadStatus(eligibleEntryCount, failed),
    hasRenderError: false,
  };
}

/** A thumbnail or full-image render failure exposes the same recovery action. */
export function markTimelinePhotoRenderFailed(
  current: TimelinePhotoRecoveryState,
): TimelinePhotoRecoveryState {
  if (current.hasRenderError) return current;
  return { ...current, hasRenderError: true };
}

export function shouldShowTimelinePhotoRecovery(current: TimelinePhotoRecoveryState): boolean {
  return current.status === 'error' || current.hasRenderError;
}
