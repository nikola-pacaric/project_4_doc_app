begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, created_at, updated_at
)
values
  ('00000000-0000-4000-8000-000000000701', 'authenticated', 'authenticated', 'atomic_food_patient_a@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000702', 'authenticated', 'authenticated', 'atomic_food_patient_b@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000703', 'authenticated', 'authenticated', 'atomic_food_doctor@example.test', 'test', now(), '{"app_role":"doctor"}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.user_profiles (id, role, display_name)
values
  ('00000000-0000-4000-8000-000000000701', 'patient', 'Atomic Food Patient A'),
  ('00000000-0000-4000-8000-000000000702', 'patient', 'Atomic Food Patient B'),
  ('00000000-0000-4000-8000-000000000703', 'doctor', 'Atomic Food Doctor')
on conflict (id) do nothing;

insert into public.patient_entries (id, patient_id, kind, occurred_at)
values (
  '10000000-0000-4000-8000-000000000702',
  '00000000-0000-4000-8000-000000000702',
  'meal',
  '2026-06-22 12:00:00+02'
)
on conflict (id) do nothing;

insert into public.meal_details (entry_id, meal_type, name)
values ('10000000-0000-4000-8000-000000000702', 'lunch', 'Patient B lunch')
on conflict (entry_id) do nothing;

do $$
begin
  if has_function_privilege(
    'anon',
    'public.save_patient_food_form(timestamptz,timestamptz,timestamptz,numeric,boolean,text,jsonb)',
    'EXECUTE'
  ) then
    raise exception 'anon must not execute the food save function';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.save_patient_food_form(timestamptz,timestamptz,timestamptz,numeric,boolean,text,jsonb)',
    'EXECUTE'
  ) then
    raise exception 'authenticated users need food save function access';
  end if;
end $$;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000701';

do $$
declare
  v_daily_entry_id uuid;
  breakfast_entry_id uuid;
  saved_water numeric;
  meal_count integer;
  other_fluid_count integer;
