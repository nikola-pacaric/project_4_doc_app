do $$
begin
  if exists (
    select 1
    from public.symptom_details
    where symptom_type is null
       or started_at is null
       or intensity is null
       or woke_from_sleep is null
       or ended_at < started_at
       or (symptom_type = 'other' and nullif(btrim(coalesce(custom_type, '')), '') is null)
       or (
         symptom_type = 'pain'
         and (pain_location is null or pain_radiates is null or pain_description is null)
       )
  ) then
    raise exception 'Cannot harden symptom fields while incomplete rows exist';
  end if;
end;
$$;

alter table public.symptom_details
  alter column symptom_type set not null,
  alter column started_at set not null,
  alter column intensity set not null,
  alter column woke_from_sleep set not null;

alter table public.symptom_details
  drop constraint if exists symptom_details_required_fields_check,
  drop constraint if exists symptom_details_custom_type_check,
  drop constraint if exists symptom_details_pain_fields_check;

alter table public.symptom_details
  add constraint symptom_details_custom_type_check
  check (
    (symptom_type = 'other' and nullif(btrim(coalesce(custom_type, '')), '') is not null)
    or (symptom_type <> 'other' and custom_type is null)
  ),
  add constraint symptom_details_pain_fields_check
  check (
    (
      symptom_type = 'pain'
      and pain_location is not null
      and (
        (pain_location = 'other' and nullif(btrim(coalesce(pain_location_custom, '')), '') is not null)
        or (pain_location <> 'other' and pain_location_custom is null)
      )
      and pain_radiates is not null
      and (
        (pain_radiates and nullif(btrim(coalesce(pain_radiation, '')), '') is not null)
        or (not pain_radiates and pain_radiation is null)
      )
      and pain_description is not null
      and (
        (pain_description = 'other' and nullif(btrim(coalesce(pain_description_custom, '')), '') is not null)
        or (pain_description <> 'other' and pain_description_custom is null)
      )
    )
    or (
      symptom_type <> 'pain'
      and pain_location is null
      and pain_location_custom is null
      and pain_radiates is null
      and pain_radiation is null
      and pain_description is null
      and pain_description_custom is null
    )
  );

create or replace function app_private.enforce_symptom_entry_kind()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actual_kind text;
begin
  select entry.kind
  into actual_kind
  from public.patient_entries entry
  where entry.id = new.entry_id;

  if actual_kind is distinct from 'symptom' then
    raise exception using
      errcode = '23514',
      message = 'symptom_details must reference a patient_entries row with kind symptom';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_symptom_entry_kind on public.symptom_details;
create trigger enforce_symptom_entry_kind
  before insert or update of entry_id on public.symptom_details
  for each row execute function app_private.enforce_symptom_entry_kind();

revoke all privileges on table public.symptom_details from anon, authenticated;
grant select, insert, update, delete on table public.symptom_details to authenticated;

alter table public.symptom_details enable row level security;

drop policy if exists "symptom_select_own_or_linked_doctor" on public.symptom_details;
create policy "symptom_select_own_or_linked_doctor"
  on public.symptom_details for select
  to authenticated
  using (app_private.patient_owns_entry(entry_id) or app_private.doctor_can_read_entry(entry_id));

drop policy if exists "symptom_insert_own" on public.symptom_details;
create policy "symptom_insert_own"
  on public.symptom_details for insert
  to authenticated
  with check (app_private.patient_owns_entry(entry_id));

drop policy if exists "symptom_update_own" on public.symptom_details;
create policy "symptom_update_own"
  on public.symptom_details for update
  to authenticated
  using (app_private.patient_owns_entry(entry_id))
  with check (app_private.patient_owns_entry(entry_id));

drop policy if exists "symptom_delete_own" on public.symptom_details;
create policy "symptom_delete_own"
  on public.symptom_details for delete
  to authenticated
  using (app_private.patient_owns_entry(entry_id));

