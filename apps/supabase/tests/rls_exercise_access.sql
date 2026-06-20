begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, created_at, updated_at
)
values
  ('00000000-0000-4000-8000-000000000201', 'authenticated', 'authenticated', 'exercise_patient_a@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000202', 'authenticated', 'authenticated', 'exercise_patient_b@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000203', 'authenticated', 'authenticated', 'exercise_doctor@example.test', 'test', now(), '{"app_role":"doctor"}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.user_profiles (id, role, display_name)
values
  ('00000000-0000-4000-8000-000000000201', 'patient', 'Exercise Patient A'),
  ('00000000-0000-4000-8000-000000000202', 'patient', 'Exercise Patient B'),
  ('00000000-0000-4000-8000-000000000203', 'doctor', 'Exercise Doctor')
on conflict (id) do nothing;

insert into public.patient_entries (id, patient_id, kind, occurred_at)
values
  ('10000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000201', 'exercise', now()),
  ('10000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000202', 'exercise', now())
on conflict (id) do nothing;

insert into public.exercise_details (entry_id, activity, duration_minutes, intensity, notes)
values
  ('10000000-0000-4000-8000-000000000201', 'Walking', 30, 'light', 'Evening walk'),
  ('10000000-0000-4000-8000-000000000202', 'Cycling', 45, 'vigorous', null)
on conflict (entry_id) do nothing;

set local role anon;

do $$
declare
  visible_exercises integer;
begin
  select count(*) into visible_exercises from public.exercise_details;
  if visible_exercises <> 0 then
    raise exception 'unauthenticated users should see 0 exercises, saw %', visible_exercises;
  end if;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000201';

do $$
declare
  visible_exercises integer;
  changed_rows integer;
begin
  select count(*) into visible_exercises from public.exercise_details;
  if visible_exercises <> 1 then
    raise exception 'patient A should see exactly 1 own exercise, saw %', visible_exercises;
  end if;

  update public.exercise_details set duration_minutes = 35
  where entry_id = '10000000-0000-4000-8000-000000000201';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'patient A should update an own exercise';
  end if;

  update public.exercise_details set activity = 'not allowed'
  where entry_id = '10000000-0000-4000-8000-000000000202';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'patient A should not update patient B exercise';
  end if;

  insert into public.patient_entries (id, patient_id, kind, occurred_at)
  values (
    '10000000-0000-4000-8000-000000000209',
    '00000000-0000-4000-8000-000000000201',
    'exercise',
    now()
  );

  begin
    insert into public.exercise_details (entry_id, activity, duration_minutes, intensity)
    values ('10000000-0000-4000-8000-000000000209', '', 30, 'light');
    raise exception 'blank exercise activity should be rejected';
  exception
    when check_violation then null;
  end;

  begin
    insert into public.exercise_details (entry_id, activity, duration_minutes, intensity)
    values ('10000000-0000-4000-8000-000000000209', 'Walking', 0, 'light');
    raise exception 'zero exercise duration should be rejected';
  exception
    when check_violation then null;
  end;

  begin
    insert into public.exercise_details (entry_id, activity, duration_minutes, intensity)
    values ('10000000-0000-4000-8000-000000000209', 'Walking', 30, 'extreme');
    raise exception 'unknown exercise intensity should be rejected';
  exception
    when check_violation then null;
  end;

  insert into public.exercise_details (entry_id, activity, duration_minutes, intensity)
  values ('10000000-0000-4000-8000-000000000209', 'Strength training', 40, 'moderate');

  delete from public.exercise_details
  where entry_id = '10000000-0000-4000-8000-000000000209';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'patient A should delete an own exercise';
  end if;

  delete from public.patient_entries
  where id = '10000000-0000-4000-8000-000000000209';
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000203';

do $$
declare
  visible_exercises integer;
  changed_rows integer;
begin
  select count(*) into visible_exercises from public.exercise_details;
  if visible_exercises <> 0 then
    raise exception 'unlinked doctor should see 0 exercises, saw %', visible_exercises;
  end if;

  update public.exercise_details set notes = 'not allowed'
  where entry_id = '10000000-0000-4000-8000-000000000201';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'unlinked doctor should not update exercise';
  end if;
end $$;

reset role;

insert into public.doctor_patient_access (doctor_id, patient_id)
values ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000201')
on conflict (doctor_id, patient_id)
where active = true and revoked_at is null
do nothing;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000203';

do $$
declare
  visible_exercises integer;
  changed_rows integer;
begin
  select count(*) into visible_exercises from public.exercise_details;
  if visible_exercises <> 1 then
    raise exception 'linked doctor should see exactly 1 exercise, saw %', visible_exercises;
  end if;

  update public.exercise_details set notes = 'doctor attempted edit'
  where entry_id = '10000000-0000-4000-8000-000000000201';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'linked doctor should not update exercise';
  end if;
end $$;

reset role;

rollback;
