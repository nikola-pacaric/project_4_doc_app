import { describe, expect, it } from 'vitest';

import { validateExportPayload } from './exports';

const validPayload = {
  schemaVersion: 1,
  exportRequestId: 'export-1',
  patientId: 'patient-1',
  doctorId: 'doctor-1',
  mode: 'all_data_with_images',
  range: {
    type: 'selected_day',
    selectedDate: '2026-07-08',
    start: '2026-07-08T00:00:00.000Z',
    end: '2026-07-09T00:00:00.000Z',
  },
  generatedAt: '2026-07-08T13:00:00.000Z',
  metadata: {
    entryCount: 1,
    containsImageBinary: false,
    imageReferenceType: 'storage_path',
  },
  baseline: {},
  entries: [
    {
      id: 'entry-1',
      kind: 'meal',
      photos: [
        {
          photoPath: 'patients/patient-1/entries/entry-1/photos/photo-1.jpg',
          thumbnailPath: 'patients/patient-1/entries/entry-1/thumbs/photo-1.jpg',
        },
      ],
    },
  ],
};

describe('export payload contracts', () => {
  it('accepts JSON exports with storage path image references', () => {
    expect(validateExportPayload(validPayload)).toMatchObject({
      exportRequestId: 'export-1',
      metadata: { containsImageBinary: false },
    });
  });

  it('accepts all-time exports without selected date fields', () => {
    expect(
      validateExportPayload({
        ...validPayload,
        range: {
          type: 'all_time',
          start: '2026-01-01T00:00:00.000Z',
          end: '2026-07-10T00:00:00.000Z',
        },
      }),
    ).toMatchObject({ range: { type: 'all_time' } });
  });

  it('rejects embedded base64 image data', () => {
    expect(() =>
      validateExportPayload({
        ...validPayload,
        entries: [{ image: 'data:image/jpeg;base64,abc123' }],
      }),
    ).toThrow('EXPORT_PAYLOAD_BASE64_UNSAFE');
  });

  it('rejects malformed payload metadata', () => {
    expect(() =>
      validateExportPayload({
        ...validPayload,
        metadata: { entryCount: 1, containsImageBinary: true, imageReferenceType: 'storage_path' },
      }),
    ).toThrow('EXPORT_PAYLOAD_INVALID');
  });
});
