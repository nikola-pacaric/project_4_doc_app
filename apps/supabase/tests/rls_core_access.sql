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
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'text', now(), 'patient a entry'),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'text', now(), 'patient b entry')
on conflict (id) do nothing;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000001';

do $$
declare
  visible_entries integer;
  visible_baselines integer;
  changed_rows integer;
begin
  select count(*) into visible_entries from public.patient_entries;
  if visible_entries <> 1 then
    raise exception 'patient A should see exactly 1 own entry, saw %', visible_entries;
  end if;

  select count(*) into visible_baselines from public.patient_baseline_profiles;
  if visible_baselines <> 1 then
    raise exception 'patient A should see exactly 1 own baseline, saw %', visible_baselines;
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
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000003';

do $$
declare
  visible_entries integer;
  visible_baselines integer;
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
  changed_rows integer;
begin
  select count(*) into visible_entries from public.patient_entries;
  if visible_entries <> 1 then
    raise exception 'linked doctor should see exactly 1 linked patient entry, saw %', visible_entries;
  end if;

  select count(*) into visible_baselines from public.patient_baseline_profiles;
  if visible_baselines <> 1 then
    raise exception 'linked doctor should see exactly 1 baseline, saw %', visible_baselines;
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
end $$;

reset role;

rollback;
