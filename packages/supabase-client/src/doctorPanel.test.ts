import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from './index';
import {
  createDoctorInviteCode,
  getDoctorLinkedPatientTimeline,
  listDoctorInviteCodes,
  listLinkedPatients,
  redeemDoctorInviteCode,
  revokeDoctorInviteCode,
} from './doctorPanel';

describe('doctor invite panel client helpers', () => {
  it('lists recent doctor invite codes newest first', async () => {
    const returns = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'invite-1',
          code: 'ABC123DEF0',
          expires_at: '2026-07-14T10:00:00.000Z',
          revoked_at: null,
          redeemed_by_patient_id: null,
          redeemed_at: null,
          created_at: '2026-07-07T10:00:00.000Z',
        },
      ],
      error: null,
    });
    const limit = vi.fn(() => ({ returns }));
    const order = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ order }));
    const from = vi.fn(() => ({ select }));
    const client = { from } as unknown as AppSupabaseClient;

    const invites = await listDoctorInviteCodes(client);

    expect(from).toHaveBeenCalledWith('doctor_invite_codes');
    expect(select).toHaveBeenCalledWith(
      'id, code, expires_at, revoked_at, redeemed_by_patient_id, redeemed_at, created_at',
    );
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(limit).toHaveBeenCalledWith(12);
    expect(invites).toEqual([
      {
        id: 'invite-1',
        code: 'ABC123DEF0',
        expiresAt: '2026-07-14T10:00:00.000Z',
        revokedAt: null,
        redeemedByPatientId: null,
        redeemedAt: null,
        createdAt: '2026-07-07T10:00:00.000Z',
      },
    ]);
  });

  it('creates an invite through the guarded doctor RPC', async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: 'invite-2',
        code: 'FED987CBA0',
        expires_at: '2026-07-14T12:00:00.000Z',
      },
      error: null,
    });
    const rpc = vi.fn(() => ({ single }));
    const client = { rpc } as unknown as AppSupabaseClient;

    const invite = await createDoctorInviteCode(client);

    expect(rpc).toHaveBeenCalledWith('create_doctor_invite_code');
    expect(invite).toMatchObject({
      id: 'invite-2',
      code: 'FED987CBA0',
      expiresAt: '2026-07-14T12:00:00.000Z',
      revokedAt: null,
      redeemedByPatientId: null,
      redeemedAt: null,
    });
    expect(typeof invite.createdAt).toBe('string');
  });

  it('revokes only through the guarded doctor RPC and returns the RPC result', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    const client = { rpc } as unknown as AppSupabaseClient;

    await expect(revokeDoctorInviteCode(client, 'invite-3')).resolves.toBe(true);

    expect(rpc).toHaveBeenCalledWith('revoke_doctor_invite_code', {
      invite_code_id: 'invite-3',
    });
  });

  it('redeems an invite through the guarded patient RPC with a normalized code', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: 'access-1',
      error: null,
    });
    const client = { rpc } as unknown as AppSupabaseClient;

    await expect(redeemDoctorInviteCode(client, ' abc123def0 ')).resolves.toBe('access-1');

    expect(rpc).toHaveBeenCalledWith('redeem_doctor_invite_code', {
      invite_code: 'ABC123DEF0',
    });
  });

  it('lists active linked patients with profile display names', async () => {
    const accessRows = [
      {
        id: 'access-1',
        patient_id: 'patient-1',
        created_at: '2026-07-08T10:00:00.000Z',
      },
    ];
    const profileRows = [
      {
        id: 'patient-1',
        role: 'patient',
        display_name: 'Linked Patient',
        consent_accepted_at: '2026-07-01T10:00:00.000Z',
      },
    ];
    const accessReturns = vi.fn().mockResolvedValue({ data: accessRows, error: null });
    const accessOrder = vi.fn(() => ({ returns: accessReturns }));
    const accessIs = vi.fn(() => ({ order: accessOrder }));
    const accessEq = vi.fn(() => ({ is: accessIs }));
    const accessSelect = vi.fn(() => ({ eq: accessEq }));
    const profileReturns = vi.fn().mockResolvedValue({ data: profileRows, error: null });
    const profileIn = vi.fn(() => ({ returns: profileReturns }));
    const profileSelect = vi.fn(() => ({ in: profileIn }));
    const from = vi.fn((table: string) => {
      if (table === 'doctor_patient_access') return { select: accessSelect };
      if (table === 'user_profiles') return { select: profileSelect };
      throw new Error(`Unexpected table ${table}`);
    });
    const client = { from } as unknown as AppSupabaseClient;

    await expect(listLinkedPatients(client)).resolves.toEqual([
      {
        accessId: 'access-1',
        patientId: 'patient-1',
        displayName: 'Linked Patient',
        linkedAt: '2026-07-08T10:00:00.000Z',
      },
    ]);

    expect(accessSelect).toHaveBeenCalledWith('id, patient_id, created_at');
    expect(accessEq).toHaveBeenCalledWith('active', true);
    expect(accessIs).toHaveBeenCalledWith('revoked_at', null);
    expect(profileIn).toHaveBeenCalledWith('id', ['patient-1']);
  });

  it('loads a selected linked patient timeline through active doctor access', async () => {
    const accessMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'access-1',
        patient_id: 'patient-1',
        created_at: '2026-07-08T10:00:00.000Z',
      },
      error: null,
    });
    const accessIs = vi.fn(() => ({ maybeSingle: accessMaybeSingle }));
    const accessEqActive = vi.fn(() => ({ is: accessIs }));
    const accessEqPatient = vi.fn(() => ({ eq: accessEqActive }));
    const accessSelect = vi.fn(() => ({ eq: accessEqPatient }));

    const profileMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'patient-1',
        role: 'patient',
        display_name: 'Linked Patient',
        consent_accepted_at: '2026-07-01T10:00:00.000Z',
      },
      error: null,
    });
    const profileEq = vi.fn(() => ({ maybeSingle: profileMaybeSingle }));
    const profileSelect = vi.fn(() => ({ eq: profileEq }));

    const entryRows = [
      {
        id: 'entry-1',
        patient_id: 'patient-1',
        kind: 'note',
        occurred_at: '2026-07-08T11:00:00.000Z',
        text: 'Readonly note',
        created_at: '2026-07-08T11:00:00.000Z',
        updated_at: '2026-07-08T11:00:00.000Z',
      },
    ];
    const entryReturns = vi.fn().mockResolvedValue({ data: entryRows, error: null });
    const entryOrder = vi.fn(() => ({ returns: entryReturns }));
    const entryGte = vi.fn(() => ({ order: entryOrder }));
    const entryEq = vi.fn(() => ({ gte: entryGte }));
    const entrySelect = vi.fn(() => ({ eq: entryEq }));

    const from = vi.fn((table: string) => {
      if (table === 'doctor_patient_access') return { select: accessSelect };
      if (table === 'user_profiles') return { select: profileSelect };
      if (table === 'patient_entries') return { select: entrySelect };
      throw new Error(`Unexpected table ${table}`);
    });
    const client = { from } as unknown as AppSupabaseClient;

    const timeline = await getDoctorLinkedPatientTimeline(client, 'patient-1', 14);

    expect(accessEqPatient).toHaveBeenCalledWith('patient_id', 'patient-1');
    expect(accessEqActive).toHaveBeenCalledWith('active', true);
    expect(accessIs).toHaveBeenCalledWith('revoked_at', null);
    expect(entryEq).toHaveBeenCalledWith('patient_id', 'patient-1');
    expect(timeline.patient.displayName).toBe('Linked Patient');
    expect(timeline.entries).toHaveLength(1);
    expect(timeline.entries[0]).toMatchObject({
      id: 'entry-1',
      patientId: 'patient-1',
      text: 'Readonly note',
    });
  });

  it('rejects selected patient timeline loads without active doctor access', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const is = vi.fn(() => ({ maybeSingle }));
    const eqActive = vi.fn(() => ({ is }));
    const eqPatient = vi.fn(() => ({ eq: eqActive }));
    const select = vi.fn(() => ({ eq: eqPatient }));
    const from = vi.fn(() => ({ select }));
    const client = { from } as unknown as AppSupabaseClient;

    await expect(getDoctorLinkedPatientTimeline(client, 'patient-2')).rejects.toThrow(
      'DOCTOR_PATIENT_ACCESS_REQUIRED',
    );
  });
});
