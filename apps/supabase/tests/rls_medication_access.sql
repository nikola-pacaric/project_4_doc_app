begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, created_at, updated_at
)
values
  ('00000000-0000-4000-8000-000000000101', 'authenticated', 'authenticated', 'medication_patient_a@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000102', 'authenticated', 'authenticated', 'medication_patient_b@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000103', 'authenticated', 'authenticated', 'medication_doctor@example.test', 'test', now(), '{"app_role":"doctor"}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.user_profiles (id, role, display_name)
values
  ('00000000-0000-4000-8000-000000000101', 'patient', 'Medication Patient A'),
  ('00000000-0000-4000-8000-000000000102', 'patient', 'Medication Patient B'),
  ('00000000-0000-4000-8000-000000000103', 'doctor', 'Medication Doctor')
on conflict (id) do nothing;

insert into public.patient_entries (id, patient_id, kind, occurred_at)
values
  ('10000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000101', 'medication', now()),
  ('10000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000102', 'medication', now())
on conflict (id) do nothing;

insert into public.medication_details (entry_id, name, dose, notes, is_chronic_therapy)
values
  ('10000000-0000-4000-8000-000000000101', 'Vitamin D', '1000 IU', 'Daily maintenance', true),
  ('10000000-0000-4000-8000-000000000102', 'Ibuprofen', '200 mg', null, false)
on conflict (entry_id) do nothing;

set local role anon;

do $$
declare
  visible_medications integer;
begin
  select count(*) into visible_medications from public.medication_details;
  if visible_medications <> 0 then
    raise exception 'unauthenticated users should see 0 medications, saw %', visible_medications;
  end if;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000101';

do $$
declare
  visible_medications integer;
  changed_rows integer;
begin
  select count(*) into visible_medications from public.medication_details;
  if visible_medications <> 1 then
    raise exception 'patient A should see exactly 1 own medication, saw %', visible_medications;
  end if;

  update public.medication_details set dose = '2000 IU'
  where entry_id = '10000000-0000-4000-8000-000000000101';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'patient A should update an own medication';
  end if;

  update public.medication_details set dose = 'not allowed'
  where entry_id = '10000000-0000-4000-8000-000000000102';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'patient A should not update patient B medication';
  end if;

  insert into public.patient_entries (id, patient_id, kind, occurred_at)
  values (
    '10000000-0000-4000-8000-000000000109',
    '00000000-0000-4000-8000-000000000101',
    'medication',
    now()
  );

  begin
    insert into public.medication_details (entry_id, name)
    values ('10000000-0000-4000-8000-000000000109', 'Incomplete medication');
    raise exception 'incomplete medication details should be rejected';
  exception
    when check_violation then null;
  end;

  insert into public.medication_details (entry_id, name, dose, is_chronic_therapy)
  values ('10000000-0000-4000-8000-000000000109', 'Paracetamol', '500 mg', false);

  delete from public.medication_details
  where entry_id = '10000000-0000-4000-8000-000000000109';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'patient A should delete an own medication';
  end if;

  delete from public.patient_entries
  where id = '10000000-0000-4000-8000-000000000109';
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000103';

do $$
declare
  visible_medications integer;
  changed_rows integer;
begin
  select count(*) into visible_medications from public.medication_details;
  if visible_medications <> 0 then
    raise exception 'unlinked doctor should see 0 medications, saw %', visible_medications;
  end if;

  update public.medication_details set dose = 'not allowed'
  where entry_id = '10000000-0000-4000-8000-000000000101';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'unlinked doctor should not update medication';
  end if;
end $$;

reset role;

insert into public.doctor_patient_access (doctor_id, patient_id)
values ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000101')
on conflict (doctor_id, patient_id)
where active = true and revoked_at is null
do nothing;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000103';

do $$
declare
  visible_medications integer;
  changed_rows integer;
begin
  select count(*) into visible_medications from public.medication_details;
  if visible_medications <> 1 then
    raise exception 'linked doctor should see exactly 1 medication, saw %', visible_medications;
  end if;

  update public.medication_details set dose = 'doctor attempted edit'
  where entry_id = '10000000-0000-4000-8000-000000000101';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'linked doctor should not update medication';
  end if;
end $$;

reset role;

rollback;
