begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, created_at, updated_at
)
values
  ('00000000-0000-4000-8000-000000000301', 'authenticated', 'authenticated', 'menstruation_patient_a@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000302', 'authenticated', 'authenticated', 'menstruation_patient_b@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000303', 'authenticated', 'authenticated', 'menstruation_doctor@example.test', 'test', now(), '{"app_role":"doctor"}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.user_profiles (id, role, display_name)
values
  ('00000000-0000-4000-8000-000000000301', 'patient', 'Menstruation Patient A'),
  ('00000000-0000-4000-8000-000000000302', 'patient', 'Menstruation Patient B'),
  ('00000000-0000-4000-8000-000000000303', 'doctor', 'Menstruation Doctor')
on conflict (id) do nothing;

insert into public.patient_baseline_profiles (
  patient_id, sex, birth_year, occupation, weight_kg, height_cm,
  recent_major_weight_change, weight_reminder_due_at
)
values
  ('00000000-0000-4000-8000-000000000301', 'female', 1990, 'Teacher', 65, 168, 'No', now() + interval '3 months'),
  ('00000000-0000-4000-8000-000000000302', 'male', 1988, 'Engineer', 82, 182, 'No', now() + interval '3 months')
on conflict (patient_id) do nothing;

insert into public.patient_entries (id, patient_id, kind, occurred_at)
values
  ('10000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000301', 'menstruation', now()),
  ('10000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000302', 'menstruation', now())
on conflict (id) do nothing;

insert into public.menstruation_events (entry_id, flow, pain_level, notes)
values
  ('10000000-0000-4000-8000-000000000301', 'moderate', 2, 'Mild cramps'),
  ('10000000-0000-4000-8000-000000000302', 'light', 1, null)
on conflict (entry_id) do nothing;

set local role anon;

do $$
declare
  visible_events integer;
begin
  select count(*) into visible_events from public.menstruation_events;
  if visible_events <> 0 then
    raise exception 'unauthenticated users should see 0 menstruation events, saw %', visible_events;
  end if;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000301';

do $$
declare
  visible_events integer;
  changed_rows integer;
begin
  select count(*) into visible_events from public.menstruation_events;
  if visible_events <> 1 then
    raise exception 'female patient A should see exactly 1 own event, saw %', visible_events;
  end if;

  update public.menstruation_events set pain_level = 3
  where entry_id = '10000000-0000-4000-8000-000000000301';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'female patient A should update an own event';
  end if;

  update public.menstruation_events set notes = 'not allowed'
  where entry_id = '10000000-0000-4000-8000-000000000302';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'patient A should not update patient B event';
  end if;

  insert into public.patient_entries (id, patient_id, kind, occurred_at)
  values (
    '10000000-0000-4000-8000-000000000309',
    '00000000-0000-4000-8000-000000000301',
    'menstruation',
    now()
  );

  begin
    insert into public.menstruation_events (entry_id, flow, pain_level)
    values ('10000000-0000-4000-8000-000000000309', 'unknown', 2);
    raise exception 'unknown menstruation flow should be rejected';
  exception
    when check_violation then null;
  end;

  begin
    insert into public.menstruation_events (entry_id, flow, pain_level)
    values ('10000000-0000-4000-8000-000000000309', 'heavy', 4);
    raise exception 'pain level outside 1-3 should be rejected';
  exception
    when check_violation then null;
  end;

  insert into public.menstruation_events (entry_id, flow, pain_level)
  values ('10000000-0000-4000-8000-000000000309', 'heavy', 3);

  delete from public.menstruation_events
  where entry_id = '10000000-0000-4000-8000-000000000309';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'female patient A should delete an own event';
  end if;

  delete from public.patient_entries
  where id = '10000000-0000-4000-8000-000000000309';
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000302';

do $$
begin
  insert into public.patient_entries (id, patient_id, kind, occurred_at)
  values (
    '10000000-0000-4000-8000-000000000308',
    '00000000-0000-4000-8000-000000000302',
    'menstruation',
    now()
  );

  begin
    insert into public.menstruation_events (entry_id, flow, pain_level)
    values ('10000000-0000-4000-8000-000000000308', 'light', 1);
    raise exception 'male patient should not create menstruation details';
  exception
    when insufficient_privilege then null;
  end;

  delete from public.patient_entries
  where id = '10000000-0000-4000-8000-000000000308';
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000303';

do $$
declare
  visible_events integer;
  changed_rows integer;
begin
  select count(*) into visible_events from public.menstruation_events;
  if visible_events <> 0 then
    raise exception 'unlinked doctor should see 0 menstruation events, saw %', visible_events;
  end if;

  update public.menstruation_events set notes = 'not allowed'
  where entry_id = '10000000-0000-4000-8000-000000000301';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'unlinked doctor should not update menstruation events';
  end if;
end $$;

reset role;

insert into public.doctor_patient_access (doctor_id, patient_id)
values ('00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000301')
on conflict (doctor_id, patient_id)
where active = true and revoked_at is null
do nothing;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000303';

do $$
declare
  visible_events integer;
  changed_rows integer;
begin
  select count(*) into visible_events from public.menstruation_events;
  if visible_events <> 1 then
    raise exception 'linked doctor should see exactly 1 event, saw %', visible_events;
  end if;

  update public.menstruation_events set notes = 'doctor attempted edit'
  where entry_id = '10000000-0000-4000-8000-000000000301';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'linked doctor should not update menstruation events';
  end if;
end $$;

reset role;

rollback;
