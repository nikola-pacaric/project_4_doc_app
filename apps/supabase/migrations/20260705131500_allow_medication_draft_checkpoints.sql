alter table public.medication_details
  alter column name drop not null,
  alter column dose drop not null,
  alter column is_chronic_therapy drop not null;

alter table public.medication_details
  drop constraint if exists medication_details_name_check,
  drop constraint if exists medication_details_dose_check;

alter table public.medication_details
  add constraint medication_details_name_check
    check (name is null or nullif(btrim(name), '') is not null),
  add constraint medication_details_dose_check
    check (dose is null or nullif(btrim(dose), '') is not null);

create or replace function public.save_patient_medication(
  p_entry_id uuid,
  p_occurred_at timestamptz,
  p_name text,
  p_dose text,
  p_notes text,
  p_is_chronic_therapy boolean
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  patient_id_value uuid := (select auth.uid());
  medication_entry_id uuid;
begin
  if patient_id_value is null or app_private.current_user_role() is distinct from 'patient' then
    raise exception using errcode = '42501', message = 'Only authenticated patients can save medications';
  end if;

  if p_occurred_at is null then
    raise exception using errcode = '22023', message = 'Medication time is required';
  end if;

  if p_entry_id is null then
    insert into public.patient_entries (patient_id, kind, occurred_at, text)
    values (patient_id_value, 'medication', p_occurred_at, null)
    returning id into medication_entry_id;
  else
    update public.patient_entries entry
    set occurred_at = p_occurred_at
    where entry.id = p_entry_id
      and entry.patient_id = patient_id_value
      and entry.kind = 'medication'
    returning entry.id into medication_entry_id;

    if medication_entry_id is null then
      raise exception using errcode = '42501', message = 'Medication entry is not editable by this patient';
    end if;
  end if;

  insert into public.medication_details (
    entry_id,
    name,
    dose,
    notes,
    is_chronic_therapy
  )
  values (
    medication_entry_id,
    nullif(btrim(coalesce(p_name, '')), ''),
    nullif(btrim(coalesce(p_dose, '')), ''),
    nullif(btrim(coalesce(p_notes, '')), ''),
    p_is_chronic_therapy
  )
  on conflict (entry_id) do update
  set name = excluded.name,
      dose = excluded.dose,
      notes = excluded.notes,
      is_chronic_therapy = excluded.is_chronic_therapy;

  return medication_entry_id;
end;
$$;

revoke execute on function public.save_patient_medication(
  uuid,
  timestamptz,
  text,
  text,
  text,
  boolean
) from public, anon;

grant execute on function public.save_patient_medication(
  uuid,
  timestamptz,
  text,
  text,
  text,
  boolean
) to authenticated;

create or replace function app_private.validate_daily_form_completion()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  patient_id_value uuid;
  tracked_day date;
  day_start timestamptz;
  day_end timestamptz;
  patient_is_female boolean;
  patient_has_chronic_therapy boolean;
begin
  if new.completed_at is null then
    return new;
  end if;

  select entry.patient_id, (entry.occurred_at at time zone 'Europe/Belgrade')::date
  into patient_id_value, tracked_day
  from public.patient_entries as entry
  where entry.id = new.entry_id
    and entry.kind = 'daily';

  if patient_id_value is null then
    raise check_violation using
      message = 'Completed daily details must belong to a daily patient entry.',
      constraint = 'daily_form_completion_entry_check';
  end if;

  select
    baseline.sex = 'female',
    nullif(btrim(baseline.chronic_therapy), '') is not null
  into patient_is_female, patient_has_chronic_therapy
  from public.patient_baseline_profiles as baseline
  where baseline.patient_id = patient_id_value;

  if new.wake_time is null
    or new.sleep_notes is null
    or new.sleep_notes !~ '^(0[0-9]|1[0-9]|2[0-4]):[0-5][0-9]$'
    or new.appetite is null
    or new.had_physical_activity is null
    or new.stress_level is null
    or nullif(btrim(new.day_description), '') is null
    or (coalesce(patient_has_chronic_therapy, false) and new.took_chronic_therapy is null)
    or new.took_medication_outside_chronic_therapy is null
    or new.energy_level is null
    or new.had_naps is null
    or (new.had_naps and nullif(btrim(new.naps), '') is null)
  then
    raise check_violation using
      message = 'All applicable daily fields must be completed before final submission.',
      constraint = 'daily_form_completion_required_fields_check';
  end if;

  if not coalesce(patient_has_chronic_therapy, false) and new.took_chronic_therapy then
    raise check_violation using
      message = 'Chronic therapy cannot be marked as taken when none is recorded in baseline.',
      constraint = 'daily_form_completion_chronic_therapy_check';
  end if;

  if coalesce(patient_is_female, false) and new.had_menstruation is null then
    raise check_violation using
      message = 'Menstruation response is required for this patient before final submission.',
      constraint = 'daily_form_completion_menstruation_check';
  end if;

  day_start := tracked_day::timestamp at time zone 'Europe/Belgrade';
  day_end := (tracked_day + 1)::timestamp at time zone 'Europe/Belgrade';

  if new.had_physical_activity and not exists (
    select 1
    from public.patient_entries as exercise_entry
    join public.exercise_details as exercise
      on exercise.entry_id = exercise_entry.id
    where exercise_entry.patient_id = patient_id_value
      and exercise_entry.kind = 'exercise'
      and exercise_entry.occurred_at >= day_start
      and exercise_entry.occurred_at < day_end
  ) then
    raise check_violation using
      message = 'An exercise entry is required when physical activity is marked yes.',
      constraint = 'daily_form_completion_requires_exercise';
  end if;

  if new.took_medication_outside_chronic_therapy and not exists (
    select 1
    from public.patient_entries as medication_entry
    join public.medication_details as medication
      on medication.entry_id = medication_entry.id
    where medication_entry.patient_id = patient_id_value
      and medication_entry.kind = 'medication'
      and medication_entry.occurred_at >= day_start
      and medication_entry.occurred_at < day_end
      and nullif(btrim(coalesce(medication.name, '')), '') is not null
      and nullif(btrim(coalesce(medication.dose, '')), '') is not null
      and medication.is_chronic_therapy is false
  ) then
    raise check_violation using
      message = 'A complete medication entry is required when outside-therapy medication is marked yes.',
      constraint = 'daily_form_completion_requires_medication';
  end if;

  if new.had_menstruation and not exists (
    select 1
    from public.patient_entries as menstruation_entry
    join public.menstruation_events as menstruation
      on menstruation.entry_id = menstruation_entry.id
    where menstruation_entry.patient_id = patient_id_value
      and menstruation_entry.kind = 'menstruation'
      and menstruation_entry.occurred_at >= day_start
      and menstruation_entry.occurred_at < day_end
  ) then
    raise check_violation using
      message = 'A period entry is required when menstruation is marked yes.',
      constraint = 'daily_form_completion_requires_menstruation';
  end if;

  return new;
end;
$$;
