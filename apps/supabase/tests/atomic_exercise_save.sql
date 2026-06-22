begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, created_at, updated_at
)
values
  ('00000000-0000-4000-8000-000000000221', 'authenticated', 'authenticated', 'atomic_exercise_patient_a@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000222', 'authenticated', 'authenticated', 'atomic_exercise_patient_b@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000223', 'authenticated', 'authenticated', 'atomic_exercise_doctor@example.test', 'test', now(), '{"app_role":"doctor"}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.user_profiles (id, role, display_name)
values
  ('00000000-0000-4000-8000-000000000221', 'patient', 'Atomic Exercise Patient A'),
  ('00000000-0000-4000-8000-000000000222', 'patient', 'Atomic Exercise Patient B'),
  ('00000000-0000-4000-8000-000000000223', 'doctor', 'Atomic Exercise Doctor')
on conflict (id) do nothing;

insert into public.patient_entries (id, patient_id, kind, occurred_at)
values (
  '10000000-0000-4000-8000-000000000222',
  '00000000-0000-4000-8000-000000000222',
  'exercise',
  '2026-06-22 09:00:00+02'
)
on conflict (id) do nothing;

insert into public.exercise_details (entry_id, activity, duration_minutes, intensity)
values ('10000000-0000-4000-8000-000000000222', 'Patient B walk', 20, 'light')
on conflict (entry_id) do nothing;

do $$
begin
  if has_function_privilege(
    'anon',
    'public.save_patient_exercise(uuid,timestamptz,text,integer,text,text)',
    'EXECUTE'
  ) then
    raise exception 'anon must not execute exercise saves';
  end if;
end $$;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000221';

do $$
declare
  cycling_entry_id uuid;
  swimming_entry_id uuid;
  exercise_count integer;
  saved_duration integer;
begin
  cycling_entry_id := public.save_patient_exercise(
    null,
    '2026-06-22 08:00:00+02',
    ' Cycling ',
    45,
    'moderate',
    ' Riverside route '
  );

  swimming_entry_id := public.save_patient_exercise(
    null,
    '2026-06-22 18:00:00+02',
    'Swimming',
    30,
    'vigorous',
    null
  );

  if cycling_entry_id = swimming_entry_id then
    raise exception 'separate exercise saves must create separate entries';
  end if;

  select count(*) into exercise_count
  from public.patient_entries
  where patient_id = '00000000-0000-4000-8000-000000000221'
    and kind = 'exercise';
  if exercise_count <> 2 then
    raise exception 'patient should have two same-day exercises, found %', exercise_count;
  end if;

  perform public.save_patient_exercise(
    cycling_entry_id,
    '2026-06-22 08:15:00+02',
    'Cycling',
    60,
    'vigorous',
    'Longer riverside route'
  );

  select duration_minutes into saved_duration
  from public.exercise_details
  where entry_id = cycling_entry_id;
  if saved_duration <> 60 then
    raise exception 'existing exercise was not updated';
  end if;

  begin
    perform public.save_patient_exercise(
      '10000000-0000-4000-8000-000000000222',
      '2026-06-22 09:00:00+02',
      'Forbidden update',
      50,
      'moderate',
      null
    );
    raise exception 'patient A must not update patient B exercise';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.save_patient_exercise(
      null,
      '2026-06-22 12:00:00+02',
      '   ',
      30,
      'light',
      null
    );
    raise exception 'blank exercise activity should fail';
  exception when invalid_parameter_value then null;
  end;

  select count(*) into exercise_count
  from public.patient_entries
  where patient_id = '00000000-0000-4000-8000-000000000221'
    and kind = 'exercise';
  if exercise_count <> 2 then
    raise exception 'failed exercise saves must not leave orphan entries';
  end if;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000223';

do $$
begin
  begin
    perform public.save_patient_exercise(
      null,
      '2026-06-22 12:00:00+02',
      'Doctor exercise',
      30,
      'light',
      null
    );
    raise exception 'doctors must not save exercises';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

rollback;
