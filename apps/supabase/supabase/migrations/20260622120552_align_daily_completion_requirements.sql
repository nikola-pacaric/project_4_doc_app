alter table public.daily_form_details
  add column if not exists took_chronic_therapy boolean;

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

  if new.wake_time is null
    or new.sleep_notes is null
    or new.sleep_notes !~ '^(0[0-9]|1[0-9]|2[0-4]):[0-5][0-9]$'
    or new.appetite is null
    or new.had_physical_activity is null
    or new.stress_level is null
    or nullif(btrim(new.day_description), '') is null
    or new.took_chronic_therapy is null
    or new.took_medication_outside_chronic_therapy is null
    or new.energy_level is null
    or new.had_naps is null
    or (new.had_naps and nullif(btrim(new.naps), '') is null)
  then
    raise check_violation using
      message = 'All applicable daily fields must be completed before final submission.',
      constraint = 'daily_form_completion_required_fields_check';
  end if;

  select
    baseline.sex = 'female',
    nullif(btrim(baseline.chronic_therapy), '') is not null
  into patient_is_female, patient_has_chronic_therapy
  from public.patient_baseline_profiles as baseline
  where baseline.patient_id = patient_id_value;

  if not coalesce(patient_has_chronic_therapy, false) and new.took_chronic_therapy then
    raise check_violation using
      message = 'Chronic therapy cannot be marked as taken when none is recorded in baseline.',
      constraint = 'daily_form_completion_chronic_therapy_check';
  end if;

  if coalesce(patient_is_female, false)
    and (
      new.had_menstruation is null
      or (new.had_menstruation and nullif(btrim(new.menstruation_notes), '') is null)
    )
  then
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
      and medication.is_chronic_therapy is false
  ) then
    raise check_violation using
      message = 'A medication entry is required when outside-therapy medication is marked yes.',
      constraint = 'daily_form_completion_requires_medication';
  end if;

  return new;
end;
$$;
