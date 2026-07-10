import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import {
  createEntryPhotoSignedUrl,
  type AppSupabaseClient,
  type DoctorPatientExportBundle,
} from '@project4/supabase-client';

export async function downloadDoctorExportImageBytes(
  client: AppSupabaseClient,
  storagePath: string,
): Promise<Uint8Array> {
  const file = new File(Paths.cache, 'doctor-export-image-download.bin');

  try {
    const signedUrl = await createEntryPhotoSignedUrl(client, storagePath);
    const downloadedFile = await File.downloadFileAsync(signedUrl, file, { idempotent: true });
    return await downloadedFile.bytes();
  } finally {
    // Photo bytes are sensitive; remove each temporary image immediately after it is added to the ZIP.
    try {
      if (file.exists) file.delete();
    } catch {
      // Cleanup is best-effort and must not hide the original download error.
    }
  }
}

export async function shareDoctorExportBundle(bundle: DoctorPatientExportBundle): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('DOCTOR_EXPORT_SHARING_UNAVAILABLE');
  }

  const file = new File(Paths.cache, bundle.fileName);

  try {
    file.create({ intermediates: true, overwrite: true });
    file.write(bundle.zipBytes);

    await Sharing.shareAsync(file.uri, {
      dialogTitle: bundle.fileName,
      mimeType: 'application/zip',
    });
  } finally {
    // The ZIP contains sensitive data, so it remains only while the native share sheet is active.
    try {
      if (file.exists) file.delete();
    } catch {
      // Cleanup is best-effort and must not report a false export failure after sharing succeeds.
    }
  }
}
