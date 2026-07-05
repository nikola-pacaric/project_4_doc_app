import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from './index';
import {
  createPatientMedication,
  getPatientMedication,
  listCompletePatientMedicationEntryIds,
} from './patientMedications';

function createClientMock(
  result: { data: unknown; error: unknown } = { data: 'medication-entry-1', error: null },
) {
  const rpc = vi.fn().mockResolvedValue(result);
  return { client: { rpc } as unknown as AppSupabaseClient, rpc };
}

const completeDraft = {
  name: '  Vitamin D  ',
  dose: '  1000 IU  ',
  takenAt: '2026-06-22T08:30:00.000Z',
  reason: '  Supplement  ',
  isChronicTherapy: false,
};

describe('createPatientMedication', () => {
  it('uses the atomic medication RPC for each new entry', async () => {
    const { client, rpc } = createClientMock();

    await expect(
      createPatientMedication(client, 'patient-id-is-not-trusted', completeDraft),
    ).resolves.toEqual({
      entryId: 'medication-entry-1',
      occurredAt: '2026-06-22T08:30:00.000Z',
      name: 'Vitamin D',
      dose: '1000 IU',
      reason: 'Supplement',
      isChronicTherapy: false,
    });

    expect(rpc).toHaveBeenCalledWith('save_patient_medication', {
      p_entry_id: null,
      p_occurred_at: '2026-06-22T08:30:00.000Z',
      p_name: 'Vitamin D',
      p_dose: '1000 IU',
      p_notes: 'Supplement',
      p_is_chronic_therapy: false,
    });
  });

  it('sends an existing entry ID when editing', async () => {
    const { client, rpc } = createClientMock();

    await createPatientMedication(client, 'patient-1', {
      ...completeDraft,
      entryId: 'medication-entry-1',
    });

    expect(rpc).toHaveBeenCalledWith(
      'save_patient_medication',
      expect.objectContaining({ p_entry_id: 'medication-entry-1' }),
    );
  });

  it('saves incomplete drafts without inventing medication fields', async () => {
    const { client, rpc } = createClientMock();

    await expect(
      createPatientMedication(client, 'patient-1', {
        name: 'Vitamin D',
        takenAt: '2026-06-22T08:30:00.000Z',
      }),
    ).resolves.toMatchObject({
      entryId: 'medication-entry-1',
      name: 'Vitamin D',
      dose: null,
      isChronicTherapy: null,
    });

    expect(rpc).toHaveBeenCalledWith(
      'save_patient_medication',
      expect.objectContaining({
        p_name: 'Vitamin D',
        p_dose: null,
        p_is_chronic_therapy: null,
      }),
    );
  });

  it('rejects an invalid RPC response', async () => {
    const { client } = createClientMock({ data: null, error: null });

    await expect(createPatientMedication(client, 'patient-1', completeDraft)).rejects.toThrow(
      'Medication save returned an invalid entry ID.',
    );
  });
});

describe('listCompletePatientMedicationEntryIds', () => {
  it('loads only medication entries with complete required medication details', async () => {
    const returns = vi.fn().mockResolvedValue({
      data: [{ entry_id: 'medication-entry-1' }],
      error: null,
    });
    const notThird = vi.fn(() => ({ returns }));
    const notSecond = vi.fn(() => ({ not: notThird }));
    const notFirst = vi.fn(() => ({ not: notSecond }));
    const inMock = vi.fn(() => ({ not: notFirst }));
    const select = vi.fn(() => ({ in: inMock }));
    const from = vi.fn(() => ({ select }));
    const client = { from } as unknown as AppSupabaseClient;

    await expect(
      listCompletePatientMedicationEntryIds(client, ['medication-entry-1', 'draft-entry-1']),
    ).resolves.toEqual(['medication-entry-1']);

    expect(from).toHaveBeenCalledWith('medication_details');
    expect(inMock).toHaveBeenCalledWith('entry_id', ['medication-entry-1', 'draft-entry-1']);
  });
});

describe('getPatientMedication', () => {
  it('loads a medication detail row by entry ID', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        entry_id: 'medication-entry-1',
        name: 'Vitamin D',
        dose: '1000 IU',
        notes: 'Supplement',
        is_chronic_therapy: false,
      },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const client = { from } as unknown as AppSupabaseClient;

    await expect(
      getPatientMedication(client, 'medication-entry-1', '2026-06-22T08:30:00.000Z'),
    ).resolves.toEqual({
      entryId: 'medication-entry-1',
      occurredAt: '2026-06-22T08:30:00.000Z',
      name: 'Vitamin D',
      dose: '1000 IU',
      reason: 'Supplement',
      isChronicTherapy: false,
    });

    expect(from).toHaveBeenCalledWith('medication_details');
    expect(eq).toHaveBeenCalledWith('entry_id', 'medication-entry-1');
  });
});
