begin;

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  created_at,
  updated_at
)
values
  ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase2_patient_a@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase2_patient_b@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'phase2_doctor@example.test', 'test', now(), '{"app_role":"doctor"}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.user_profiles (id, role, display_name)
values
  ('00000000-0000-4000-8000-000000000001', 'patient', 'Phase 2 Patient A'),
  ('00000000-0000-4000-8000-000000000002', 'patient', 'Phase 2 Patient B'),
  ('00000000-0000-4000-8000-000000000003', 'doctor', 'Phase 2 Doctor')
on conflict (id) do nothing;

insert into public.patient_baseline_profiles (
  patient_id, sex, birth_year, occupation, chronic_diseases, chronic_therapy,
  weight_kg, height_cm, recent_major_weight_change, weight_reminder_due_at
)
values
  ('00000000-0000-4000-8000-000000000001', 'female', 1988, 'Teacher', '', '', 68.5, 172, 'No', now() + interval '3 months'),
  ('00000000-0000-4000-8000-000000000002', 'male', 1985, 'Engineer', '', '', 82, 184, 'No', now() + interval '3 months')
on conflict (patient_id) do nothing;

insert into public.patient_entries (id, patient_id, kind, occurred_at, text)
values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'daily', now(), null),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'daily', now(), null),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'meal', now(), null),
  ('10000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000002', 'meal', now(), null),
  ('10000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001', 'symptom', now(), null),
  ('10000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000002', 'symptom', now(), null)
on conflict (id) do nothing;

insert into public.daily_form_details (entry_id, wake_time, food_notes, appetite, water_ml)
values
  ('10000000-0000-4000-8000-000000000001', '07:00', 'patient a food', 'usual', 1800),
  ('10000000-0000-4000-8000-000000000002', '08:00', 'patient b food', 'usual', 1600)
on conflict (entry_id) do nothing;

insert into public.symptom_details (
  entry_id, symptom_type, started_at, intensity, modifying_factors, woke_from_sleep
)
values
  ('10000000-0000-4000-8000-000000000005', 'bloating', now(), 2, 'Improved after walking', false),
  ('10000000-0000-4000-8000-000000000006', 'nausea', now(), 1, null, false)
on conflict (entry_id) do nothing;

insert into public.meal_details (entry_id, meal_type, name, description)
values
  ('10000000-0000-4000-8000-000000000003', 'breakfast', 'Oatmeal', null),
  ('10000000-0000-4000-8000-000000000004', 'lunch', 'Soup', 'With bread')
on conflict (entry_id) do nothing;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000001';

do $$
declare
  visible_entries integer;
  visible_baselines integer;
  visible_daily_forms integer;
  visible_meals integer;
  visible_symptoms integer;
  changed_rows integer;
begin
  select count(*) into visible_entries from public.patient_entries;
  if visible_entries <> 3 then
    raise exception 'patient A should see exactly 3 own entries, saw %', visible_entries;
  end if;

  select count(*) into visible_baselines from public.patient_baseline_profiles;
  if visible_baselines <> 1 then
    raise exception 'patient A should see exactly 1 own baseline, saw %', visible_baselines;
  end if;

  select count(*) into visible_daily_forms from public.daily_form_details;
  if visible_daily_forms <> 1 then
    raise exception 'patient A should see exactly 1 own daily form, saw %', visible_daily_forms;
  end if;

  select count(*) into visible_meals from public.meal_details;
  if visible_meals <> 1 then
    raise exception 'patient A should see exactly 1 own meal, saw %', visible_meals;
  end if;

  select count(*) into visible_symptoms from public.symptom_details;
  if visible_symptoms <> 1 then
    raise exception 'patient A should see exactly 1 own symptom, saw %', visible_symptoms;
  end if;

  update public.patient_baseline_profiles set occupation = 'not allowed'
  where patient_id = '00000000-0000-4000-8000-000000000002';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'patient A should not update patient B baseline';
  end if;

  update public.patient_entries
  set text = 'patient a attempted to edit patient b'
  where id = '10000000-0000-4000-8000-000000000002';

  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'patient A should not update patient B entries';
  end if;

  update public.daily_form_details set food_notes = 'not allowed'
  where entry_id = '10000000-0000-4000-8000-000000000002';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'patient A should not update patient B daily forms';
  end if;

  update public.meal_details set name = 'not allowed'
  where entry_id = '10000000-0000-4000-8000-000000000004';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'patient A should not update patient B meals';
  end if;

  update public.symptom_details set intensity = 3
  where entry_id = '10000000-0000-4000-8000-000000000006';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'patient A should not update patient B symptoms';
  end if;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000003';

