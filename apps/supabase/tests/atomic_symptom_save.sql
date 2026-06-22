begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, created_at, updated_at
)
values
  ('00000000-0000-4000-8000-000000000801', 'authenticated', 'authenticated', 'atomic_symptom_patient_a@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000802', 'authenticated', 'authenticated', 'atomic_symptom_patient_b@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000803', 'authenticated', 'authenticated', 'atomic_symptom_doctor@example.test', 'test', now(), '{"app_role":"doctor"}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.user_profiles (id, role, display_name)
values
  ('00000000-0000-4000-8000-000000000801', 'patient', 'Atomic Symptom Patient A'),
  ('00000000-0000-4000-8000-000000000802', 'patient', 'Atomic Symptom Patient B'),
  ('00000000-0000-4000-8000-000000000803', 'doctor', 'Atomic Symptom Doctor')
on conflict (id) do nothing;

insert into public.patient_entries (id, patient_id, kind, occurred_at)
values
  ('10000000-0000-4000-8000-000000000802', '00000000-0000-4000-8000-000000000802', 'symptom', '2026-06-22 09:00:00+02'),
  ('10000000-0000-4000-8000-000000000809', '00000000-0000-4000-8000-000000000801', 'daily', '2026-06-22 12:00:00+02')
on conflict (id) do nothing;

insert into public.symptom_details (
  entry_id, symptom_type, started_at, intensity, woke_from_sleep
)
values (
  '10000000-0000-4000-8000-000000000802', 'nausea', '2026-06-22 09:00:00+02', 1, false
)
on conflict (entry_id) do nothing;

do $$
begin
  if has_table_privilege('anon', 'public.symptom_details', 'SELECT') then
    raise exception 'anon must not have symptom table privileges';
  end if;
  if has_table_privilege('anon', 'public.symptom_details', 'TRUNCATE') then
    raise exception 'anon must not truncate symptoms';
  end if;
  if has_table_privilege('authenticated', 'public.symptom_details', 'TRUNCATE') then
    raise exception 'authenticated users must not truncate symptoms';
  end if;
  if has_function_privilege(
    'anon',
    'public.save_patient_symptoms(timestamptz,timestamptz,jsonb)',
    'EXECUTE'
  ) then
    raise exception 'anon must not execute symptom saves';
  end if;
end $$;

set local role anon;

do $$
begin
  begin
    perform count(*) from public.symptom_details;
    raise exception 'anon should not have table access to symptoms';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000801';

do $$
declare
  bloating_entry_id uuid;
  symptom_count integer;
  saved_intensity integer;
  changed_rows integer;
begin
  perform public.save_patient_symptoms(
    '2026-06-22 00:00:00+02',
    '2026-06-23 00:00:00+02',
    '[{"symptom_type":"bloating","started_at":"2026-06-22T08:00:00+02:00","ended_at":null,"intensity":1,"modifying_factors":null,"woke_from_sleep":false}]'::jsonb
  );

  select entry.id into bloating_entry_id
  from public.patient_entries entry
  join public.symptom_details details on details.entry_id = entry.id
  where entry.patient_id = '00000000-0000-4000-8000-000000000801'
    and details.symptom_type = 'bloating';
  if bloating_entry_id is null then raise exception 'initial symptom checkpoint was not saved'; end if;

  perform public.save_patient_symptoms(
    '2026-06-22 00:00:00+02',
    '2026-06-23 00:00:00+02',
    jsonb_build_array(
      jsonb_build_object(
        'entry_id', bloating_entry_id,
        'symptom_type', 'bloating',
        'started_at', '2026-06-22T08:00:00+02:00',
        'ended_at', '2026-06-22T08:45:00+02:00',
        'intensity', 2,
        'modifying_factors', 'Improved after walking',
        'woke_from_sleep', false
      ),
      jsonb_build_object(
        'symptom_type', 'pain',
        'started_at', '2026-06-22T10:00:00+02:00',
        'ended_at', null,
        'intensity', 3,
        'modifying_factors', null,
        'woke_from_sleep', true,
        'pain_location', 'lower_abdomen',
        'pain_radiates', false,
        'pain_description', 'cramping'
      )
    )
  );

  select count(*) into symptom_count
  from public.patient_entries
  where patient_id = '00000000-0000-4000-8000-000000000801'
    and kind = 'symptom';
  if symptom_count <> 2 then raise exception 'later checkpoint should contain two symptoms'; end if;

  begin
    perform public.save_patient_symptoms(
      '2026-06-22 00:00:00+02',
      '2026-06-23 00:00:00+02',
      jsonb_build_array(
        jsonb_build_object(
          'entry_id', bloating_entry_id,
          'symptom_type', 'bloating',
          'started_at', '2026-06-22T08:00:00+02:00',
          'ended_at', null,
          'intensity', 1,
          'woke_from_sleep', false
        ),
        jsonb_build_object(
          'entry_id', '10000000-0000-4000-8000-000000000802',
          'symptom_type', 'nausea',
          'started_at', '2026-06-22T09:00:00+02:00',
          'ended_at', null,
          'intensity', 2,
          'woke_from_sleep', false
        )
      )
    );
    raise exception 'cross-patient symptom update should fail';
  exception when insufficient_privilege then null;
  end;

  select intensity into saved_intensity
  from public.symptom_details
  where entry_id = bloating_entry_id;
  if saved_intensity <> 2 then
    raise exception 'failed checkpoint should roll the first symptom back, found %', saved_intensity;
  end if;

  begin
    perform public.save_patient_symptoms(
      '2026-06-22 00:00:00+02',
      '2026-06-23 00:00:00+02',
      '[{"symptom_type":"pain","started_at":"2026-06-22T11:00:00+02:00","ended_at":null,"intensity":2,"woke_from_sleep":false}]'::jsonb
    );
    raise exception 'pain without structured details should fail';
  exception when check_violation then null;
  end;

  perform public.save_patient_symptoms(
    '2026-06-22 00:00:00+02',
    '2026-06-23 00:00:00+02',
    jsonb_build_array(
      jsonb_build_object(
        'entry_id', bloating_entry_id,
        'symptom_type', 'bloating',
        'started_at', '2026-06-22T08:00:00+02:00',
        'ended_at', '2026-06-22T08:45:00+02:00',
        'intensity', 2,
        'modifying_factors', 'Improved after walking',
        'woke_from_sleep', false
      )
    )
  );

  select count(*) into symptom_count
  from public.patient_entries
  where patient_id = '00000000-0000-4000-8000-000000000801'
    and kind = 'symptom';
  if symptom_count <> 1 then raise exception 'deselected symptom should be removed'; end if;

  begin
    insert into public.symptom_details (
      entry_id, symptom_type, started_at, intensity, woke_from_sleep
    ) values (
      '10000000-0000-4000-8000-000000000809', 'nausea', now(), 1, false
    );
    raise exception 'symptom details should require a symptom parent';
  exception when check_violation then null;
  end;

  update public.symptom_details set intensity = 3
  where entry_id = '10000000-0000-4000-8000-000000000802';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then raise exception 'patient A should not update patient B symptom'; end if;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000803';

do $$
begin
  begin
    perform public.save_patient_symptoms(
      '2026-06-22 00:00:00+02',
      '2026-06-23 00:00:00+02',
      '[{"symptom_type":"nausea","started_at":"2026-06-22T12:00:00+02:00","ended_at":null,"intensity":1,"woke_from_sleep":false}]'::jsonb
    );
    raise exception 'doctors must not save symptoms';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

insert into public.doctor_patient_access (doctor_id, patient_id)
values ('00000000-0000-4000-8000-000000000803', '00000000-0000-4000-8000-000000000801')
on conflict (doctor_id, patient_id)
where active = true and revoked_at is null
do nothing;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000803';

do $$
declare
  visible_symptoms integer;
  changed_rows integer;
begin
  select count(*) into visible_symptoms from public.symptom_details;
  if visible_symptoms <> 1 then raise exception 'linked doctor should see 1 linked symptom'; end if;

  update public.symptom_details set intensity = 3
  where entry_id in (
    select id from public.patient_entries
    where patient_id = '00000000-0000-4000-8000-000000000801'
  );
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then raise exception 'linked doctor must not update symptoms'; end if;
end $$;

reset role;

rollback;
