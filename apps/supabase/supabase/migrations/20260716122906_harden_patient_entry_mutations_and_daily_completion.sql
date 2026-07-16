begin;

-- Permit legacy text-entry edits while keeping audit writes behind the private trigger.
create or replace function app_private.audit_patient_note_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id_value uuid := (select auth.uid());
  actor_role_value public.user_role := app_private.current_user_role();
begin
  if actor_id_value is null
    or actor_role_value is distinct from 'patient'::public.user_role
    or actor_id_value is distinct from new.patient_id then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.kind is distinct from 'note'::public.entry_kind then
      return new;
    end if;

    insert into public.audit_events (actor_id, actor_role, patient_id, event_type, metadata)
    values (
      actor_id_value,
      actor_role_value,
      new.patient_id,
      'patient_note_created',
      pg_catalog.jsonb_build_object(
        'entry_id', new.id,
        'client_entry_id', new.client_entry_id,
        'new_occurred_at', new.occurred_at,
        'new_text', new.text
      )
    );
  elsif tg_op = 'UPDATE' then
    if old.kind not in ('note'::public.entry_kind, 'text'::public.entry_kind)
      or new.kind not in ('note'::public.entry_kind, 'text'::public.entry_kind)
      or (
        old.occurred_at is not distinct from new.occurred_at
        and old.text is not distinct from new.text
      ) then
      return new;
    end if;

    insert into public.audit_events (actor_id, actor_role, patient_id, event_type, metadata)
    values (
      actor_id_value,
      actor_role_value,
      new.patient_id,
      'patient_note_updated',
      pg_catalog.jsonb_build_object(
        'entry_id', new.id,
        'previous_occurred_at', old.occurred_at,
        'new_occurred_at', new.occurred_at,
        'previous_text', old.text,
        'new_text', new.text
      )
    );
  end if;

  return new;
end;
$$;

revoke execute on function app_private.audit_patient_note_changes()
from public, anon, authenticated;