do $$
declare
  visible_entries integer;
  visible_baselines integer;
  visible_daily_forms integer;
  visible_meals integer;
  visible_symptoms integer;
  changed_rows integer;
begin
  select count(*) into visible_entries from public.patient_entries;
  if visible_entries <> 0 then
    raise exception 'unlinked doctor should see 0 patient entries, saw %', visible_entries;
  end if;

  select count(*) into visible_baselines from public.patient_baseline_profiles;
  if visible_baselines <> 0 then
    raise exception 'unlinked doctor should see 0 baselines, saw %', visible_baselines;
  end if;

  select count(*) into visible_daily_forms from public.daily_form_details;
  if visible_daily_forms <> 0 then
    raise exception 'unlinked doctor should see 0 daily forms, saw %', visible_daily_forms;
  end if;

  select count(*) into visible_meals from public.meal_details;
  if visible_meals <> 0 then
    raise exception 'unlinked doctor should see 0 meals, saw %', visible_meals;
  end if;

  select count(*) into visible_symptoms from public.symptom_details;
  if visible_symptoms <> 0 then
    raise exception 'unlinked doctor should see 0 symptoms, saw %', visible_symptoms;
  end if;

  update public.patient_entries
  set text = 'doctor attempted edit before link'
  where id = '10000000-0000-4000-8000-000000000001';

  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'doctor should not update patient entries';
  end if;
end $$;

reset role;

insert into public.doctor_patient_access (doctor_id, patient_id)
values ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001')
on conflict (doctor_id, patient_id)
where active = true and revoked_at is null
do nothing;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000003';

do $$
declare
  visible_entries integer;
  visible_baselines integer;
  visible_daily_forms integer;
  visible_meals integer;
  visible_symptoms integer;
  changed_rows integer;
begin
  select count(*) into visible_entries from public.patient_entries;
  if visible_entries <> 3 then
    raise exception 'linked doctor should see exactly 3 linked patient entries, saw %', visible_entries;
  end if;

  select count(*) into visible_baselines from public.patient_baseline_profiles;
  if visible_baselines <> 1 then
    raise exception 'linked doctor should see exactly 1 baseline, saw %', visible_baselines;
  end if;

  select count(*) into visible_daily_forms from public.daily_form_details;
  if visible_daily_forms <> 1 then
    raise exception 'linked doctor should see exactly 1 linked daily form, saw %', visible_daily_forms;
  end if;

  select count(*) into visible_meals from public.meal_details;
  if visible_meals <> 1 then
    raise exception 'linked doctor should see exactly 1 linked meal, saw %', visible_meals;
  end if;

  select count(*) into visible_symptoms from public.symptom_details;
  if visible_symptoms <> 1 then
    raise exception 'linked doctor should see exactly 1 linked symptom, saw %', visible_symptoms;
  end if;

  update public.patient_baseline_profiles set occupation = 'doctor attempted edit'
  where patient_id = '00000000-0000-4000-8000-000000000001';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'linked doctor should not update patient baseline';
  end if;

  update public.patient_entries
  set text = 'doctor attempted linked edit'
  where id = '10000000-0000-4000-8000-000000000001';

  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'linked doctor should still not update patient entries';
  end if;

  update public.daily_form_details set food_notes = 'doctor attempted edit'
  where entry_id = '10000000-0000-4000-8000-000000000001';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'linked doctor should not update daily forms';
  end if;

  update public.meal_details set name = 'doctor attempted edit'
  where entry_id = '10000000-0000-4000-8000-000000000003';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'linked doctor should not update meals';
  end if;

  update public.symptom_details set intensity = 3
  where entry_id = '10000000-0000-4000-8000-000000000005';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'linked doctor should not update symptoms';
  end if;
end $$;

reset role;

rollback;
