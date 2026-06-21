begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, created_at, updated_at
)
values
  ('00000000-0000-4000-8000-000000000401', 'authenticated', 'authenticated', 'food_patient_a@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000402', 'authenticated', 'authenticated', 'food_patient_b@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000403', 'authenticated', 'authenticated', 'food_doctor@example.test', 'test', now(), '{"app_role":"doctor"}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.user_profiles (id, role, display_name)
values
  ('00000000-0000-4000-8000-000000000401', 'patient', 'Food Patient A'),
  ('00000000-0000-4000-8000-000000000402', 'patient', 'Food Patient B'),
  ('00000000-0000-4000-8000-000000000403', 'doctor', 'Food Doctor')
on conflict (id) do nothing;

insert into public.patient_entries (id, patient_id, kind, occurred_at)
values
  ('10000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000401', 'daily', now()),
  ('10000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000402', 'daily', now()),
  ('10000000-0000-4000-8000-000000000408', '00000000-0000-4000-8000-000000000402', 'daily', now()),
  ('10000000-0000-4000-8000-000000000409', '00000000-0000-4000-8000-000000000401', 'daily', now())
on conflict (id) do nothing;

insert into public.daily_form_details (entry_id)
values
  ('10000000-0000-4000-8000-000000000401'),
  ('10000000-0000-4000-8000-000000000402'),
  ('10000000-0000-4000-8000-000000000408'),
  ('10000000-0000-4000-8000-000000000409')
on conflict (entry_id) do nothing;

insert into public.food_form_details (entry_id, water_liters, has_other_fluids, other_fluids)
values
  ('10000000-0000-4000-8000-000000000401', 1.750, true, 'Tea'),
  ('10000000-0000-4000-8000-000000000402', 2.000, false, null)
on conflict (entry_id) do nothing;

set local role anon;

do $$
begin
  begin
    perform count(*) from public.food_form_details;
    raise exception 'unauthenticated users should not have table access to food forms';
  exception
    when insufficient_privilege then null;
  end;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000401';

do $$
declare
  visible_food_forms integer;
  changed_rows integer;
begin
  select count(*) into visible_food_forms from public.food_form_details;
  if visible_food_forms <> 1 then
    raise exception 'patient A should see exactly 1 own food form, saw %', visible_food_forms;
  end if;

  update public.food_form_details set water_liters = 2.250
  where entry_id = '10000000-0000-4000-8000-000000000401';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then raise exception 'patient A should update an own food form'; end if;

  update public.food_form_details set water_liters = 3.000
  where entry_id = '10000000-0000-4000-8000-000000000402';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then raise exception 'patient A should not update patient B food form'; end if;

  begin
    insert into public.food_form_details (entry_id, water_liters, has_other_fluids)
    values ('10000000-0000-4000-8000-000000000409', 20.001, false);
    raise exception 'water above 20 liters should be rejected';
  exception when check_violation then null;
  end;

  begin
    insert into public.food_form_details (entry_id, water_liters, has_other_fluids, other_fluids)
    values ('10000000-0000-4000-8000-000000000409', 1.000, true, '');
    raise exception 'other-fluid details should be required after yes';
  exception when check_violation then null;
  end;

  insert into public.food_form_details (entry_id, water_liters, has_other_fluids)
  values ('10000000-0000-4000-8000-000000000409', 1.000, false);

  delete from public.food_form_details
  where entry_id = '10000000-0000-4000-8000-000000000409';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then raise exception 'patient A should delete an own food form'; end if;

  begin
    insert into public.food_form_details (entry_id, water_liters, has_other_fluids)
    values ('10000000-0000-4000-8000-000000000408', 1.000, false);
    raise exception 'patient A should not insert a food form for patient B';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000403';

do $$
declare
  visible_food_forms integer;
  changed_rows integer;
begin
  select count(*) into visible_food_forms from public.food_form_details;
  if visible_food_forms <> 0 then
    raise exception 'unlinked doctor should see 0 food forms, saw %', visible_food_forms;
  end if;

  update public.food_form_details set water_liters = 3.000
  where entry_id = '10000000-0000-4000-8000-000000000401';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then raise exception 'unlinked doctor should not update food forms'; end if;
end $$;

reset role;

insert into public.doctor_patient_access (doctor_id, patient_id)
values ('00000000-0000-4000-8000-000000000403', '00000000-0000-4000-8000-000000000401')
on conflict (doctor_id, patient_id)
where active = true and revoked_at is null
do nothing;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000403';

do $$
declare
  visible_food_forms integer;
  changed_rows integer;
begin
  select count(*) into visible_food_forms from public.food_form_details;
  if visible_food_forms <> 1 then
    raise exception 'linked doctor should see exactly 1 linked food form, saw %', visible_food_forms;
  end if;

  update public.food_form_details set water_liters = 3.000
  where entry_id = '10000000-0000-4000-8000-000000000401';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then raise exception 'linked doctor should not update food forms'; end if;
end $$;

reset role;

rollback;
