import { describe, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => {
  let resolveBytes: ((bytes: Uint8Array) => void) | undefined;
  const deleteFile = vi.fn();
  const bytes = vi.fn(
    () =>
      new Promise<Uint8Array>((resolve) => {
        resolveBytes = resolve;
      }),
  );

  return {
    bytes,
    deleteFile,
    resolveBytes: (value: Uint8Array) => resolveBytes?.(value),
  };
});

vi.mock('expo-file-system', () => ({
  File: class MockFile {
    exists = true;

    static async downloadFileAsync() {
      return { bytes: native.bytes };
    }

    delete() {
      native.deleteFile();
    }
  },
  Paths: { cache: 'file:///cache' },
}));

vi.mock('expo-sharing', () => ({
  isAvailableAsync: vi.fn(),
  shareAsync: vi.fn(),
}));

vi.mock('@project4/supabase-client', () => ({
  createEntryPhotoSignedUrl: vi.fn().mockResolvedValue('https://example.test/signed-image'),
}));

import { downloadDoctorExportImageBytes } from './doctorExport';

describe('downloadDoctorExportImageBytes', () => {
  it('keeps the downloaded image until its asynchronous byte read has finished', async () => {
    const result = downloadDoctorExportImageBytes({} as never, 'patients/patient/photo.jpg');

    await vi.waitFor(() => expect(native.bytes).toHaveBeenCalledOnce());
    expect(native.deleteFile).not.toHaveBeenCalled();

    native.resolveBytes(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]));

    await expect(result).resolves.toEqual(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]));
    expect(native.deleteFile).toHaveBeenCalledOnce();
  });
});
