import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from './index';
import { savePatientFoodForm } from './patientFoodForms';

function createExistingFoodClientMock() {
  const eq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ update }));

  return {
    client: { from } as unknown as AppSupabaseClient,
    eq,
    from,
    update,
  };
}

describe('savePatientFoodForm', () => {
  it('updates the separate food details row in liters', async () => {
    const { client, eq, from, update } = createExistingFoodClientMock();

    const entryId = await savePatientFoodForm(
      client,
      'patient-1',
      '2026-06-21T12:00:00.000Z',
      { waterLiters: 1.75, hasOtherFluids: true, otherFluids: '  Tea  ' },
      'entry-1',
      true,
    );

    expect(from).toHaveBeenCalledWith('food_form_details');
    expect(update).toHaveBeenCalledWith({
      entry_id: 'entry-1',
      water_liters: 1.75,
      has_other_fluids: true,
      other_fluids: 'Tea',
    });
    expect(eq).toHaveBeenCalledWith('entry_id', 'entry-1');
    expect(entryId).toBe('entry-1');
  });

  it('rejects invalid hydration before calling Supabase', async () => {
    const { client, from } = createExistingFoodClientMock();

    await expect(
      savePatientFoodForm(
        client,
        'patient-1',
        '2026-06-21T12:00:00.000Z',
        { waterLiters: 1.5, hasOtherFluids: true, otherFluids: '' },
        'entry-1',
        true,
      ),
    ).rejects.toThrow('Cannot persist incomplete food hydration data.');
    expect(from).not.toHaveBeenCalled();
  });
});
