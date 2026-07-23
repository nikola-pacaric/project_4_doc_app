import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from './index';
import {
  buildDoctorPatientAdherence,
  createDoctorPatientExportBundle,
  createDoctorPatientExport,
  createDoctorInviteCode,
  getDoctorLinkedPatientTimeline,
  getPatientDoctorLink,
  listDoctorInviteCodes,
  listLinkedPatients,
  redeemDoctorInviteCode,
  revokeDoctorInviteCode,
} from './doctorPanel';
import { listDoctorTimelineEntries } from './doctorTimeline';

describe('doctor invite panel client helpers', () => {
  it('classifies seven-day submission and required checkpoint states', () => {
    const adherence = buildDoctorPatientAdherence(
      [
        {
          occurredAt: '2026-07-20T08:00:00.000Z',
          kind: 'daily',
          text: null,
          dailyCompletedAt: null,
          symptomType: null,
        },
        {
          occurredAt: '2026-07-20T09:00:00.000Z',
          kind: 'symptom',
          text: null,
          dailyCompletedAt: null,
          symptomType: 'none',
        },
        {
          occurredAt: '2026-07-20T09:30:00.000Z',
          kind: 'note',
          text: 'No stool today',
          dailyCompletedAt: null,
          symptomType: null,
        },
        {
          occurredAt: '2026-07-19T17:00:00.000Z',
          kind: 'daily',
          text: null,
          dailyCompletedAt: '2026-07-19T20:00:00.000Z',
          symptomType: null,
        },
        {
          occurredAt: '2026-07-19T17:30:00.000Z',
          kind: 'symptom',
          text: null,
          dailyCompletedAt: null,
          symptomType: 'pain',
        },
        {
          occurredAt: '2026-07-19T18:00:00.000Z',
          kind: 'stool',
          text: null,
          dailyCompletedAt: null,
          symptomType: null,
        },
        {
          occurredAt: '2026-07-18T08:00:00.000Z',
          kind: 'meal',
          text: null,
          dailyCompletedAt: null,
          symptomType: null,
        },
      ],
      new Date('2026-07-20T12:00:00.000Z'),
    );

    expect(adherence.submittedDays).toBe(1);
    expect(adherence.days.slice(0, 4)).toEqual([
      {
        date: '2026-07-20',
        status: 'in_progress',
        symptomStatus: 'none',
        stoolStatus: 'none',
      },
      {
        date: '2026-07-19',
        status: 'submitted',
        symptomStatus: 'recorded',
        stoolStatus: 'recorded',
      },
      {
        date: '2026-07-18',
        status: 'day_ended_incomplete',
        symptomStatus: 'missing',
        stoolStatus: 'missing',
      },
      {
        date: '2026-07-17',
        status: 'no_activity',
        symptomStatus: 'missing',
        stoolStatus: 'missing',
      },
    ]);
  });
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

  it('loads the patient active doctor link without doctor identity fields', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'access-9',
        created_at: '2026-07-08T10:00:00.000Z',
      },
      error: null,
    });
    const is = vi.fn(() => ({ maybeSingle }));
    const eqActive = vi.fn(() => ({ is }));
    const eqPatient = vi.fn(() => ({ eq: eqActive }));
    const select = vi.fn(() => ({ eq: eqPatient }));
    const from = vi.fn(() => ({ select }));
    const client = { from } as unknown as AppSupabaseClient;

    await expect(getPatientDoctorLink(client, 'patient-1')).resolves.toEqual({
      accessId: 'access-9',
      linkedAt: '2026-07-08T10:00:00.000Z',
    });

    expect(from).toHaveBeenCalledWith('doctor_patient_access');
    expect(select).toHaveBeenCalledWith('id, created_at');
    expect(eqPatient).toHaveBeenCalledWith('patient_id', 'patient-1');
    expect(eqActive).toHaveBeenCalledWith('active', true);
    expect(is).toHaveBeenCalledWith('revoked_at', null);
  });

  it('returns null when the patient has no active doctor link', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const is = vi.fn(() => ({ maybeSingle }));
    const eqActive = vi.fn(() => ({ is }));
    const eqPatient = vi.fn(() => ({ eq: eqActive }));
    const select = vi.fn(() => ({ eq: eqPatient }));
    const from = vi.fn(() => ({ select }));
    const client = { from } as unknown as AppSupabaseClient;

    await expect(getPatientDoctorLink(client, 'patient-1')).resolves.toBeNull();
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
    const adherenceRows = [
      {
        patient_id: 'patient-1',
        occurred_at: '2026-07-20T08:00:00.000Z',
        kind: 'daily',
        text: null,
        daily_details: { completed_at: null },
        symptom_details: null,
      },
      {
        patient_id: 'patient-1',
        occurred_at: '2026-07-20T08:30:00.000Z',
        kind: 'symptom',
        text: null,
        daily_details: null,
        symptom_details: { symptom_type: 'none' },
      },
      {
        patient_id: 'patient-1',
        occurred_at: '2026-07-20T09:00:00.000Z',
        kind: 'note',
        text: 'No stool today',
        daily_details: null,
        symptom_details: null,
      },
      {
        patient_id: 'patient-1',
        occurred_at: '2026-07-19T18:00:00.000Z',
        kind: 'daily',
        text: null,
        daily_details: { completed_at: '2026-07-19T20:00:00.000Z' },
        symptom_details: null,
      },
    ];
    const adherenceReturns = vi.fn().mockResolvedValue({ data: adherenceRows, error: null });
    const adherenceGte = vi.fn(() => ({ returns: adherenceReturns }));
    const adherenceIn = vi.fn(() => ({ gte: adherenceGte }));
    const adherenceSelect = vi.fn(() => ({ in: adherenceIn }));
    const from = vi.fn((table: string) => {
      if (table === 'doctor_patient_access') return { select: accessSelect };
      if (table === 'user_profiles') return { select: profileSelect };
      if (table === 'patient_entries') return { select: adherenceSelect };
      throw new Error(`Unexpected table ${table}`);
    });
    const client = { from } as unknown as AppSupabaseClient;

    const patients = await listLinkedPatients(client, new Date('2026-07-20T12:00:00.000Z'));

    expect(patients).toHaveLength(1);
    expect(patients[0]).toMatchObject({
      accessId: 'access-1',
      patientId: 'patient-1',
      displayName: 'Linked Patient',
      linkedAt: '2026-07-08T10:00:00.000Z',
      adherence: {
        submittedDays: 1,
        totalDays: 7,
      },
    });
    expect(patients[0]?.adherence.days.slice(0, 2)).toEqual([
      {
        date: '2026-07-20',
        status: 'in_progress',
        symptomStatus: 'none',
        stoolStatus: 'none',
      },
      {
        date: '2026-07-19',
        status: 'submitted',
        symptomStatus: 'missing',
        stoolStatus: 'missing',
      },
    ]);

    expect(accessSelect).toHaveBeenCalledWith('id, patient_id, created_at');
    expect(accessEq).toHaveBeenCalledWith('active', true);
    expect(accessIs).toHaveBeenCalledWith('revoked_at', null);
    expect(profileIn).toHaveBeenCalledWith('id', ['patient-1']);
  });

  it('loads a linked patient baseline and all-time structured medical timeline details', async () => {
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

    const baselineMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        patient_id: 'patient-1',
        sex: 'female',
        birth_year: 1988,
        occupation: 'Teacher',
        chronic_diseases: 'Asthma',
        chronic_therapy: 'Inhaler',
        menstrual_history: 'Regular',
        weight_kg: 68,
        height_cm: 170,
        recent_major_weight_change: 'no',
        weight_reminder_due_at: '2026-10-01T10:00:00.000Z',
        created_at: '2026-07-01T10:00:00.000Z',
        updated_at: '2026-07-02T10:00:00.000Z',
      },
      error: null,
    });
    const baselineEq = vi.fn(() => ({ maybeSingle: baselineMaybeSingle }));
    const baselineSelect = vi.fn(() => ({ eq: baselineEq }));

    const emptyDetails = {
      daily_details: null,
      food_details: null,
      meal_details: null,
      fluid_details: [],
      symptom_details: null,
      stool_details: null,
      medication_details: null,
      exercise_details: null,
      menstruation_details: null,
    };
    const entryRows = [
      {
        ...emptyDetails,
        id: 'daily-1',
        patient_id: 'patient-1',
        kind: 'daily',
        occurred_at: '2026-07-08T11:00:00.000Z',
        text: null,
        created_at: '2026-07-08T11:00:00.000Z',
        updated_at: '2026-07-08T11:00:00.000Z',
        daily_details: {
          entry_id: 'daily-1',
          wake_time: '07:30:00',
          appetite: 'usual',
          had_physical_activity: true,
          sleep_notes: '07:15',
          stress_level: 2,
          day_description: 'A steady day',
          took_chronic_therapy: true,
          took_medication_outside_chronic_therapy: false,
          medication_outside_chronic_therapy: null,
          had_menstruation: false,
          menstruation_notes: null,
          energy_level: 3,
          had_naps: false,
          naps: null,
          completed_at: '2026-07-08T20:00:00.000Z',
        },
        food_details: {
          entry_id: 'daily-1',
          water_liters: 2.25,
          has_other_fluids: true,
          other_fluids: 'Coffee',
        },
      },
      {
        ...emptyDetails,
        id: 'symptom-1',
        patient_id: 'patient-1',
        kind: 'symptom',
        occurred_at: '2026-07-08T10:00:00.000Z',
        text: null,
        created_at: '2026-07-08T10:00:00.000Z',
        updated_at: '2026-07-08T10:00:00.000Z',
        symptom_details: {
          entry_id: 'symptom-1',
          symptom_type: 'pain',
          custom_type: null,
          custom_description: 'After breakfast',
          intake_list: 'Coffee',
          started_at: '2026-07-08T09:45:00.000Z',
          ended_at: null,
          intensity: 2,
          quality_of_life_effect: 'Paused work',
          modifying_factors: 'Rest helped',
          woke_from_sleep: false,
          pain_location: 'upper_abdomen',
          pain_location_custom: null,
          pain_radiates: false,
          pain_radiation: null,
          pain_description: 'cramping',
          pain_description_custom: null,
        },
      },
      {
        ...emptyDetails,
        id: 'stool-1',
        patient_id: 'patient-1',
        kind: 'stool',
        occurred_at: '2026-07-08T09:00:00.000Z',
        text: null,
        created_at: '2026-07-08T09:00:00.000Z',
        updated_at: '2026-07-08T09:00:00.000Z',
        stool_details: {
          entry_id: 'stool-1',
          bristol_type: 4,
          urgency_level: 'mild',
          pain: false,
          mucus: false,
          blood: false,
          fatty_stool: false,
          black_stool: false,
          notes: null,
        },
      },
      {
        ...emptyDetails,
        id: 'medication-1',
        patient_id: 'patient-1',
        kind: 'medication',
        occurred_at: '2026-07-08T08:00:00.000Z',
        text: null,
        created_at: '2026-07-08T08:00:00.000Z',
        updated_at: '2026-07-08T08:00:00.000Z',
        medication_details: {
          entry_id: 'medication-1',
          name: 'Vitamin D',
          dose: '1000 IU',
          notes: 'With breakfast',
          is_chronic_therapy: true,
        },
      },
      {
        ...emptyDetails,
        id: 'meal-1',
        patient_id: 'patient-1',
        kind: 'meal',
        occurred_at: '2026-07-08T07:45:00.000Z',
        text: null,
        created_at: '2026-07-08T07:45:00.000Z',
        updated_at: '2026-07-08T07:45:00.000Z',
        meal_details: {
          entry_id: 'meal-1',
          meal_type: 'breakfast',
          name: 'Oatmeal',
          description: 'With berries',
        },
      },
      {
        ...emptyDetails,
        id: 'fluid-1',
        patient_id: 'patient-1',
        kind: 'fluid',
        occurred_at: '2026-07-08T07:30:00.000Z',
        text: null,
        created_at: '2026-07-08T07:30:00.000Z',
        updated_at: '2026-07-08T07:30:00.000Z',
        fluid_details: [
          {
            entry_id: 'fluid-1',
            daily_entry_id: 'daily-1',
            occurred_at: '2026-07-08T07:30:00.000Z',
            name: 'Coffee',
          },
        ],
      },
      {
        ...emptyDetails,
        id: 'exercise-1',
        patient_id: 'patient-1',
        kind: 'exercise',
        occurred_at: '2026-07-08T07:00:00.000Z',
        text: null,
        created_at: '2026-07-08T07:00:00.000Z',
        updated_at: '2026-07-08T07:00:00.000Z',
        exercise_details: {
          entry_id: 'exercise-1',
          activity: 'Walking',
          duration_minutes: 30,
          intensity: 'moderate',
          notes: 'Before breakfast',
        },
      },
      {
        ...emptyDetails,
        id: 'menstruation-1',
        patient_id: 'patient-1',
        kind: 'menstruation',
        occurred_at: '2026-07-08T06:30:00.000Z',
        text: null,
        created_at: '2026-07-08T06:30:00.000Z',
        updated_at: '2026-07-08T06:30:00.000Z',
        menstruation_details: {
          entry_id: 'menstruation-1',
          flow: 'moderate',
          pain_level: 2,
          notes: 'Morning',
        },
      },
    ];
    const entryReturns = vi.fn().mockResolvedValue({ data: entryRows, error: null });
    const entryRange = vi.fn(() => ({ returns: entryReturns }));
    const entryOrderById = vi.fn(() => ({ range: entryRange }));
    const entryOrder = vi.fn(() => ({ order: entryOrderById }));
    const entryEq = vi.fn(() => ({ order: entryOrder }));
    const entrySelect = vi.fn(() => ({ eq: entryEq }));

    const from = vi.fn((table: string) => {
      if (table === 'doctor_patient_access') return { select: accessSelect };
      if (table === 'user_profiles') return { select: profileSelect };
      if (table === 'patient_baseline_profiles') return { select: baselineSelect };
      if (table === 'patient_entries') return { select: entrySelect };
      throw new Error(`Unexpected table ${table}`);
    });
    const client = { from } as unknown as AppSupabaseClient;

    const timeline = await getDoctorLinkedPatientTimeline(
      client,
      'patient-1',
      new Date('2026-07-20T12:00:00.000Z'),
    );

    expect(accessEqPatient).toHaveBeenCalledWith('patient_id', 'patient-1');
    expect(accessEqActive).toHaveBeenCalledWith('active', true);
    expect(accessIs).toHaveBeenCalledWith('revoked_at', null);
    expect(entryEq).toHaveBeenCalledWith('patient_id', 'patient-1');
    expect(entryOrder).toHaveBeenCalledWith('occurred_at', { ascending: false });
    expect(entryOrderById).toHaveBeenCalledWith('id', { ascending: false });
    expect(entryRange).toHaveBeenCalledWith(0, 499);
    expect(entrySelect).toHaveBeenCalledWith(
      expect.stringContaining('daily_details:daily_form_details'),
    );
    expect(entrySelect).toHaveBeenCalledWith(
      expect.stringContaining('symptom_details:symptom_details'),
    );
    expect(timeline.patient.displayName).toBe('Linked Patient');
    expect(timeline.baseline).toMatchObject({
      patientId: 'patient-1',
      birthYear: 1988,
      chronicDiseases: 'Asthma',
    });
    expect(timeline.entries).toHaveLength(8);
    expect(timeline.entries[0]?.medicalDetails.daily).toMatchObject({
      wakeTime: '07:30',
      sleepDuration: '07:15',
      appetite: 'usual',
      stressLevel: 2,
    });
    expect(timeline.entries[0]?.medicalDetails.food).toMatchObject({
      waterLiters: 2.25,
      otherFluidsDisplay: 'Coffee',
    });
    expect(timeline.entries[1]?.medicalDetails.symptom).toMatchObject({
      type: 'pain',
      intensity: 2,
      painLocation: 'upper_abdomen',
    });
    expect(timeline.entries[2]?.medicalDetails.stool).toMatchObject({
      bristolType: 4,
      urgencyLevel: 'mild',
      blood: false,
    });
    expect(timeline.entries[3]?.medicalDetails.medication).toMatchObject({
      name: 'Vitamin D',
      dose: '1000 IU',
      isChronicTherapy: true,
    });
    expect(timeline.entries[4]?.medicalDetails.meal).toMatchObject({
      type: 'breakfast',
      name: 'Oatmeal',
    });
    expect(timeline.entries[5]?.medicalDetails.fluid).toMatchObject({
      dailyEntryId: 'daily-1',
      name: 'Coffee',
    });
    expect(timeline.entries[6]?.medicalDetails.exercise).toMatchObject({
      activity: 'Walking',
      durationMinutes: 30,
      intensity: 'moderate',
    });
    expect(timeline.entries[7]?.medicalDetails.menstruation).toMatchObject({
      flow: 'moderate',
      painLevel: 2,
    });
  });

  it('paginates through the complete linked-patient timeline', async () => {
    const emptyDetails = {
      daily_details: null,
      food_details: null,
      meal_details: null,
      fluid_details: [],
      symptom_details: null,
      stool_details: null,
      medication_details: null,
      exercise_details: null,
      menstruation_details: null,
    };
    const baseRow = {
      ...emptyDetails,
      patient_id: 'patient-1',
      kind: 'note',
      occurred_at: '2026-04-01T08:00:00.000Z',
      text: 'Historical note',
      created_at: '2026-04-01T08:00:00.000Z',
      updated_at: '2026-04-01T08:00:00.000Z',
    };
    const firstPage = Array.from({ length: 500 }, (_, index) => ({
      ...baseRow,
      id: `entry-${index}`,
    }));
    const secondPage = [{ ...baseRow, id: 'entry-500' }];
    const returns = vi
      .fn()
      .mockResolvedValueOnce({ data: firstPage, error: null })
      .mockResolvedValueOnce({ data: secondPage, error: null });
    const range = vi.fn(() => ({ returns }));
    const orderById = vi.fn(() => ({ range }));
    const orderByOccurredAt = vi.fn(() => ({ order: orderById }));
    const eq = vi.fn(() => ({ order: orderByOccurredAt }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const client = { from } as unknown as AppSupabaseClient;

    const entries = await listDoctorTimelineEntries(client, 'patient-1');

    expect(entries).toHaveLength(501);
    expect(entries.at(-1)).toMatchObject({
      id: 'entry-500',
      occurredAt: '2026-04-01T08:00:00.000Z',
    });
    expect(eq).toHaveBeenCalledTimes(2);
    expect(eq).toHaveBeenCalledWith('patient_id', 'patient-1');
    expect(orderByOccurredAt).toHaveBeenCalledWith('occurred_at', { ascending: false });
    expect(orderById).toHaveBeenCalledWith('id', { ascending: false });
    expect(range).toHaveBeenNthCalledWith(1, 0, 499);
    expect(range).toHaveBeenNthCalledWith(2, 500, 999);
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

  it('creates a selected-day patient export through the guarded RPC', async () => {
    const payload = {
      schemaVersion: 1,
      exportRequestId: 'export-1',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      mode: 'all_data',
      range: {
        type: 'selected_day',
        selectedDate: '2026-07-08',
        start: '2026-07-08T00:00:00.000Z',
        end: '2026-07-09T00:00:00.000Z',
      },
      generatedAt: '2026-07-08T13:00:00.000Z',
      metadata: {
        entryCount: 0,
        containsImageBinary: false,
        imageReferenceType: 'none',
      },
      baseline: {},
      entries: [],
    };
    const rpc = vi.fn().mockResolvedValue({ data: payload, error: null });
    const client = { rpc } as unknown as AppSupabaseClient;

    await expect(
      createDoctorPatientExport(client, {
        patientId: 'patient-1',
        mode: 'all_data',
        range: { type: 'selected_day', date: '2026-07-08' },
      }),
    ).resolves.toEqual(payload);

    expect(rpc).toHaveBeenCalledWith('export_patient_data', {
      target_patient_id: 'patient-1',
      export_mode: 'all_data',
      export_range_type: 'selected_day',
      selected_date: '2026-07-08',
      selected_month: undefined,
    });
  });

  it('creates a partial-month patient export with image reference mode', async () => {
    const payload = {
      schemaVersion: 1,
      exportRequestId: 'export-2',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      mode: 'images_only_with_labels',
      range: {
        type: 'partial_month',
        selectedMonth: '2026-07-01',
        start: '2026-07-01T00:00:00.000Z',
        end: '2026-07-08T13:00:00.000Z',
      },
      generatedAt: '2026-07-08T13:00:00.000Z',
      metadata: {
        entryCount: 1,
        containsImageBinary: false,
        imageReferenceType: 'storage_path',
      },
      baseline: {},
      entries: [{ entryId: 'entry-1', label: 'Lunch photo' }],
    };
    const rpc = vi.fn().mockResolvedValue({ data: payload, error: null });
    const client = { rpc } as unknown as AppSupabaseClient;

    await expect(
      createDoctorPatientExport(client, {
        patientId: 'patient-1',
        mode: 'images_only_with_labels',
        range: { type: 'partial_month', month: '2026-07-01' },
      }),
    ).resolves.toEqual(payload);

    expect(rpc).toHaveBeenCalledWith('export_patient_data', {
      target_patient_id: 'patient-1',
      export_mode: 'images_only_with_labels',
      export_range_type: 'partial_month',
      selected_date: undefined,
      selected_month: '2026-07-01',
    });
  });

  it('creates an all-time patient export without a selected date or month', async () => {
    const payload = {
      schemaVersion: 1,
      exportRequestId: 'export-all-time',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      mode: 'all_data',
      range: {
        type: 'all_time',
        start: '2026-01-01T00:00:00.000Z',
        end: '2026-07-10T12:00:00.000Z',
      },
      generatedAt: '2026-07-10T12:00:00.000Z',
      metadata: {
        entryCount: 3,
        containsImageBinary: false,
        imageReferenceType: 'none',
      },
      baseline: {},
      entries: [],
    };
    const rpc = vi.fn().mockResolvedValue({ data: payload, error: null });
    const client = { rpc } as unknown as AppSupabaseClient;

    await expect(
      createDoctorPatientExport(client, {
        patientId: 'patient-1',
        mode: 'all_data',
        range: { type: 'all_time' },
      }),
    ).resolves.toEqual(payload);

    expect(rpc).toHaveBeenCalledWith('export_patient_data', {
      target_patient_id: 'patient-1',
      export_mode: 'all_data',
      export_range_type: 'all_time',
      selected_date: undefined,
      selected_month: undefined,
    });
  });

  it('rejects unsafe export payloads before returning them to the UI', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        schemaVersion: 1,
        exportRequestId: 'export-3',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        mode: 'all_data_with_images',
        range: {
          type: 'selected_day',
          start: '2026-07-08T00:00:00.000Z',
          end: '2026-07-09T00:00:00.000Z',
        },
        generatedAt: '2026-07-08T13:00:00.000Z',
        metadata: {
          entryCount: 1,
          containsImageBinary: false,
          imageReferenceType: 'storage_path',
        },
        baseline: {},
        entries: [{ photo: 'data:image/jpeg;base64,abc123' }],
      },
      error: null,
    });
    const client = { rpc } as unknown as AppSupabaseClient;

    await expect(
      createDoctorPatientExport(client, {
        patientId: 'patient-1',
        mode: 'all_data_with_images',
        range: { type: 'selected_day', date: '2026-07-08' },
      }),
    ).rejects.toThrow('EXPORT_PAYLOAD_BASE64_UNSAFE');
  });

  it('builds a ZIP export bundle with JSON, images, and thumbnails', async () => {
    const payload = {
      schemaVersion: 1,
      exportRequestId: 'export-4',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      mode: 'all_data_with_images',
      range: {
        type: 'selected_day',
        selectedDate: '2026-07-08',
        start: '2026-07-08T00:00:00.000Z',
        end: '2026-07-09T00:00:00.000Z',
      },
      generatedAt: '2026-07-08T13:00:00.000Z',
      metadata: {
        entryCount: 1,
        containsImageBinary: false,
        imageReferenceType: 'storage_path',
      },
      baseline: {},
      entries: [
        {
          id: 'entry-1',
          photos: [
            {
              photoPath: 'patients/patient-1/entries/entry-1/photos/photo-1.jpg',
              thumbnailPath: 'patients/patient-1/entries/entry-1/thumbs/photo-1.jpg',
            },
          ],
        },
      ],
    };
    const rpc = vi.fn().mockResolvedValue({ data: payload, error: null });
    const download = vi
      .fn()
      .mockResolvedValueOnce({ data: new Blob([new Uint8Array([0xff, 0xd8, 0xff])]), error: null })
      .mockResolvedValueOnce({
        data: new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])]),
        error: null,
      });
    const storageFrom = vi.fn(() => ({ download }));
    const client = { rpc, storage: { from: storageFrom } } as unknown as AppSupabaseClient;

    const bundle = await createDoctorPatientExportBundle(client, {
      patientId: 'patient-1',
      mode: 'all_data_with_images',
      range: { type: 'selected_day', date: '2026-07-08' },
    });
    const zipText = new TextDecoder().decode(bundle.zipBytes);

    expect(bundle.fileName).toBe('patient-export-patient--2026-07-08-all_data_with_images.zip');
    expect(bundle.imageFileCount).toBe(2);
    expect(storageFrom).toHaveBeenCalledWith('patient-entry-photos');
    expect(download).toHaveBeenCalledWith('patients/patient-1/entries/entry-1/photos/photo-1.jpg');
    expect(download).toHaveBeenCalledWith('patients/patient-1/entries/entry-1/thumbs/photo-1.jpg');
    expect(zipText).toContain('export.json');
    expect(zipText).toContain('images/photo-1.jpg');
    expect(zipText).toContain('thumbs/photo-1.jpg');
  });

  it('builds a JSON-only ZIP without downloading images for all_data exports', async () => {
    const payload = {
      schemaVersion: 1,
      exportRequestId: 'export-5',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      mode: 'all_data',
      range: {
        type: 'partial_month',
        selectedMonth: '2026-07-01',
        start: '2026-07-01T00:00:00.000Z',
        end: '2026-07-08T13:00:00.000Z',
      },
      generatedAt: '2026-07-08T13:00:00.000Z',
      metadata: {
        entryCount: 1,
        containsImageBinary: false,
        imageReferenceType: 'none',
      },
      baseline: {},
      entries: [{ id: 'entry-1' }],
    };
    const rpc = vi.fn().mockResolvedValue({ data: payload, error: null });
    const download = vi.fn();
    const storageFrom = vi.fn(() => ({ download }));
    const client = { rpc, storage: { from: storageFrom } } as unknown as AppSupabaseClient;

    const bundle = await createDoctorPatientExportBundle(client, {
      patientId: 'patient-1',
      mode: 'all_data',
      range: { type: 'partial_month', month: '2026-07-01' },
    });

    expect(bundle.fileName).toBe('patient-export-patient--2026-07-all_data.zip');
    expect(bundle.imageFileCount).toBe(0);
    expect(download).not.toHaveBeenCalled();
  });

  it('uses a supplied native image loader instead of the storage Blob download path', async () => {
    const payload = {
      schemaVersion: 1,
      exportRequestId: 'export-7',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      mode: 'images_only_with_labels',
      range: {
        type: 'selected_day',
        selectedDate: '2026-07-08',
        start: '2026-07-08T00:00:00.000Z',
        end: '2026-07-09T00:00:00.000Z',
      },
      generatedAt: '2026-07-08T13:00:00.000Z',
      metadata: {
        entryCount: 1,
        containsImageBinary: false,
        imageReferenceType: 'storage_path',
      },
      baseline: {},
      entries: [
        {
          id: 'entry-1',
          photos: [
            {
              photoPath: 'patients/patient-1/entries/entry-1/photos/photo-1.jpg',
              thumbnailPath: 'patients/patient-1/entries/entry-1/thumbs/photo-1.jpg',
            },
          ],
        },
      ],
    };
    const rpc = vi.fn().mockResolvedValue({ data: payload, error: null });
    const storageFrom = vi.fn();
    const imageBytesLoader = vi.fn().mockResolvedValue(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]));
    const client = { rpc, storage: { from: storageFrom } } as unknown as AppSupabaseClient;

    const bundle = await createDoctorPatientExportBundle(client, {
      patientId: 'patient-1',
      mode: 'images_only_with_labels',
      range: { type: 'selected_day', date: '2026-07-08' },
      imageBytesLoader,
    });

    expect(imageBytesLoader).toHaveBeenCalledTimes(2);
    expect(storageFrom).not.toHaveBeenCalled();
    expect(bundle.imageFileCount).toBe(2);
  });

  it('uses an all-time label in the exported ZIP filename', async () => {
    const payload = {
      schemaVersion: 1,
      exportRequestId: 'export-6',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      mode: 'all_data',
      range: {
        type: 'all_time',
        start: '2026-01-01T00:00:00.000Z',
        end: '2026-07-10T12:00:00.000Z',
      },
      generatedAt: '2026-07-10T12:00:00.000Z',
      metadata: {
        entryCount: 0,
        containsImageBinary: false,
        imageReferenceType: 'none',
      },
      baseline: {},
      entries: [],
    };
    const rpc = vi.fn().mockResolvedValue({ data: payload, error: null });
    const download = vi.fn();
    const storageFrom = vi.fn(() => ({ download }));
    const client = { rpc, storage: { from: storageFrom } } as unknown as AppSupabaseClient;

    const bundle = await createDoctorPatientExportBundle(client, {
      patientId: 'patient-1',
      mode: 'all_data',
      range: { type: 'all_time' },
    });

    expect(bundle.fileName).toBe('patient-export-patient--all-time-all_data.zip');
    expect(bundle.imageFileCount).toBe(0);
    expect(download).not.toHaveBeenCalled();
  });
});