create or replace function public.save_patient_symptoms(
  p_day_start timestamptz,
  p_day_end timestamptz,
  p_symptoms jsonb
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_patient_id uuid := (select auth.uid());
  v_symptom jsonb;
  v_entry_id uuid;
  v_entry_id_text text;
  v_symptom_type text;
  v_started_at timestamptz;
  v_ended_at timestamptz;
  v_intensity integer;
  v_woke_from_sleep boolean;
  v_pain_location text;
  v_pain_radiates boolean;
  v_pain_description text;
  v_retained_ids uuid[] := '{}'::uuid[];
begin
  if v_patient_id is null or app_private.current_user_role() is distinct from 'patient' then
    raise exception using errcode = '42501', message = 'Only authenticated patients can save symptoms';
  end if;

  if p_day_start is null
     or p_day_end is null
     or p_day_start >= p_day_end
     or p_day_end - p_day_start > interval '26 hours' then
    raise exception using errcode = '22023', message = 'Invalid tracked-day range';
  end if;

  if p_symptoms is null
     or jsonb_typeof(p_symptoms) <> 'array'
     or jsonb_array_length(p_symptoms) < 1
     or jsonb_array_length(p_symptoms) > 32 then
    raise exception using errcode = '22023', message = 'Symptoms must contain between 1 and 32 items';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_symptoms) symptom
    where jsonb_typeof(symptom) <> 'object'
       or symptom ->> 'symptom_type' not in (
         'bloating', 'pain', 'gas', 'stomach_burning', 'heartburn', 'regurgitation',
         'early_satiety', 'belching', 'nausea', 'vomiting', 'blood_present',
         'stomach_heaviness', 'difficulty_swallowing', 'painful_swallowing',
         'false_urge_to_defecate', 'other'
       )
       or not pg_input_is_valid(symptom ->> 'started_at', 'timestamptz')
       or (
         symptom ->> 'ended_at' is not null
         and not pg_input_is_valid(symptom ->> 'ended_at', 'timestamptz')
       )
       or not pg_input_is_valid(symptom ->> 'intensity', 'integer')
       or (symptom ->> 'intensity')::integer not between 1 and 3
       or jsonb_typeof(symptom -> 'woke_from_sleep') <> 'boolean'
       or (
         nullif(btrim(coalesce(symptom ->> 'entry_id', '')), '') is not null
         and not pg_input_is_valid(symptom ->> 'entry_id', 'uuid')
       )
  ) then
    raise exception using errcode = '22023', message = 'One or more symptoms are invalid';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_symptoms) symptom
    where nullif(btrim(coalesce(symptom ->> 'entry_id', '')), '') is not null
    group by symptom ->> 'entry_id'
    having count(*) > 1
  ) then
    raise exception using errcode = '22023', message = 'A symptom entry cannot appear more than once';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_patient_id::text || ':' || p_day_start::text || ':symptoms', 0)
  );

  for v_symptom in select value from jsonb_array_elements(p_symptoms)
  loop
    v_entry_id_text := nullif(btrim(coalesce(v_symptom ->> 'entry_id', '')), '');
    v_symptom_type := v_symptom ->> 'symptom_type';
    v_started_at := (v_symptom ->> 'started_at')::timestamptz;
    v_ended_at := case
      when v_symptom ->> 'ended_at' is null then null
      else (v_symptom ->> 'ended_at')::timestamptz
    end;
    v_intensity := (v_symptom ->> 'intensity')::integer;
    v_woke_from_sleep := (v_symptom ->> 'woke_from_sleep')::boolean;
    v_pain_location := case when v_symptom_type = 'pain' then v_symptom ->> 'pain_location' else null end;
    v_pain_radiates := case
      when v_symptom_type = 'pain' then (v_symptom ->> 'pain_radiates')::boolean
      else null
    end;
    v_pain_description := case
      when v_symptom_type = 'pain' then v_symptom ->> 'pain_description'
      else null
    end;

    if v_started_at < p_day_start or v_started_at >= p_day_end
       or (v_ended_at is not null and (v_ended_at < v_started_at or v_ended_at >= p_day_end)) then
      raise exception using errcode = '22023', message = 'Symptom timestamps must belong to the tracked day';
    end if;

    if v_entry_id_text is not null then
      select entry.id
      into v_entry_id
      from public.patient_entries entry
      where entry.id = v_entry_id_text::uuid
        and entry.patient_id = v_patient_id
        and entry.kind = 'symptom'
        and entry.occurred_at >= p_day_start
        and entry.occurred_at < p_day_end
      for update;

      if v_entry_id is null then
        raise exception using errcode = '42501', message = 'A referenced symptom is not editable for this tracked day';
      end if;

      update public.patient_entries
      set occurred_at = v_started_at
      where id = v_entry_id;
    else
      insert into public.patient_entries (patient_id, kind, occurred_at, text)
      values (v_patient_id, 'symptom', v_started_at, null)
      returning id into v_entry_id;
    end if;

    insert into public.symptom_details (
      entry_id,
      symptom_type,
      custom_type,
      started_at,
      ended_at,
      intensity,
      modifying_factors,
      woke_from_sleep,
      pain_location,
      pain_location_custom,
      pain_radiates,
      pain_radiation,
      pain_description,
      pain_description_custom
    )
    values (
      v_entry_id,
      v_symptom_type,
      case when v_symptom_type = 'other' then nullif(btrim(coalesce(v_symptom ->> 'custom_type', '')), '') else null end,
      v_started_at,
      v_ended_at,
      v_intensity,
      nullif(btrim(coalesce(v_symptom ->> 'modifying_factors', '')), ''),
      v_woke_from_sleep,
      v_pain_location,
      case when v_pain_location = 'other' then nullif(btrim(coalesce(v_symptom ->> 'pain_location_custom', '')), '') else null end,
      v_pain_radiates,
      case when v_pain_radiates then nullif(btrim(coalesce(v_symptom ->> 'pain_radiation', '')), '') else null end,
      v_pain_description,
      case when v_pain_description = 'other' then nullif(btrim(coalesce(v_symptom ->> 'pain_description_custom', '')), '') else null end
    )
    on conflict (entry_id) do update
    set symptom_type = excluded.symptom_type,
        custom_type = excluded.custom_type,
        started_at = excluded.started_at,
        ended_at = excluded.ended_at,
        intensity = excluded.intensity,
        modifying_factors = excluded.modifying_factors,
        woke_from_sleep = excluded.woke_from_sleep,
        pain_location = excluded.pain_location,
        pain_location_custom = excluded.pain_location_custom,
        pain_radiates = excluded.pain_radiates,
        pain_radiation = excluded.pain_radiation,
        pain_description = excluded.pain_description,
        pain_description_custom = excluded.pain_description_custom;

    v_retained_ids := pg_catalog.array_append(v_retained_ids, v_entry_id);
  end loop;

  delete from public.patient_entries entry
  where entry.patient_id = v_patient_id
    and entry.kind = 'symptom'
    and entry.occurred_at >= p_day_start
    and entry.occurred_at < p_day_end
    and not (entry.id = any(v_retained_ids));

  return pg_catalog.array_length(v_retained_ids, 1);
end;
$$;

revoke execute on function public.save_patient_symptoms(timestamptz, timestamptz, jsonb)
  from public, anon;
grant execute on function public.save_patient_symptoms(timestamptz, timestamptz, jsonb)
  to authenticated;
