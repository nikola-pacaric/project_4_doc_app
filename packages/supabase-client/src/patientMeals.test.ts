import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from './index';
import { listCompletePatientMealEntryIds } from './patientMeals';

describe('listCompletePatientMealEntryIds', () => {
  it('loads only meal entries with complete required meal details', async () => {
    const returns = vi.fn().mockResolvedValue({
      data: [{ entry_id: 'meal-entry-1' }],
      error: null,
    });
    const notSecond = vi.fn(() => ({ returns }));
    const notFirst = vi.fn(() => ({ not: notSecond }));
    const inMock = vi.fn(() => ({ not: notFirst }));
    const select = vi.fn(() => ({ in: inMock }));
    const from = vi.fn(() => ({ select }));
    const client = { from } as unknown as AppSupabaseClient;

    await expect(
      listCompletePatientMealEntryIds(client, ['meal-entry-1', 'draft-entry-1']),
    ).resolves.toEqual(['meal-entry-1']);

    expect(from).toHaveBeenCalledWith('meal_details');
    expect(inMock).toHaveBeenCalledWith('entry_id', ['meal-entry-1', 'draft-entry-1']);
  });
});