-- Update notes, legacy text entries, and stool-to-no-stool conversions in place.
create or replace function public.save_patient_note(
  p_entry_id uuid,
  p_occurred_at timestamptz,
  p_text text,
  p_client_entry_id text
)
returns table (
  id uuid,
  patient_id uuid,
  kind public.entry_kind,
  occurred_at timestamptz,
  text text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  patient_id_value uuid := (select auth.uid());
  note_entry_id uuid;
  existing_kind public.entry_kind;
  next_text text := btrim(p_text);
  normalized_client_entry_id text := nullif(btrim(p_client_entry_id), '');
begin
  if patient_id_value is null or app_private.current_user_role() is distinct from 'patient' then
    raise exception using errcode = '42501', message = 'Only authenticated patients can save notes';
  end if;

  if p_occurred_at is null then
    raise exception using errcode = '22023', message = 'Note time is required';
  end if;

  if nullif(next_text, '') is null then
    raise exception using errcode = '22023', message = 'Note text is required';
  end if;

  if normalized_client_entry_id is not null and (
    pg_catalog.length(normalized_client_entry_id) > 128
    or normalized_client_entry_id !~ '^[A-Za-z0-9._:-]+$'
  ) then
    raise exception using errcode = '22023', message = 'Invalid note idempotency key';
  end if;

  if p_entry_id is not null and normalized_client_entry_id is not null then
    raise exception using
      errcode = '22023',
      message = 'An idempotency key cannot be used when updating a note';
  end if;

  if p_entry_id is null then
    insert into public.patient_entries (
      patient_id, kind, occurred_at, text, client_entry_id
    )
    values (
      patient_id_value, 'note', p_occurred_at, next_text, normalized_client_entry_id
    )
    on conflict do nothing
    returning patient_entries.id into note_entry_id;

    if note_entry_id is null then
      select entry.id
      into note_entry_id
      from public.patient_entries entry
      where entry.patient_id = patient_id_value
        and entry.client_entry_id = normalized_client_entry_id
        and entry.kind = 'note'
        and entry.occurred_at = p_occurred_at
        and entry.text = next_text;

      if note_entry_id is null then
        raise exception using
          errcode = '22023',
          message = 'Note idempotency key was already used with different content';
      end if;
    end if;
  else
    select entry.id, entry.kind
    into note_entry_id, existing_kind
    from public.patient_entries entry
    where entry.id = p_entry_id
      and entry.patient_id = patient_id_value
    for update;

    if note_entry_id is null
      or (
        existing_kind not in ('note'::public.entry_kind, 'text'::public.entry_kind)
        and not (
          existing_kind = 'stool'::public.entry_kind
          and next_text = 'No stool today'
        )
      ) then
      raise exception using errcode = '42501', message = 'Note entry is not editable by this patient';
    end if;

    if existing_kind = 'stool'::public.entry_kind then
      delete from public.stool_details details
      where details.entry_id = note_entry_id;
    end if;

    update public.patient_entries entry
    set kind = case
          when existing_kind = 'stool'::public.entry_kind then 'note'::public.entry_kind
          else existing_kind
        end,
        occurred_at = p_occurred_at,
        text = next_text
    where entry.id = note_entry_id;
  end if;

  return query
  select
    entry.id,
    entry.patient_id,
    entry.kind,
    entry.occurred_at,
    entry.text,
    entry.created_at,
    entry.updated_at
  from public.patient_entries entry
  where entry.id = note_entry_id;
end;
$$;

revoke execute on function public.save_patient_note(uuid, timestamptz, text, text)
from public, anon;
grant execute on function public.save_patient_note(uuid, timestamptz, text, text)
to authenticated;

-- Convert the no-stool marker back to a stool entry without replacing its row.
create or replace function public.save_patient_stool(
  p_entry_id uuid,
  p_occurred_at timestamptz,
  p_bristol_type integer,
  p_urgency_level text,
  p_pain boolean,
  p_mucus boolean,
  p_blood boolean,
  p_fatty_stool boolean,
  p_black_stool boolean,
  p_notes text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  patient_id_value uuid := (select auth.uid());
  stool_entry_id uuid;
  existing_kind public.entry_kind;
  existing_text text;
begin
  if patient_id_value is null or app_private.current_user_role() is distinct from 'patient' then
    raise exception using errcode = '42501', message = 'Only authenticated patients can save stool entries';
  end if;

  if p_occurred_at is null then
    raise exception using errcode = '22023', message = 'Stool entry time is required';
  end if;

  if p_bristol_type is null or p_bristol_type not between 1 and 7 then
    raise exception using errcode = '22023', message = 'Bristol type must be between 1 and 7';
  end if;

  if p_urgency_level is null or p_urgency_level not in ('none', 'mild', 'moderate', 'severe') then
    raise exception using errcode = '22023', message = 'Stool urgency level is invalid';
  end if;

  if p_pain is null
    or p_mucus is null
    or p_blood is null
    or p_fatty_stool is null
    or p_black_stool is null then
    raise exception using errcode = '22023', message = 'Stool symptom answers are required';
  end if;

  if p_entry_id is null then
    insert into public.patient_entries (patient_id, kind, occurred_at, text)
    values (patient_id_value, 'stool', p_occurred_at, null)
    returning id into stool_entry_id;
  else
    select entry.id, entry.kind, entry.text
    into stool_entry_id, existing_kind, existing_text
    from public.patient_entries entry
    where entry.id = p_entry_id
      and entry.patient_id = patient_id_value
    for update;

    if stool_entry_id is null
      or (
        existing_kind <> 'stool'::public.entry_kind
        and not (
          existing_kind = 'note'::public.entry_kind
          and existing_text = 'No stool today'
        )
      ) then
      raise exception using errcode = '42501', message = 'Stool entry is not editable by this patient';
    end if;

    update public.patient_entries entry
    set kind = 'stool',
        occurred_at = p_occurred_at,
        text = null
    where entry.id = stool_entry_id;
  end if;

  insert into public.stool_details (
    entry_id,
    bristol_type,
    urgency,
    urgency_level,
    pain,
    mucus,
    blood,
    fatty_stool,
    black_stool,
    notes
  )
  values (
    stool_entry_id,
    p_bristol_type,
    p_urgency_level <> 'none',
    p_urgency_level,
    p_pain,
    p_mucus,
    p_blood,
    p_fatty_stool,
    p_black_stool,
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  on conflict (entry_id) do update
  set bristol_type = excluded.bristol_type,
      urgency = excluded.urgency,
      urgency_level = excluded.urgency_level,
      pain = excluded.pain,
      mucus = excluded.mucus,
      blood = excluded.blood,
      fatty_stool = excluded.fatty_stool,
      black_stool = excluded.black_stool,
      notes = excluded.notes;

  return stool_entry_id;
end;
$$;

revoke execute on function public.save_patient_stool(
  uuid, timestamptz, integer, text, boolean, boolean, boolean, boolean, boolean, text
) from public, anon;
grant execute on function public.save_patient_stool(
  uuid, timestamptz, integer, text, boolean, boolean, boolean, boolean, boolean, text
) to authenticated;

-- Delete the database row first. Its foreign key cascades photo metadata; storage
-- cleanup can then use the patient-owned path even though the metadata is gone.
drop policy if exists "entries_delete_own" on public.patient_entries;
create policy "entries_delete_own"
  on public.patient_entries for delete
  to authenticated
  using (
    patient_id = (select auth.uid())
    and occurred_at >= (
      date_trunc('day', now() at time zone 'Europe/Belgrade')
      at time zone 'Europe/Belgrade'
    )
    and occurred_at < (
      (date_trunc('day', now() at time zone 'Europe/Belgrade') + interval '1 day')
      at time zone 'Europe/Belgrade'
    )
  );

drop policy if exists "patient_photo_objects_delete_own_metadata" on storage.objects;
create policy "patient_photo_objects_delete_own_metadata"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'patient-entry-photos'
    and split_part(name, '/', 1) = 'patients'
    and split_part(name, '/', 2) = (select auth.uid())::text
    and split_part(name, '/', 3) = 'entries'
    and split_part(name, '/', 5) in ('photos', 'thumbs')
    and name like 'patients/%/entries/%/%.jpg'
    and split_part(name, '/', 7) = ''
    and name not like '%base64%'
  );

-- Require explicit symptom and stool answers. The two "none" choices count.
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

  if not exists (
    select 1
    from public.patient_entries symptom_entry
    join public.symptom_details symptom on symptom.entry_id = symptom_entry.id
    where symptom_entry.patient_id = patient_id_value
      and symptom_entry.kind = 'symptom'
      and symptom_entry.occurred_at >= day_start
      and symptom_entry.occurred_at < day_end
  ) then
    raise check_violation using
      message = 'A symptom answer, including no symptoms, is required before final submission.',
      constraint = 'daily_form_completion_requires_symptom';
  end if;

  if not exists (
    select 1
    from public.patient_entries stool_entry
    where stool_entry.patient_id = patient_id_value
      and stool_entry.occurred_at >= day_start
      and stool_entry.occurred_at < day_end
      and (
        (
          stool_entry.kind = 'stool'
          and exists (
            select 1
            from public.stool_details stool
            where stool.entry_id = stool_entry.id
          )
        )
        or (
          stool_entry.kind = 'note'
          and stool_entry.text = 'No stool today'
        )
      )
  ) then
    raise check_violation using
      message = 'A stool answer, including no stool today, is required before final submission.',
      constraint = 'daily_form_completion_requires_stool';
  end if;

  if new.had_physical_activity and not exists (
    select 1
    from public.patient_entries as exercise_entry
    join public.exercise_details as exercise on exercise.entry_id = exercise_entry.id
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
    join public.medication_details as medication on medication.entry_id = medication_entry.id
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
    join public.menstruation_events as menstruation on menstruation.entry_id = menstruation_entry.id
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

commit;
