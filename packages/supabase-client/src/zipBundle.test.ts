import { describe, expect, it } from 'vitest';

import { createStoredZip } from './zipBundle';

async function blobBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

describe('createStoredZip', () => {
  it('creates a valid store-only zip with named files', async () => {
    const zip = createStoredZip([
      { path: 'export.json', bytes: new TextEncoder().encode('{"ok":true}') },
      { path: 'images/photo.jpg', bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]) },
    ]);

    const bytes = await blobBytes(zip);
    const text = new TextDecoder().decode(bytes);

    expect(zip.type).toBe('application/zip');
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(text).toContain('export.json');
    expect(text).toContain('images/photo.jpg');
    expect(Array.from(bytes.slice(-22, -18))).toEqual([0x50, 0x4b, 0x05, 0x06]);
  });
});
