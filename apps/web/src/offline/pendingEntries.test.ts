import { createPendingTextEntry } from '@project4/sync';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  appendPendingEntry,
  clearAllPatientOfflineData,
  loadPendingEntries,
  updatePendingEntries,
} from './pendingEntries';

class MemoryStorage implements Storage {
  readonly #values = new Map<string, string>();

  constructor(keys: readonly string[]) {
    for (const key of keys) {
      this.#values.set(key, 'value');
    }
  }

  get length(): number {
    return this.#values.size;
  }

  clear(): void {
    this.#values.clear();
  }

  getItem(key: string): string | null {
    return this.#values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.#values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.#values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.#values.set(key, value);
  }
}

describe('clearAllPatientOfflineData', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('removes every medical cache while preserving preferences and auth storage', () => {
    const localStorage = new MemoryStorage([
      'project4:preferences',
      'sb-project-auth-token',
      'project4:pending-entries:patient-1',
      'project4:recent-entries:patient-2',
      'project4:opened-day-entries:patient-3',
      'project4:pending-photo-deletions:patient-4',
    ]);
    vi.stubGlobal('window', { localStorage });

    clearAllPatientOfflineData();

    expect(localStorage.getItem('project4:pending-entries:patient-1')).toBeNull();
    expect(localStorage.getItem('project4:recent-entries:patient-2')).toBeNull();
    expect(localStorage.getItem('project4:opened-day-entries:patient-3')).toBeNull();
    expect(localStorage.getItem('project4:pending-photo-deletions:patient-4')).toBeNull();
    expect(localStorage.getItem('project4:preferences')).toBe('value');
    expect(localStorage.getItem('sb-project-auth-token')).toBe('value');
  });
});

describe('pending-entry mutations', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('updates the latest persisted queue and deduplicates the result', () => {
    const localStorage = new MemoryStorage([]);
    vi.stubGlobal('window', { localStorage });
    const first = createPendingTextEntry({
      patientId: 'patient-1',
      text: 'First',
      occurredAt: '2026-07-30T08:00:00.000Z',
    });
    const second = createPendingTextEntry({
      patientId: 'patient-1',
      text: 'Second',
      occurredAt: '2026-07-30T09:00:00.000Z',
    });

    appendPendingEntry('patient-1', first);
    const next = updatePendingEntries('patient-1', (current) => [...current, first, second]);

    expect(next).toEqual([first, second]);
    expect(loadPendingEntries('patient-1')).toEqual([first, second]);
  });
});
