begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, created_at, updated_at
)
values
  ('00000000-0000-4000-8000-000000000251', 'authenticated', 'authenticated', 'atomic_medication_patient_a@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000252', 'authenticated', 'authenticated', 'atomic_medication_patient_b@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000253', 'authenticated', 'authenticated', 'atomic_medication_doctor@example.test', 'test', now(), '{"app_role":"doctor"}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.user_profiles (id, role, display_name)
values
  ('00000000-0000-4000-8000-000000000251', 'patient', 'Atomic Medication Patient A'),
  ('00000000-0000-4000-8000-000000000252', 'patient', 'Atomic Medication Patient B'),
  ('00000000-0000-4000-8000-000000000253', 'doctor', 'Atomic Medication Doctor')
on conflict (id) do nothing;

insert into public.patient_entries (id, patient_id, kind, occurred_at)
values
  ('10000000-0000-4000-8000-000000000252', '00000000-0000-4000-8000-000000000252', 'medication', '2026-06-22 09:00:00+02'),
  ('10000000-0000-4000-8000-000000000258', '00000000-0000-4000-8000-000000000251', 'daily', '2026-06-22 10:00:00+02')
on conflict (id) do nothing;

insert into public.medication_details (entry_id, name, dose, notes, is_chronic_therapy)
values ('10000000-0000-4000-8000-000000000252', 'Patient B vitamin', '1000 IU', null, false)
on conflict (entry_id) do nothing;

do $$
begin
  if has_table_privilege('anon', 'public.medication_details', 'SELECT') then
    raise exception 'anon must not have medication table privileges';
  end if;
  if has_table_privilege('anon', 'public.medication_details', 'TRUNCATE') then
    raise exception 'anon must not truncate medication records';
  end if;
  if has_table_privilege('authenticated', 'public.medication_details', 'TRUNCATE') then
    raise exception 'authenticated users must not truncate medication records';
  end if;
  if has_function_privilege(
    'anon',
    'public.save_patient_medication(uuid,timestamptz,text,text,text,boolean)',
    'EXECUTE'
  ) then
    raise exception 'anon must not execute medication saves';
  end if;
end $$;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000251';

do $$
declare
  first_entry_id uuid;
  second_entry_id uuid;
  medication_count integer;
  saved_dose text;
begin
  first_entry_id := public.save_patient_medication(
    null,
    '2026-06-22 08:00:00+02',
    ' Vitamin D ',
    ' 1000 IU ',
    ' Morning supplement ',
    false
  );

  second_entry_id := public.save_patient_medication(
    null,
    '2026-06-22 18:00:00+02',
    'Ibuprofen',
    '200 mg',
    null,
    false
  );

  if first_entry_id = second_entry_id then
    raise exception 'separate medication saves must create separate entries';
  end if;

  select count(*) into medication_count
  from public.patient_entries
  where patient_id = '00000000-0000-4000-8000-000000000251'
    and kind = 'medication';
  if medication_count <> 2 then
    raise exception 'patient should have two same-day medication entries, found %', medication_count;
  end if;

  perform public.save_patient_medication(
    first_entry_id,
    '2026-06-22 08:15:00+02',
    'Vitamin D',
    '2000 IU',
    'Updated dose',
    false
  );

  select dose into saved_dose
  from public.medication_details
  where entry_id = first_entry_id;
  if saved_dose <> '2000 IU' then
    raise exception 'existing medication entry was not updated';
  end if;

  begin
    perform public.save_patient_medication(
      '10000000-0000-4000-8000-000000000252',
      '2026-06-22 09:00:00+02',
      'Forbidden update',
      '50 mg',
      null,
      false
    );
    raise exception 'patient A must not update patient B medication';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.save_patient_medication(
      null,
      '2026-06-22 12:00:00+02',
      '   ',
      '100 mg',
      null,
      false
    );
    raise exception 'blank medication name should fail';
  exception when invalid_parameter_value then null;
  end;

  begin
    insert into public.medication_details (entry_id, name, dose, is_chronic_therapy)
    values ('10000000-0000-4000-8000-000000000258', 'Wrong parent', '100 mg', false);
    raise exception 'medication details should require a medication parent entry';
  exception when check_violation then null;
  end;

  select count(*) into medication_count
  from public.patient_entries
  where patient_id = '00000000-0000-4000-8000-000000000251'
    and kind = 'medication';
  if medication_count <> 2 then
    raise exception 'failed medication saves must not leave orphan entries';
  end if;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000253';

do $$
begin
  begin
    perform public.save_patient_medication(
      null,
      '2026-06-22 12:00:00+02',
      'Doctor medication',
      '100 mg',
      null,
      false
    );
    raise exception 'doctors must not save medication entries';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

rollback;
