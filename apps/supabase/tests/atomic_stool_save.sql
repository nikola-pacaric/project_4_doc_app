begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, created_at, updated_at
)
values
  ('00000000-0000-4000-8000-000000000241', 'authenticated', 'authenticated', 'atomic_stool_patient_a@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000242', 'authenticated', 'authenticated', 'atomic_stool_patient_b@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000243', 'authenticated', 'authenticated', 'atomic_stool_doctor@example.test', 'test', now(), '{"app_role":"doctor"}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.user_profiles (id, role, display_name)
values
  ('00000000-0000-4000-8000-000000000241', 'patient', 'Atomic Stool Patient A'),
  ('00000000-0000-4000-8000-000000000242', 'patient', 'Atomic Stool Patient B'),
  ('00000000-0000-4000-8000-000000000243', 'doctor', 'Atomic Stool Doctor')
on conflict (id) do nothing;

insert into public.patient_entries (id, patient_id, kind, occurred_at)
values
  ('10000000-0000-4000-8000-000000000242', '00000000-0000-4000-8000-000000000242', 'stool', '2026-06-22 09:00:00+02'),
  ('10000000-0000-4000-8000-000000000248', '00000000-0000-4000-8000-000000000241', 'daily', '2026-06-22 10:00:00+02')
on conflict (id) do nothing;

insert into public.stool_details (
  entry_id, bristol_type, urgency, urgency_level, pain, mucus, blood, fatty_stool, black_stool
)
values (
  '10000000-0000-4000-8000-000000000242', 4, false, 'none', false, false, false, false, false
)
on conflict (entry_id) do nothing;

do $$
begin
  if has_table_privilege('anon', 'public.stool_details', 'SELECT') then
    raise exception 'anon must not have stool table privileges';
  end if;
  if has_table_privilege('anon', 'public.stool_details', 'TRUNCATE') then
    raise exception 'anon must not truncate stool records';
  end if;
  if has_table_privilege('authenticated', 'public.stool_details', 'TRUNCATE') then
    raise exception 'authenticated users must not truncate stool records';
  end if;
  if has_function_privilege(
    'anon',
    'public.save_patient_stool(uuid,timestamptz,integer,text,boolean,boolean,boolean,boolean,boolean,text)',
    'EXECUTE'
  ) then
    raise exception 'anon must not execute stool saves';
  end if;
end $$;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000241';

do $$
declare
  first_entry_id uuid;
  second_entry_id uuid;
  stool_count integer;
  saved_bristol_type integer;
begin
  first_entry_id := public.save_patient_stool(
    null,
    '2026-06-22 08:00:00+02',
    4,
    'none',
    false,
    false,
    false,
    false,
    false,
    'Morning entry'
  );

  second_entry_id := public.save_patient_stool(
    null,
    '2026-06-22 18:00:00+02',
    6,
    'moderate',
    true,
    false,
    false,
    false,
    false,
    null
  );

  if first_entry_id = second_entry_id then
    raise exception 'separate stool saves must create separate entries';
  end if;

  select count(*) into stool_count
  from public.patient_entries
  where patient_id = '00000000-0000-4000-8000-000000000241'
    and kind = 'stool';
  if stool_count <> 2 then
    raise exception 'patient should have two same-day stool entries, found %', stool_count;
  end if;

  perform public.save_patient_stool(
    first_entry_id,
    '2026-06-22 08:15:00+02',
    3,
    'mild',
    false,
    true,
    false,
    false,
    false,
    'Updated morning entry'
  );

  select bristol_type into saved_bristol_type
  from public.stool_details
  where entry_id = first_entry_id;
  if saved_bristol_type <> 3 then
    raise exception 'existing stool entry was not updated';
  end if;

  begin
    perform public.save_patient_stool(
      '10000000-0000-4000-8000-000000000242',
      '2026-06-22 09:00:00+02',
      5,
      'none',
      false,
      false,
      false,
      false,
      false,
      null
    );
    raise exception 'patient A must not update patient B stool entry';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.save_patient_stool(
      null,
      '2026-06-22 12:00:00+02',
      8,
      'none',
      false,
      false,
      false,
      false,
      false,
      null
    );
    raise exception 'invalid Bristol type should fail';
  exception when invalid_parameter_value then null;
  end;

  begin
    insert into public.stool_details (
      entry_id, bristol_type, urgency, urgency_level, pain, mucus, blood, fatty_stool, black_stool
    )
    values (
      '10000000-0000-4000-8000-000000000248', 4, false, 'none', false, false, false, false, false
    );
    raise exception 'stool details should require a stool parent entry';
  exception when check_violation then null;
  end;

  select count(*) into stool_count
  from public.patient_entries
  where patient_id = '00000000-0000-4000-8000-000000000241'
    and kind = 'stool';
  if stool_count <> 2 then
    raise exception 'failed stool saves must not leave orphan entries';
  end if;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000243';

do $$
begin
  begin
    perform public.save_patient_stool(
      null,
      '2026-06-22 12:00:00+02',
      4,
      'none',
      false,
      false,
      false,
      false,
      false,
      null
    );
    raise exception 'doctors must not save stool entries';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

rollback;
