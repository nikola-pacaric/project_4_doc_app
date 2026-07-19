import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';

import type { PreparedPhoto } from '../screens/PhotoUploadScreen';

const STORAGE_KEY = 'project4:prepared-medical-photo-files';
let registryQueue: Promise<void> = Promise.resolve();

function withRegistryLock<T>(operation: () => Promise<T>): Promise<T> {
  const result = registryQueue.then(operation, operation);
  registryQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function preparedPhotoUris(photo: PreparedPhoto): string[] {
  return [...new Set([photo.photo.uri, photo.thumbnail.uri].filter(Boolean))];
}

async function loadTrackedUris(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string')
      : [];
  } catch {
    return [];
  }
}

async function saveTrackedUris(uris: readonly string[]): Promise<void> {
  try {
    if (uris.length) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set(uris)]));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // File deletion still runs when registry persistence is temporarily unavailable.
  }
}

function deleteFile(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Cleanup is best-effort and must not turn a successful medical-data save into an error.
  }
}

export async function trackPreparedPhoto(photo: PreparedPhoto): Promise<void> {
  await trackPreparedPhotoUris(preparedPhotoUris(photo));
}

export async function trackPreparedPhotoUris(uris: readonly string[]): Promise<void> {
  await withRegistryLock(async () => {
    const tracked = await loadTrackedUris();
    await saveTrackedUris([...tracked, ...uris.filter(Boolean)]);
  });
}

export async function cleanupPreparedPhoto(photo: PreparedPhoto | null | undefined): Promise<void> {
  if (!photo) return;
  await cleanupPreparedPhotoUris(preparedPhotoUris(photo));
}

export async function cleanupPreparedPhotoUris(uris: readonly string[]): Promise<void> {
  await withRegistryLock(async () => {
    const removedUris = new Set(uris.filter(Boolean));
    removedUris.forEach(deleteFile);
    const tracked = await loadTrackedUris();
    await saveTrackedUris(tracked.filter((uri) => !removedUris.has(uri)));
  });
}

export async function cleanupAllPreparedPhotos(): Promise<void> {
  await withRegistryLock(async () => {
    const tracked = await loadTrackedUris();
    tracked.forEach(deleteFile);
    await saveTrackedUris([]);
  });
}
