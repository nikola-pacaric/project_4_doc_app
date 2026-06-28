import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from './index';
import { createPatientExercise, getPatientExercise } from './patientExercises';

function createClientMock(
  result: { data: unknown; error: unknown } = { data: 'exercise-entry-1', error: null },
) {
  const rpc = vi.fn().mockResolvedValue(result);
  return { client: { rpc } as unknown as AppSupabaseClient, rpc };
}

describe('createPatientExercise', () => {
  it('uses the atomic exercise RPC for each new exercise', async () => {
    const { client, rpc } = createClientMock();

    await expect(
      createPatientExercise(client, 'patient-id-is-not-trusted', {
        activity: '  Cycling  ',
        durationMinutes: 45,
        intensity: 'moderate',
        occurredAt: '2026-06-22T18:30:00.000Z',
        notes: '  Riverside route  ',
      }),
    ).resolves.toEqual({
      entryId: 'exercise-entry-1',
      activity: 'Cycling',
      durationMinutes: 45,
      intensity: 'moderate',
      occurredAt: '2026-06-22T18:30:00.000Z',
      notes: 'Riverside route',
    });

    expect(rpc).toHaveBeenCalledWith('save_patient_exercise', {
      p_entry_id: null,
      p_occurred_at: '2026-06-22T18:30:00.000Z',
      p_activity: 'Cycling',
      p_duration_minutes: 45,
      p_intensity: 'moderate',
      p_notes: 'Riverside route',
    });
  });

  it('sends the existing entry ID when editing an exercise', async () => {
    const { client, rpc } = createClientMock({ data: 'exercise-entry-1', error: null });

    await createPatientExercise(client, 'patient-1', {
      entryId: 'exercise-entry-1',
      activity: 'Swimming',
      durationMinutes: 30,
      intensity: 'vigorous',
      occurredAt: '2026-06-22T20:00:00.000Z',
    });

    expect(rpc).toHaveBeenCalledWith(
      'save_patient_exercise',
      expect.objectContaining({ p_entry_id: 'exercise-entry-1' }),
    );
  });

  it('rejects incomplete drafts before calling Supabase', async () => {
    const { client, rpc } = createClientMock();

    await expect(
      createPatientExercise(client, 'patient-1', { activity: 'Walking' }),
    ).rejects.toThrow('Cannot persist an incomplete exercise draft.');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects an invalid RPC response', async () => {
    const { client } = createClientMock({ data: null, error: null });

    await expect(
      createPatientExercise(client, 'patient-1', {
        activity: 'Walking',
        durationMinutes: 20,
        intensity: 'light',
        occurredAt: '2026-06-22T08:00:00.000Z',
      }),
    ).rejects.toThrow('Exercise save returned an invalid entry ID.');
  });
});

describe('getPatientExercise', () => {
  it('loads an exercise detail row by entry ID', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        entry_id: 'exercise-entry-1',
        activity: 'Cycling',
        duration_minutes: 45,
        intensity: 'moderate',
        notes: 'Riverside route',
      },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const client = { from } as unknown as AppSupabaseClient;

    await expect(
      getPatientExercise(client, 'exercise-entry-1', '2026-06-22T18:30:00.000Z'),
    ).resolves.toEqual({
      entryId: 'exercise-entry-1',
      occurredAt: '2026-06-22T18:30:00.000Z',
      activity: 'Cycling',
      durationMinutes: 45,
      intensity: 'moderate',
      notes: 'Riverside route',
    });

    expect(from).toHaveBeenCalledWith('exercise_details');
    expect(eq).toHaveBeenCalledWith('entry_id', 'exercise-entry-1');
  });
});
