begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, created_at, updated_at
)
values
  ('00000000-0000-4000-8000-000000000501', 'authenticated', 'authenticated', 'daily_patient_a@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000502', 'authenticated', 'authenticated', 'daily_patient_b@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000503', 'authenticated', 'authenticated', 'daily_doctor@example.test', 'test', now(), '{"app_role":"doctor"}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.user_profiles (id, role, display_name)
values
  ('00000000-0000-4000-8000-000000000501', 'patient', 'Daily Patient A'),
  ('00000000-0000-4000-8000-000000000502', 'patient', 'Daily Patient B'),
  ('00000000-0000-4000-8000-000000000503', 'doctor', 'Daily Doctor')
on conflict (id) do nothing;

insert into public.patient_entries (id, patient_id, kind, occurred_at)
values
  ('10000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000501', 'daily', '2026-06-21 12:00:00+02'),
  ('10000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000502', 'daily', '2026-06-21 12:00:00+02')
on conflict (id) do nothing;

insert into public.daily_form_details (
  entry_id,
  wake_time,
  sleep_notes,
  appetite,
  had_physical_activity,
  stress_level,
  day_description,
  took_chronic_therapy,
  took_medication_outside_chronic_therapy,
  energy_level,
  had_naps
)
values
  ('10000000-0000-4000-8000-000000000501', '07:30', '08:00', 'usual', false, 2, 'Normal day', false, false, 2, false),
  ('10000000-0000-4000-8000-000000000502', '07:30', '08:00', 'usual', false, 2, 'Normal day', false, false, 2, false)
on conflict (entry_id) do nothing;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000502';

do $$
begin
  if public.complete_patient_daily_form('10000000-0000-4000-8000-000000000502') is null then
    raise exception 'activity no should allow completion without an exercise entry';
  end if;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000501';

do $$
declare
  completion_time timestamptz;
  affected_rows integer;
begin
  if exists (
    select 1
    from public.daily_form_details
    where entry_id = '10000000-0000-4000-8000-000000000502'
  ) then
    raise exception 'a patient should not read another patient daily details';
  end if;

  update public.daily_form_details
  set day_description = 'Unauthorized change'
  where entry_id = '10000000-0000-4000-8000-000000000502';
  get diagnostics affected_rows = row_count;
  if affected_rows <> 0 then
    raise exception 'a patient should not update another patient daily details';
  end if;

  begin
    update public.daily_form_details
    set sleep_notes = '25:00'
    where entry_id = '10000000-0000-4000-8000-000000000501';
    raise exception 'sleep duration above 24 hours should be rejected';
  exception when check_violation then null;
  end;

  update public.daily_form_details
  set wake_time = null
  where entry_id = '10000000-0000-4000-8000-000000000501';

  begin
    perform public.complete_patient_daily_form('10000000-0000-4000-8000-000000000501');
    raise exception 'an incomplete daily form should not be completed';
  exception when check_violation then null;
  end;

  update public.daily_form_details
  set wake_time = '07:30', had_physical_activity = true
  where entry_id = '10000000-0000-4000-8000-000000000501';

  begin
    update public.daily_form_details
    set completed_at = now()
    where entry_id = '10000000-0000-4000-8000-000000000501';
    raise exception 'direct completion should require a same-day exercise';
  exception when check_violation then null;
  end;

  insert into public.patient_entries (id, patient_id, kind, occurred_at)
  values (
    '10000000-0000-4000-8000-000000000509',
    '00000000-0000-4000-8000-000000000501',
    'exercise',
    '2026-06-21 18:00:00+02'
  );

  insert into public.exercise_details (entry_id, activity, duration_minutes, intensity)
  values ('10000000-0000-4000-8000-000000000509', 'Walking', 30, 'light');

  update public.daily_form_details
  set took_medication_outside_chronic_therapy = true
  where entry_id = '10000000-0000-4000-8000-000000000501';

  begin
    perform public.complete_patient_daily_form('10000000-0000-4000-8000-000000000501');
    raise exception 'outside-therapy medication should require a same-day medication entry';
  exception when check_violation then null;
  end;

  insert into public.patient_entries (id, patient_id, kind, occurred_at)
  values (
    '10000000-0000-4000-8000-000000000510',
    '00000000-0000-4000-8000-000000000501',
    'medication',
    '2026-06-21 19:00:00+02'
  );

  insert into public.medication_details (entry_id, name, dose, is_chronic_therapy)
  values ('10000000-0000-4000-8000-000000000510', 'Vitamin D', '1000 IU', false);

  completion_time := public.complete_patient_daily_form('10000000-0000-4000-8000-000000000501');
  if completion_time is null then
    raise exception 'own complete daily RPC should return a completion timestamp';
  end if;

  begin
    perform public.complete_patient_daily_form('10000000-0000-4000-8000-000000000502');
    raise exception 'a patient should not complete another patient daily form';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000503';

do $$
begin
  begin
    perform public.complete_patient_daily_form('10000000-0000-4000-8000-000000000501');
    raise exception 'a doctor should not complete a patient daily form';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

set local role anon;

do $$
begin
  begin
    perform public.complete_patient_daily_form('10000000-0000-4000-8000-000000000501');
    raise exception 'anonymous role should not execute daily completion';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

rollback;
