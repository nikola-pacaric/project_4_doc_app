begin;

do $$
declare
  range_constraint_name text;
begin
  select constraint_row.conname
  into range_constraint_name
  from pg_constraint constraint_row
  where constraint_row.conrelid = 'public.export_requests'::regclass
    and constraint_row.contype = 'c'
    and pg_get_constraintdef(constraint_row.oid) like '%range_type%'
    and pg_get_constraintdef(constraint_row.oid) like '%selected_date%'
    and pg_get_constraintdef(constraint_row.oid) like '%selected_month%'
  limit 1;

  if range_constraint_name is not null then
    execute format('alter table public.export_requests drop constraint %I', range_constraint_name);
  end if;
end $$;

alter table public.export_requests
  add constraint export_requests_range_selection_check
  check (
    (range_type = 'selected_day' and selected_date is not null and selected_month is null)
    or (range_type = 'partial_month' and selected_month is not null and selected_date is null)
    or (range_type = 'all_time' and selected_date is null and selected_month is null)
  );

create or replace function app_private.export_patient_data(
  target_patient_id uuid,
  export_mode public.export_mode,
  export_range_type public.export_range_type,
  selected_date date default null,
  selected_month date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  range_start timestamptz;
  range_end timestamptz;
  normalized_month date;
  baseline_payload jsonb;
  entries_payload jsonb;
  payload jsonb;
  inserted_request_id uuid;
begin
  if app_private.current_user_role() <> 'doctor'
    or not app_private.is_linked_doctor(target_patient_id) then
    raise exception 'doctor is not linked to this patient' using errcode = '42501';
  end if;

  if export_range_type = 'selected_day' then
    if selected_date is null or selected_month is not null then
      raise exception 'selected_date is required for selected_day exports' using errcode = '22023';
    end if;

    range_start := selected_date::timestamp at time zone 'Europe/Belgrade';
    range_end := (selected_date + 1)::timestamp at time zone 'Europe/Belgrade';
  elsif export_range_type = 'partial_month' then
    if selected_month is null or selected_date is not null then
      raise exception 'selected_month is required for partial_month exports' using errcode = '22023';
    end if;

    normalized_month := date_trunc('month', selected_month)::date;
    range_start := normalized_month::timestamp at time zone 'Europe/Belgrade';
    range_end := least(
      (normalized_month + interval '1 month')::timestamp at time zone 'Europe/Belgrade',
      now()
    );
  elsif export_range_type = 'all_time' then
    if selected_date is not null or selected_month is not null then
      raise exception 'all_time exports must not include a selected date or month' using errcode = '22023';
    end if;

    select coalesce(min(entry.occurred_at), now())
    into range_start
    from public.patient_entries entry
    where entry.patient_id = target_patient_id;

    range_end := now();
  else
    raise exception 'unsupported export range type' using errcode = '22023';
  end if;

  select coalesce(to_jsonb(baseline) - 'patient_id', '{}'::jsonb)
  into baseline_payload
  from public.patient_baseline_profiles baseline
  where baseline.patient_id = target_patient_id;

  baseline_payload := coalesce(baseline_payload, '{}'::jsonb);

  if export_mode = 'images_only_with_labels' then
    select coalesce(
      jsonb_agg(
        jsonb_strip_nulls(
          jsonb_build_object(
            'entryId', entry.id,
            'kind', entry.kind,
            'occurredAt', entry.occurred_at,
            'label', coalesce(
              nullif(photo.context_label, ''),
              nullif(meal.name, ''),
              nullif(medication.name, ''),
              nullif(entry.text, ''),
              entry.kind::text
            ),
            'photo', jsonb_build_object(
              'id', photo.id,
              'photoPath', photo.photo_path,
              'thumbnailPath', photo.thumbnail_path,
              'contextType', photo.context_type,
              'contextLabel', photo.context_label,
              'mimeType', photo.mime_type,
              'widthPx', photo.width_px,
              'heightPx', photo.height_px,
              'sizeBytes', photo.size_bytes,
              'thumbnailSizeBytes', photo.thumbnail_size_bytes,
              'createdAt', photo.created_at
            )
          )
        )
        order by entry.occurred_at, photo.created_at
      ),
      '[]'::jsonb
    )
    into entries_payload
    from public.entry_photos photo
    join public.patient_entries entry on entry.id = photo.entry_id
    left join public.meal_details meal on meal.entry_id = entry.id
    left join public.medication_details medication on medication.entry_id = entry.id
    where entry.patient_id = target_patient_id
      and entry.occurred_at >= range_start
      and entry.occurred_at < range_end;
  else
    select coalesce(
      jsonb_agg(
        jsonb_strip_nulls(
          jsonb_build_object(
            'id', entry.id,
            'kind', entry.kind,
            'occurredAt', entry.occurred_at,
            'text', entry.text,
            'createdAt', entry.created_at,
            'updatedAt', entry.updated_at,
            'details', case entry.kind
              when 'daily' then jsonb_strip_nulls(jsonb_build_object(
                'dailyForm', (
                  select to_jsonb(daily_detail) - 'entry_id'
                  from public.daily_form_details daily_detail
                  where daily_detail.entry_id = entry.id
                ),
                'foodForm', (
                  select to_jsonb(food_detail) - 'entry_id'
                  from public.food_form_details food_detail
                  where food_detail.entry_id = entry.id
                ),
                'otherFluids', (
                  select coalesce(
                    jsonb_agg(to_jsonb(fluid) - 'daily_entry_id' order by fluid.occurred_at),
                    '[]'::jsonb
                  )
                  from public.other_fluid_details fluid
                  where fluid.daily_entry_id = entry.id
                )
              ))
              when 'meal' then (
                select to_jsonb(meal_detail) - 'entry_id'
                from public.meal_details meal_detail
                where meal_detail.entry_id = entry.id
              )
              when 'fluid' then (
                select to_jsonb(fluid_detail) - 'entry_id' - 'daily_entry_id'
                from public.other_fluid_details fluid_detail
                where fluid_detail.entry_id = entry.id
              )
              when 'symptom' then (
                select to_jsonb(symptom_detail) - 'entry_id'
                from public.symptom_details symptom_detail
                where symptom_detail.entry_id = entry.id
              )
              when 'stool' then (
                select to_jsonb(stool_detail) - 'entry_id'
                from public.stool_details stool_detail
                where stool_detail.entry_id = entry.id
              )
              when 'medication' then (
                select to_jsonb(medication_detail) - 'entry_id'
                from public.medication_details medication_detail
                where medication_detail.entry_id = entry.id
              )
              when 'exercise' then (
                select to_jsonb(exercise_detail) - 'entry_id'
                from public.exercise_details exercise_detail
                where exercise_detail.entry_id = entry.id
              )
              when 'menstruation' then (
                select to_jsonb(menstruation_detail) - 'entry_id'
                from public.menstruation_events menstruation_detail
                where menstruation_detail.entry_id = entry.id
              )
              else null
            end,
            'photos', case
              when export_mode = 'all_data_with_images' then (
                select coalesce(
                  jsonb_agg(
                    jsonb_build_object(
                      'id', photo.id,
                      'photoPath', photo.photo_path,
                      'thumbnailPath', photo.thumbnail_path,
                      'contextType', photo.context_type,
                      'contextLabel', photo.context_label,
                      'mimeType', photo.mime_type,
                      'widthPx', photo.width_px,
                      'heightPx', photo.height_px,
                      'sizeBytes', photo.size_bytes,
                      'thumbnailSizeBytes', photo.thumbnail_size_bytes,
                      'createdAt', photo.created_at
                    )
                    order by photo.created_at
                  ),
                  '[]'::jsonb
                )
                from public.entry_photos photo
                where photo.entry_id = entry.id
              )
              else null
            end
          )
        )
        order by entry.occurred_at, entry.created_at
      ),
      '[]'::jsonb
    )
    into entries_payload
    from public.patient_entries entry
    where entry.patient_id = target_patient_id
      and entry.occurred_at >= range_start
      and entry.occurred_at < range_end;
  end if;

  payload := jsonb_strip_nulls(jsonb_build_object(
    'schemaVersion', 1,
    'patientId', target_patient_id,
    'doctorId', auth.uid(),
    'mode', export_mode,
    'range', jsonb_build_object(
      'type', export_range_type,
      'selectedDate', selected_date,
      'selectedMonth', case
        when export_range_type = 'partial_month' then normalized_month
        else null
      end,
      'start', range_start,
      'end', range_end
    ),
    'generatedAt', now(),
    'metadata', jsonb_build_object(
      'entryCount', jsonb_array_length(entries_payload),
      'containsImageBinary', false,
      'imageReferenceType', case
        when export_mode in ('all_data_with_images', 'images_only_with_labels') then 'storage_path'
        else 'none'
      end
    ),
    'baseline', baseline_payload,
    'entries', entries_payload
  ));

  if payload::text like '%data:image/%' or payload::text like '%;base64,%' then
    raise exception 'export payload must not contain base64 images' using errcode = '22023';
  end if;

  insert into public.export_requests (
    doctor_id,
    patient_id,
    mode,
    range_type,
    selected_date,
    selected_month,
    status,
    result,
    completed_at
  )
  values (
    auth.uid(),
    target_patient_id,
    export_mode,
    export_range_type,
    selected_date,
    case when export_range_type = 'partial_month' then normalized_month else null end,
    'completed',
    payload,
    now()
  )
  returning id into inserted_request_id;

  payload := jsonb_set(payload, '{exportRequestId}', to_jsonb(inserted_request_id));

  update public.export_requests
  set result = payload
  where id = inserted_request_id;

  insert into public.audit_events (actor_id, actor_role, patient_id, event_type, metadata)
  values (
    auth.uid(),
    'doctor',
    target_patient_id,
    'patient_export_created',
    jsonb_build_object(
      'export_request_id', inserted_request_id,
      'mode', export_mode,
      'range_type', export_range_type,
      'range_start', range_start,
      'range_end', range_end,
      'entry_count', jsonb_array_length(entries_payload)
    )
  );

  return payload;
end;
$$;

revoke insert on table public.audit_events from authenticated;
drop policy if exists "audit_insert_self" on public.audit_events;

alter table public.patient_baseline_profiles
  add constraint patient_baseline_required_fields_check
  check (
    sex is not null
    and birth_year is not null
    and nullif(btrim(occupation), '') is not null
    and weight_kg is not null
    and height_cm is not null
    and nullif(btrim(recent_major_weight_change), '') is not null
    and weight_reminder_due_at is not null
  ) not valid,
  add constraint patient_baseline_measurements_check
  check (
    weight_kg <= 500
    and height_cm between 50 and 250
  ) not valid;

alter table public.patient_baseline_profiles
  validate constraint patient_baseline_required_fields_check;

alter table public.patient_baseline_profiles
  validate constraint patient_baseline_measurements_check;

create or replace function app_private.enforce_patient_baseline_birth_year()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.birth_year > extract(year from current_timestamp at time zone 'Europe/Belgrade')::integer then
    raise exception using
      errcode = '23514',
      message = 'patient baseline birth year cannot be in the future';
  end if;

  return new;
end;
$$;

revoke execute on function app_private.enforce_patient_baseline_birth_year()
from public, anon, authenticated;

drop trigger if exists enforce_patient_baseline_birth_year
  on public.patient_baseline_profiles;
create trigger enforce_patient_baseline_birth_year
  before insert or update of birth_year on public.patient_baseline_profiles
  for each row execute function app_private.enforce_patient_baseline_birth_year();

create or replace function app_private.can_delete_entry_photo_metadata(target_photo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.entry_photos photo
    where photo.id = target_photo_id
      and photo.patient_id = auth.uid()
      and not exists (
        select 1
        from storage.objects object_row
        where object_row.bucket_id = 'patient-entry-photos'
          and object_row.name in (photo.photo_path, photo.thumbnail_path)
      )
  );
$$;

revoke execute on function app_private.can_delete_entry_photo_metadata(uuid)
from public, anon;
grant execute on function app_private.can_delete_entry_photo_metadata(uuid)
to authenticated;

drop policy if exists "photos_delete_own" on public.entry_photos;
create policy "photos_delete_own"
  on public.entry_photos for delete
  to authenticated
  using (app_private.can_delete_entry_photo_metadata(id));

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
    and not exists (
      select 1
      from public.entry_photos photo
      where photo.entry_id = patient_entries.id
    )
  );

drop policy if exists "patient_photo_objects_insert_own_entry" on storage.objects;
create policy "patient_photo_objects_insert_own_entry"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'patient-entry-photos'
    and split_part(name, '/', 1) = 'patients'
    and split_part(name, '/', 2) = (select auth.uid())::text
    and split_part(name, '/', 3) = 'entries'
    and split_part(name, '/', 5) in ('photos', 'thumbs')
    and name like 'patients/%/entries/%/%.jpg'
    and split_part(name, '/', 7) = ''
    and name not like '%base64%'
    and exists (
      select 1
      from public.entry_photos photo
      where photo.patient_id = (select auth.uid())
        and photo.entry_id = app_private.try_uuid(split_part(storage.objects.name, '/', 4))
        and (
          photo.photo_path = storage.objects.name
          or photo.thumbnail_path = storage.objects.name
        )
    )
  );

commit;
