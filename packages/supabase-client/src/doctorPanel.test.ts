import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from './index';
import {
  createDoctorInviteCode,
  listDoctorInviteCodes,
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
});
