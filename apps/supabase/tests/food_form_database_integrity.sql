begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, created_at, updated_at
)
values
  ('00000000-0000-4000-8000-000000000601', 'authenticated', 'authenticated', 'food_integrity_patient_a@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000602', 'authenticated', 'authenticated', 'food_integrity_patient_b@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000603', 'authenticated', 'authenticated', 'food_integrity_doctor@example.test', 'test', now(), '{"app_role":"doctor"}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.user_profiles (id, role, display_name)
values
  ('00000000-0000-4000-8000-000000000601', 'patient', 'Food Integrity Patient A'),
  ('00000000-0000-4000-8000-000000000602', 'patient', 'Food Integrity Patient B'),
  ('00000000-0000-4000-8000-000000000603', 'doctor', 'Food Integrity Doctor')
on conflict (id) do nothing;

insert into public.patient_entries (id, patient_id, kind, occurred_at)
values
  ('10000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-000000000601', 'daily', now()),
  ('10000000-0000-4000-8000-000000000602', '00000000-0000-4000-8000-000000000602', 'daily', now()),
  ('10000000-0000-4000-8000-000000000603', '00000000-0000-4000-8000-000000000601', 'meal', now()),
  ('10000000-0000-4000-8000-000000000604', '00000000-0000-4000-8000-000000000602', 'meal', now()),
  ('10000000-0000-4000-8000-000000000605', '00000000-0000-4000-8000-000000000601', 'meal', now()),
  ('10000000-0000-4000-8000-000000000606', '00000000-0000-4000-8000-000000000602', 'meal', now())
on conflict (id) do nothing;

insert into public.daily_form_details (entry_id)
values
  ('10000000-0000-4000-8000-000000000601'),
  ('10000000-0000-4000-8000-000000000602')
on conflict (entry_id) do nothing;

insert into public.food_form_details (entry_id, water_liters, has_other_fluids, other_fluids)
values
  ('10000000-0000-4000-8000-000000000601', 1.750, true, 'Tea'),
  ('10000000-0000-4000-8000-000000000602', 2.000, false, null)
on conflict (entry_id) do nothing;

insert into public.meal_details (entry_id, meal_type, name, description)
values
  ('10000000-0000-4000-8000-000000000603', 'breakfast', 'Oatmeal', 'With fruit'),
  ('10000000-0000-4000-8000-000000000604', 'lunch', 'Soup', null)
on conflict (entry_id) do nothing;

do $$
begin
  if has_table_privilege('anon', 'public.food_form_details', 'SELECT') then
    raise exception 'anon must not have food form table privileges';
  end if;
  if has_table_privilege('anon', 'public.meal_details', 'SELECT') then
    raise exception 'anon must not have meal table privileges';
  end if;
  if has_table_privilege('anon', 'public.meal_details', 'TRUNCATE') then
    raise exception 'anon must not be able to truncate meals';
  end if;
  if has_table_privilege('authenticated', 'public.meal_details', 'TRUNCATE') then
    raise exception 'authenticated users must not be able to truncate meals';
  end if;
end $$;

set local role anon;

do $$
begin
  begin
    perform count(*) from public.food_form_details;
    raise exception 'anon should not have table access to food forms';
  exception when insufficient_privilege then null;
  end;

  begin
    perform count(*) from public.meal_details;
    raise exception 'anon should not have table access to meals';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000601';

do $$
declare
  visible_food integer;
  visible_meals integer;
  changed_rows integer;
begin
  select count(*) into visible_food from public.food_form_details;
  if visible_food <> 1 then raise exception 'patient A should see 1 own food form'; end if;

  select count(*) into visible_meals from public.meal_details;
  if visible_meals <> 1 then raise exception 'patient A should see 1 own meal'; end if;

  update public.meal_details set name = 'Updated oatmeal'
  where entry_id = '10000000-0000-4000-8000-000000000603';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then raise exception 'patient A should update an own meal'; end if;

  update public.meal_details set name = 'Forbidden update'
  where entry_id = '10000000-0000-4000-8000-000000000604';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then raise exception 'patient A should not update patient B meal'; end if;

  begin
    insert into public.food_form_details (entry_id, water_liters, has_other_fluids)
    values ('10000000-0000-4000-8000-000000000603', 1.000, false);
    raise exception 'food details should require a daily parent entry';
  exception when check_violation then null;
  end;

  begin
    insert into public.meal_details (entry_id, meal_type, name)
    values ('10000000-0000-4000-8000-000000000605', 'breakfast', '   ');
    raise exception 'meal name should be nonblank';
  exception when check_violation then null;
  end;

  begin
    insert into public.meal_details (entry_id, meal_type, name)
    values ('10000000-0000-4000-8000-000000000605', 'invalid', 'Invalid type');
    raise exception 'meal type should use the supported values';
  exception when check_violation then null;
  end;

  begin
    insert into public.meal_details (entry_id, meal_type, name)
    values ('10000000-0000-4000-8000-000000000601', 'breakfast', 'Wrong parent');
    raise exception 'meal details should require a meal parent entry';
  exception when check_violation then null;
  end;

  insert into public.meal_details (entry_id, meal_type, name)
  values ('10000000-0000-4000-8000-000000000605', 'snack', 'Apple');

  delete from public.meal_details
  where entry_id = '10000000-0000-4000-8000-000000000605';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then raise exception 'patient A should delete an own meal'; end if;

  begin
    insert into public.meal_details (entry_id, meal_type, name)
    values ('10000000-0000-4000-8000-000000000606', 'snack', 'Forbidden meal');
    raise exception 'patient A should not insert a meal for patient B';
  exception when insufficient_privilege or check_violation then null;
  end;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000603';

do $$
declare
  visible_food integer;
  visible_meals integer;
begin
  select count(*) into visible_food from public.food_form_details;
  if visible_food <> 0 then raise exception 'unlinked doctor should see 0 food forms'; end if;

  select count(*) into visible_meals from public.meal_details;
  if visible_meals <> 0 then raise exception 'unlinked doctor should see 0 meals'; end if;
end $$;

reset role;

insert into public.doctor_patient_access (doctor_id, patient_id)
values ('00000000-0000-4000-8000-000000000603', '00000000-0000-4000-8000-000000000601')
on conflict (doctor_id, patient_id)
where active = true and revoked_at is null
do nothing;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000603';

do $$
declare
  visible_food integer;
  visible_meals integer;
  changed_rows integer;
begin
  select count(*) into visible_food from public.food_form_details;
  if visible_food <> 1 then raise exception 'linked doctor should see 1 linked food form'; end if;

  select count(*) into visible_meals from public.meal_details;
  if visible_meals <> 1 then raise exception 'linked doctor should see 1 linked meal'; end if;

  update public.meal_details set name = 'Doctor attempted edit'
  where entry_id = '10000000-0000-4000-8000-000000000603';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then raise exception 'linked doctor should not update meals'; end if;
end $$;

reset role;

rollback;
