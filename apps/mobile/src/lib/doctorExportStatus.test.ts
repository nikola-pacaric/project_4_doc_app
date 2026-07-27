import { describe, expect, it } from 'vitest';

import { doctorExportFailureState } from './doctorExportStatus';

describe('doctor export failure state', () => {
  it('clears status and reports a preparing error before native sharing begins', () => {
    expect(doctorExportFailureState('preparing')).toEqual({
      errorKey: 'doctor.exportError',
      status: null,
    });
  });

  it('clears the opening-share status and reports a native sharing error', () => {
    expect(doctorExportFailureState('sharing')).toEqual({
      errorKey: 'doctor.exportShareError',
      status: null,
    });
  });
});
