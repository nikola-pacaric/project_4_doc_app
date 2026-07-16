import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearAllPatientOfflineData } from './pendingEntries';

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
    ]);
    vi.stubGlobal('window', { localStorage });

    clearAllPatientOfflineData();

    expect(localStorage.getItem('project4:pending-entries:patient-1')).toBeNull();
    expect(localStorage.getItem('project4:recent-entries:patient-2')).toBeNull();
    expect(localStorage.getItem('project4:opened-day-entries:patient-3')).toBeNull();
    expect(localStorage.getItem('project4:preferences')).toBe('value');
    expect(localStorage.getItem('sb-project-auth-token')).toBe('value');
  });
});
