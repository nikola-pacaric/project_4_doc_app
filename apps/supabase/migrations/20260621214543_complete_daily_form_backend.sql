alter table public.daily_form_details
  drop column if exists activity_notes;

alter table public.daily_form_details
  drop constraint if exists daily_form_details_sleep_duration_check;

-- Draft rows may stay incomplete. Any supplied duration must still be a valid HH:MM value.
alter table public.daily_form_details
  add constraint daily_form_details_sleep_duration_check
  check (
    sleep_notes is null
    or sleep_notes ~ '^(0[0-9]|1[0-9]|2[0-4]):[0-5][0-9]$'
  ) not valid;

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
    or new.took_medication_outside_chronic_therapy is null
    or new.energy_level is null
    or new.had_naps is null
    or (
      new.took_medication_outside_chronic_therapy
      and nullif(btrim(new.medication_outside_chronic_therapy), '') is null
    )
    or (new.had_naps and nullif(btrim(new.naps), '') is null)
  then
    raise check_violation using
      message = 'All applicable daily fields must be completed before final submission.',
      constraint = 'daily_form_completion_required_fields_check';
  end if;

  select baseline.sex = 'female'
  into patient_is_female
  from public.patient_baseline_profiles as baseline
  where baseline.patient_id = patient_id_value;

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

  if new.had_physical_activity then
    day_start := tracked_day::timestamp at time zone 'Europe/Belgrade';
    day_end := (tracked_day + 1)::timestamp at time zone 'Europe/Belgrade';

    if not exists (
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
  end if;

  return new;
end;
$$;

drop trigger if exists validate_daily_form_completion on public.daily_form_details;
create trigger validate_daily_form_completion
  before insert or update on public.daily_form_details
  for each row
  execute function app_private.validate_daily_form_completion();

create or replace function public.complete_patient_daily_form(p_entry_id uuid)
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  completion_time timestamptz;
begin
  update public.daily_form_details as details
  set completed_at = clock_timestamp()
  from public.patient_entries as entry
  where details.entry_id = p_entry_id
    and entry.id = details.entry_id
    and entry.kind = 'daily'
    and entry.patient_id = auth.uid()
  returning details.completed_at into completion_time;

  if completion_time is null then
    raise insufficient_privilege using
      message = 'Only the owning patient can complete this daily form.';
  end if;

  return completion_time;
end;
$$;

revoke all on function public.complete_patient_daily_form(uuid) from public, anon;
grant execute on function public.complete_patient_daily_form(uuid) to authenticated;
