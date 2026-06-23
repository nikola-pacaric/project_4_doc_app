begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, created_at, updated_at
)
values
  ('00000000-0000-4000-8000-000000000261', 'authenticated', 'authenticated', 'atomic_period_patient_a@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000262', 'authenticated', 'authenticated', 'atomic_period_patient_b@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000263', 'authenticated', 'authenticated', 'atomic_period_doctor@example.test', 'test', now(), '{"app_role":"doctor"}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.user_profiles (id, role, display_name)
values
  ('00000000-0000-4000-8000-000000000261', 'patient', 'Atomic Period Patient A'),
  ('00000000-0000-4000-8000-000000000262', 'patient', 'Atomic Period Patient B'),
  ('00000000-0000-4000-8000-000000000263', 'doctor', 'Atomic Period Doctor')
on conflict (id) do nothing;

insert into public.patient_baseline_profiles (
  patient_id, sex, birth_year, occupation, weight_kg, height_cm,
  recent_major_weight_change, weight_reminder_due_at
)
values
  ('00000000-0000-4000-8000-000000000261', 'female', 1990, 'Teacher', 65, 168, 'No', now() + interval '3 months'),
  ('00000000-0000-4000-8000-000000000262', 'male', 1988, 'Engineer', 82, 182, 'No', now() + interval '3 months')
on conflict (patient_id) do nothing;

insert into public.patient_entries (id, patient_id, kind, occurred_at, text)
values
  ('10000000-0000-4000-8000-000000000262', '00000000-0000-4000-8000-000000000262', 'menstruation', '2026-06-23 09:00:00+02', null),
  ('10000000-0000-4000-8000-000000000268', '00000000-0000-4000-8000-000000000261', 'daily', '2026-06-23 10:00:00+02', null),
  ('10000000-0000-4000-8000-000000000269', '00000000-0000-4000-8000-000000000262', 'note', '2026-06-23 11:00:00+02', 'Patient B note')
on conflict (id) do nothing;

insert into public.menstruation_events (entry_id, flow, pain_level, notes)
values ('10000000-0000-4000-8000-000000000262', 'light', 1, null)
on conflict (entry_id) do nothing;

do $$
begin
  if has_table_privilege('anon', 'public.menstruation_events', 'SELECT') then
    raise exception 'anon must not have menstruation table privileges';
  end if;
  if has_table_privilege('anon', 'public.menstruation_events', 'TRUNCATE') then
    raise exception 'anon must not truncate period records';
  end if;
  if has_table_privilege('authenticated', 'public.menstruation_events', 'TRUNCATE') then
    raise exception 'authenticated users must not truncate period records';
  end if;
  if has_function_privilege(
    'anon',
    'public.save_patient_menstruation(uuid,timestamptz,text,integer,text)',
    'EXECUTE'
  ) then
    raise exception 'anon must not execute period saves';
  end if;
  if has_function_privilege(
    'anon',
    'public.save_patient_note(uuid,timestamptz,text)',
    'EXECUTE'
  ) then
    raise exception 'anon must not execute note saves';
  end if;
end $$;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000261';

do $$
declare
  first_period_id uuid;
  second_period_id uuid;
  note_row record;
  period_count integer;
  note_count integer;
  saved_flow text;
begin
  first_period_id := public.save_patient_menstruation(
    null,
    '2026-06-23 08:00:00+02',
    'moderate',
    2,
    ' Mild cramps '
  );

  second_period_id := public.save_patient_menstruation(
    null,
    '2026-06-23 18:00:00+02',
    'heavy',
    3,
    null
  );

  if first_period_id = second_period_id then
    raise exception 'separate period saves must create separate entries';
  end if;

  select count(*) into period_count
  from public.patient_entries
  where patient_id = '00000000-0000-4000-8000-000000000261'
    and kind = 'menstruation';
  if period_count <> 2 then
    raise exception 'patient should have two same-day period entries, found %', period_count;
  end if;

  perform public.save_patient_menstruation(
    first_period_id,
    '2026-06-23 08:15:00+02',
    'light',
    1,
    'Updated'
  );

  select flow into saved_flow
  from public.menstruation_events
  where entry_id = first_period_id;
  if saved_flow <> 'light' then
    raise exception 'existing period entry was not updated';
  end if;

  begin
    perform public.save_patient_menstruation(
      '10000000-0000-4000-8000-000000000262',
      '2026-06-23 09:00:00+02',
      'heavy',
      3,
      null
    );
    raise exception 'patient A must not update patient B period entry';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.save_patient_menstruation(
      null,
      '2026-06-23 12:00:00+02',
      'unknown',
      2,
      null
    );
    raise exception 'invalid period flow should fail';
  exception when invalid_parameter_value then null;
  end;

  begin
    insert into public.menstruation_events (entry_id, flow, pain_level)
    values ('10000000-0000-4000-8000-000000000268', 'light', 1);
    raise exception 'period details should require a menstruation parent entry';
  exception when check_violation then null;
  end;

  select *
  into note_row
  from public.save_patient_note(null, '2026-06-23 13:00:00+02', ' First note ');

  if note_row.kind <> 'note' or note_row.text <> 'First note' then
    raise exception 'note save should return a trimmed note row';
  end if;

  perform public.save_patient_note(note_row.id, '2026-06-23 13:15:00+02', 'Updated note');

  begin
    perform public.save_patient_note('10000000-0000-4000-8000-000000000269', '2026-06-23 13:15:00+02', 'Forbidden note');
    raise exception 'patient A must not update patient B note';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.save_patient_note(null, '2026-06-23 14:00:00+02', '   ');
    raise exception 'blank note text should fail';
  exception when invalid_parameter_value then null;
  end;

  select count(*) into note_count
  from public.patient_entries
  where patient_id = '00000000-0000-4000-8000-000000000261'
    and kind = 'note';
  if note_count <> 1 then
    raise exception 'failed note saves must not create extra note entries, found %', note_count;
  end if;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000262';

do $$
begin
  begin
    perform public.save_patient_menstruation(
      null,
      '2026-06-23 12:00:00+02',
      'light',
      1,
      null
    );
    raise exception 'male patient must not save period entries';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000263';

do $$
begin
  begin
    perform public.save_patient_menstruation(
      null,
      '2026-06-23 12:00:00+02',
      'light',
      1,
      null
    );
    raise exception 'doctors must not save period entries';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.save_patient_note(null, '2026-06-23 12:00:00+02', 'Doctor note');
    raise exception 'doctors must not save notes';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

rollback;