begin
  select public.save_patient_food_form(
    '2026-06-22 00:00:00+02',
    '2026-06-23 00:00:00+02',
    '2026-06-22 12:00:00+02',
    1.000,
    false,
    null,
    '[]'::jsonb
  ) into v_daily_entry_id;

  select water_liters into saved_water
  from public.food_form_details
  where entry_id = v_daily_entry_id;
  if saved_water <> 1.000 then raise exception 'morning hydration checkpoint was not saved'; end if;

  select count(*) into meal_count
  from public.patient_entries
  where patient_id = '00000000-0000-4000-8000-000000000701'
    and kind = 'meal';
  if meal_count <> 0 then raise exception 'morning checkpoint should allow zero meals'; end if;

  perform public.save_patient_food_form(
    '2026-06-22 00:00:00+02',
    '2026-06-23 00:00:00+02',
    '2026-06-22 12:00:00+02',
    1.500,
    true,
    'Tea',
    '[{"meal_type":"breakfast","name":"Oatmeal","description":"With fruit","occurred_at":"2026-06-22T09:00:00+02:00"}]'::jsonb
  );

  select entry.id into breakfast_entry_id
  from public.patient_entries entry
  where entry.patient_id = '00000000-0000-4000-8000-000000000701'
    and entry.kind = 'meal'
  limit 1;
  if breakfast_entry_id is null then raise exception 'breakfast checkpoint was not saved'; end if;

  perform public.save_patient_food_form(
    '2026-06-22 00:00:00+02',
    '2026-06-23 00:00:00+02',
    '2026-06-22 12:00:00+02',
    1.750,
    true,
    'Tea',
    jsonb_build_array(
      jsonb_build_object(
        'entry_id', breakfast_entry_id,
        'meal_type', 'breakfast',
        'name', 'Oatmeal and banana',
        'description', null,
        'occurred_at', '2026-06-22T09:15:00+02:00'
      ),
      jsonb_build_object(
        'meal_type', 'lunch',
        'name', 'Soup',
        'description', 'With bread',
        'occurred_at', '2026-06-22T13:00:00+02:00'
      )
    )
  );

  select count(*) into meal_count
  from public.patient_entries
  where patient_id = '00000000-0000-4000-8000-000000000701'
    and kind = 'meal';
  if meal_count <> 2 then raise exception 'later checkpoint should contain breakfast and lunch'; end if;

  perform public.save_patient_food_form(
    '2026-06-22 00:00:00+02',
    '2026-06-23 00:00:00+02',
    '2026-06-22 12:00:00+02',
    1.900,
    true,
    'project4:other-fluids:v1:[{"occurredAt":"2026-06-22T09:30:00+02:00","name":"Coffee"},{"occurredAt":"2026-06-22T17:15:00+02:00","name":"Tea"}]',
    '[]'::jsonb
  );

  select count(*) into other_fluid_count
  from public.other_fluid_details fluid
  where fluid.daily_entry_id = v_daily_entry_id;
  if other_fluid_count <> 2 then
    raise exception 'structured other-fluid checkpoint should save 2 rows, found %', other_fluid_count;
  end if;

  perform public.save_patient_food_form(
    '2026-06-22 00:00:00+02',
    '2026-06-23 00:00:00+02',
    '2026-06-22 12:00:00+02',
    2.100,
    true,
    'project4:other-fluids:v1:[{"occurredAt":"2026-06-22T20:00:00+02:00","name":"Kefir"}]',
    '[]'::jsonb
  );

  select count(*) into other_fluid_count
  from public.other_fluid_details fluid
  where fluid.daily_entry_id = v_daily_entry_id;
  if other_fluid_count <> 1 then
    raise exception 'later structured other-fluid checkpoint should replace rows, found %', other_fluid_count;
  end if;

  begin
    perform public.save_patient_food_form(
      '2026-06-22 00:00:00+02',
      '2026-06-23 00:00:00+02',
      '2026-06-22 12:00:00+02',
      2.500,
      true,
      'project4:other-fluids:v1:[{"occurredAt":"2026-06-22T11:00:00+02:00","name":"   "}]',
      '[]'::jsonb
    );
    raise exception 'blank structured other-fluid names should fail';
  exception when invalid_parameter_value then null;
  end;

  select count(*) into other_fluid_count
  from public.other_fluid_details fluid
  where fluid.daily_entry_id = v_daily_entry_id;
  if other_fluid_count <> 1 then
    raise exception 'failed structured other-fluid checkpoint should roll rows back, found %', other_fluid_count;
  end if;

  begin
    perform public.save_patient_food_form(
      '2026-06-22 00:00:00+02',
      '2026-06-23 00:00:00+02',
      '2026-06-22 12:00:00+02',
      2.500,
      true,
      'project4:other-fluids:v1:[{"occurredAt":"2026-06-23T00:05:00+02:00","name":"Late tea"}]',
      '[]'::jsonb
    );
    raise exception 'out-of-day structured other-fluid times should fail';
  exception when invalid_parameter_value then null;
  end;

  select count(*) into other_fluid_count
  from public.other_fluid_details fluid
  where fluid.daily_entry_id = v_daily_entry_id;
  if other_fluid_count <> 1 then
    raise exception 'failed out-of-day checkpoint should preserve previous other-fluid rows, found %', other_fluid_count;
  end if;

  begin
    perform public.save_patient_food_form(
      '2026-06-22 00:00:00+02',
      '2026-06-23 00:00:00+02',
      '2026-06-22 12:00:00+02',
      9.000,
      false,
      null,
      '[{"entry_id":"10000000-0000-4000-8000-000000000702","meal_type":"lunch","name":"Forbidden update","occurred_at":"2026-06-22T12:00:00+02:00"}]'::jsonb
    );
    raise exception 'cross-patient meal update should fail';
  exception when insufficient_privilege then null;
  end;

  select water_liters into saved_water
  from public.food_form_details
  where entry_id = v_daily_entry_id;
  if saved_water <> 2.100 then
    raise exception 'failed checkpoint should roll hydration back, found %', saved_water;
  end if;

  select count(*) into meal_count
  from public.patient_entries
  where patient_id = '00000000-0000-4000-8000-000000000701'
    and kind = 'meal';
  if meal_count <> 0 then raise exception 'failed checkpoint should preserve the current empty meal set'; end if;

  perform public.save_patient_food_form(
    '2026-06-22 00:00:00+02',
    '2026-06-23 00:00:00+02',
    '2026-06-22 12:00:00+02',
    2.000,
    false,
    null,
    '[]'::jsonb
  );

  select count(*) into meal_count
  from public.patient_entries
  where patient_id = '00000000-0000-4000-8000-000000000701'
    and kind = 'meal';
  if meal_count <> 0 then raise exception 'empty meal checkpoint should remove tracked-day meals'; end if;

  select count(*) into other_fluid_count
  from public.other_fluid_details fluid
  where fluid.daily_entry_id = v_daily_entry_id;
  if other_fluid_count <> 0 then raise exception 'empty fluid checkpoint should remove other-fluid rows'; end if;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000703';

do $$
begin
  begin
    perform public.save_patient_food_form(
      '2026-06-22 00:00:00+02',
      '2026-06-23 00:00:00+02',
      '2026-06-22 12:00:00+02',
      1.000,
      false,
      null,
      '[]'::jsonb
    );
    raise exception 'doctors must not save patient food forms';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

rollback;
