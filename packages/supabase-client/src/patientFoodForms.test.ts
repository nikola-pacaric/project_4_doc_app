import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from './index';
import { savePatientFoodForm, type FoodFormSaveRange } from './patientFoodForms';

const range: FoodFormSaveRange = {
  start: '2026-06-22T22:00:00.000Z',
  end: '2026-06-23T22:00:00.000Z',
  occurredAt: '2026-06-23T10:00:00.000Z',
};

function createClientMock(
  result: { data: unknown; error: unknown } = { data: 'entry-1', error: null },
) {
  const rpc = vi.fn().mockResolvedValue(result);
  return { client: { rpc } as unknown as AppSupabaseClient, rpc };
}

describe('savePatientFoodForm', () => {
  it('saves a progressive hydration checkpoint with no meals', async () => {
    const { client, rpc } = createClientMock();

    await expect(
      savePatientFoodForm(
        client,
        range,
        { waterLiters: 1, hasOtherFluids: false, otherFluids: '' },
        [],
      ),
    ).resolves.toBe('entry-1');

    expect(rpc).toHaveBeenCalledWith('save_patient_food_form', {
      p_day_start: range.start,
      p_day_end: range.end,
      p_occurred_at: range.occurredAt,
      p_water_liters: 1,
      p_has_other_fluids: false,
      p_other_fluids: null,
      p_meals: [],
    });
  });

  it('sends existing and new meals in the same atomic checkpoint', async () => {
    const { client, rpc } = createClientMock();

    await savePatientFoodForm(
      client,
      range,
      { waterLiters: 1.75, hasOtherFluids: true, otherFluids: '  Tea  ' },
      [
        {
          entryId: 'meal-1',
          occurredAt: '2026-06-23T08:15:00.000Z',
          type: 'breakfast',
          name: '  Oatmeal  ',
          description: '  With fruit  ',
        },
        { occurredAt: '2026-06-23T12:30:00.000Z', type: 'lunch', name: 'Soup', description: '' },
      ],
    );

    expect(rpc).toHaveBeenCalledWith(
      'save_patient_food_form',
      expect.objectContaining({
        p_water_liters: 1.75,
        p_has_other_fluids: true,
        p_other_fluids: 'Tea',
        p_meals: [
          {
            entry_id: 'meal-1',
            occurred_at: '2026-06-23T08:15:00.000Z',
            meal_type: 'breakfast',
            name: 'Oatmeal',
            description: 'With fruit',
          },
          {
            entry_id: null,
            occurred_at: '2026-06-23T12:30:00.000Z',
            meal_type: 'lunch',
            name: 'Soup',
            description: null,
          },
        ],
      }),
    );
  });

  it('normalizes water liters to two decimals before saving', async () => {
    const { client, rpc } = createClientMock();

    await savePatientFoodForm(
      client,
      range,
      { waterLiters: 1.257, hasOtherFluids: false, otherFluids: '' },
      [],
    );

    expect(rpc).toHaveBeenCalledWith(
      'save_patient_food_form',
      expect.objectContaining({ p_water_liters: 1.26 }),
    );
  });

  it('rejects incomplete hydration before calling Supabase', async () => {
    const { client, rpc } = createClientMock();

    await expect(
      savePatientFoodForm(
        client,
        range,
        { waterLiters: 1.5, hasOtherFluids: true, otherFluids: '' },
        [],
      ),
    ).rejects.toThrow('Cannot persist incomplete food hydration data.');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects a partially entered meal before calling Supabase', async () => {
    const { client, rpc } = createClientMock();

    await expect(
      savePatientFoodForm(client, range, { waterLiters: 1.5, hasOtherFluids: false }, [
        { occurredAt: '2026-06-23T08:15:00.000Z', type: 'breakfast', name: '' },
      ]),
    ).rejects.toThrow('Cannot persist incomplete meal data.');
    expect(rpc).not.toHaveBeenCalled();
  });
});
