export type ExportMode = 'all_data' | 'all_data_with_images' | 'images_only_with_labels';

export type ExportRange =
  | { type: 'selected_day'; date: string }
  | { type: 'partial_month'; month: string };

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
