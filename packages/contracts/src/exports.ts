export type ExportMode = 'all_data' | 'all_data_with_images' | 'images_only_with_labels';

export type ExportRange =
  | { type: 'selected_day'; date: string }
  | { type: 'partial_month'; month: string }
  | { type: 'all_time' };

export interface ExportRequest {
  doctorId: string;
  patientId: string;
  mode: ExportMode;
  range: ExportRange;
}

export function exportPayloadLooksBase64Unsafe(payload: unknown): boolean {
  const serialized = JSON.stringify(payload);
  return serialized.includes('data:image/') || serialized.includes(';base64,');
}

export interface ExportPhotoReference {
  id: string;
  photoPath: string;
  thumbnailPath: string;
  contextType: 'meal' | 'fluid' | 'medication' | null;
  contextLabel: string | null;
  mimeType: 'image/jpeg';
  widthPx: number | null;
  heightPx: number | null;
  sizeBytes: number | null;
  thumbnailSizeBytes: number | null;
  createdAt: string;
}

export interface ExportPayload {
  schemaVersion: 1;
  exportRequestId: string;
  patientId: string;
  doctorId: string;
  mode: ExportMode;
  range: {
    type: ExportRange['type'];
    selectedDate?: string | null;
    selectedMonth?: string | null;
    start: string;
    end: string;
  };
  generatedAt: string;
  metadata: {
    entryCount: number;
    containsImageBinary: false;
    imageReferenceType: 'none' | 'storage_path';
  };
  baseline: Record<string, unknown>;
  entries: unknown[];
}

export function isExportMode(value: unknown): value is ExportMode {
  return (
    value === 'all_data' || value === 'all_data_with_images' || value === 'images_only_with_labels'
  );
}

export function validateExportPayload(payload: unknown): ExportPayload {
  if (!payload || typeof payload !== 'object') {
    throw new Error('EXPORT_PAYLOAD_INVALID');
  }

  const candidate = payload as Partial<ExportPayload>;
  if (
    candidate.schemaVersion !== 1 ||
    typeof candidate.exportRequestId !== 'string' ||
    typeof candidate.patientId !== 'string' ||
    typeof candidate.doctorId !== 'string' ||
    !isExportMode(candidate.mode) ||
    !candidate.range ||
    typeof candidate.range !== 'object' ||
    (candidate.range.type !== 'selected_day' &&
      candidate.range.type !== 'partial_month' &&
      candidate.range.type !== 'all_time') ||
    typeof candidate.range.start !== 'string' ||
    typeof candidate.range.end !== 'string' ||
    typeof candidate.generatedAt !== 'string' ||
    !candidate.metadata ||
    typeof candidate.metadata.entryCount !== 'number' ||
    candidate.metadata.containsImageBinary !== false ||
    !Array.isArray(candidate.entries)
  ) {
    throw new Error('EXPORT_PAYLOAD_INVALID');
  }

  if (exportPayloadLooksBase64Unsafe(payload)) {
    throw new Error('EXPORT_PAYLOAD_BASE64_UNSAFE');
  }

  return candidate as ExportPayload;
}
