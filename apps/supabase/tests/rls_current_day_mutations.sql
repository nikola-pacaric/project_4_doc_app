begin;

-- Hosted Storage protects direct SQL deletes unless the Storage API's internal
-- switch is set. This rollback-only test enables the same policy-checked path.
set local storage.allow_delete_query = 'true';

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
  ('00000000-0000-4000-8000-000000000701', 'authenticated', 'authenticated', 'current_day_patient_a@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000702', 'authenticated', 'authenticated', 'current_day_patient_b@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000703', 'authenticated', 'authenticated', 'current_day_linked_doctor@example.test', 'test', now(), '{"app_role":"doctor"}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000704', 'authenticated', 'authenticated', 'current_day_unlinked_doctor@example.test', 'test', now(), '{"app_role":"doctor"}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.user_profiles (id, role, display_name)
values
  ('00000000-0000-4000-8000-000000000701', 'patient', 'Current Day Patient A'),
  ('00000000-0000-4000-8000-000000000702', 'patient', 'Current Day Patient B'),
  ('00000000-0000-4000-8000-000000000703', 'doctor', 'Current Day Linked Doctor'),
  ('00000000-0000-4000-8000-000000000704', 'doctor', 'Current Day Unlinked Doctor')
on conflict (id) do nothing;

insert into public.doctor_patient_access (doctor_id, patient_id)
values (
  '00000000-0000-4000-8000-000000000703',
  '00000000-0000-4000-8000-000000000701'
)
on conflict (doctor_id, patient_id)
where active = true and revoked_at is null
do nothing;

insert into public.patient_entries (
  id,
  patient_id,
  kind,
  occurred_at,
  text,
  client_entry_id
)
values
  (
    '10000000-0000-4000-8000-000000000701',
    '00000000-0000-4000-8000-000000000701',
    'note',
    (
      date_trunc('day', now() at time zone 'Europe/Belgrade') + interval '9 hours'
    ) at time zone 'Europe/Belgrade',
    'Current note',
    'current-day-note'
  ),
  (
    '10000000-0000-4000-8000-000000000702',
    '00000000-0000-4000-8000-000000000701',
    'note',
    (
      date_trunc('day', now() at time zone 'Europe/Belgrade')
      - interval '1 day'
      + interval '9 hours'
    ) at time zone 'Europe/Belgrade',
    'Historical note',
    'historical-note'
  ),
  (
    '10000000-0000-4000-8000-000000000703',
    '00000000-0000-4000-8000-000000000702',
    'note',
    (
      date_trunc('day', now() at time zone 'Europe/Belgrade') + interval '9 hours'
    ) at time zone 'Europe/Belgrade',
    'Other patient note',
    'other-patient-note'
  ),
  (
    '10000000-0000-4000-8000-000000000704',
    '00000000-0000-4000-8000-000000000701',
    'stool',
    (
      date_trunc('day', now() at time zone 'Europe/Belgrade') + interval '10 hours'
    ) at time zone 'Europe/Belgrade',
    null,
    null
  ),
  (
    '10000000-0000-4000-8000-000000000705',
    '00000000-0000-4000-8000-000000000701',
    'stool',
    (
      date_trunc('day', now() at time zone 'Europe/Belgrade')
      - interval '1 day'
      + interval '10 hours'
    ) at time zone 'Europe/Belgrade',
    null,
    null
  ),
  (
    '10000000-0000-4000-8000-000000000706',
    '00000000-0000-4000-8000-000000000701',
    'meal',
    (
      date_trunc('day', now() at time zone 'Europe/Belgrade') + interval '12 hours'
    ) at time zone 'Europe/Belgrade',
    null,
    null
  ),
  (
    '10000000-0000-4000-8000-000000000707',
    '00000000-0000-4000-8000-000000000701',
    'meal',
    (
      date_trunc('day', now() at time zone 'Europe/Belgrade')
      - interval '1 day'
      + interval '12 hours'
    ) at time zone 'Europe/Belgrade',
    null,
    null
  ),
  (
    '10000000-0000-4000-8000-000000000708',
    '00000000-0000-4000-8000-000000000701',
    'meal',
    (
      date_trunc('day', now() at time zone 'Europe/Belgrade') + interval '13 hours'
    ) at time zone 'Europe/Belgrade',
    null,
    null
  )
  ,
  (
    '10000000-0000-4000-8000-000000000709',
    '00000000-0000-4000-8000-000000000701',
    'meal',
    (
      date_trunc('day', now() at time zone 'Europe/Belgrade') + interval '14 hours'
    ) at time zone 'Europe/Belgrade',
    null,
    null
  ),
  (
    '10000000-0000-4000-8000-000000000710',
    '00000000-0000-4000-8000-000000000701',
    'meal',
    (
      date_trunc('day', now() at time zone 'Europe/Belgrade')
      - interval '1 day'
      + interval '14 hours'
    ) at time zone 'Europe/Belgrade',
    null,
    null
  )
on conflict (id) do nothing;

insert into public.stool_details (
  entry_id,
  bristol_type,
  urgency,
  urgency_level,
  pain,
  mucus,
  blood,
  fatty_stool,
  black_stool
)
values
  ('10000000-0000-4000-8000-000000000704', 4, false, 'none', false, false, false, false, false),
  ('10000000-0000-4000-8000-000000000705', 4, false, 'none', false, false, false, false, false)
on conflict (entry_id) do nothing;

insert into public.meal_details (entry_id, meal_type, name)
values
  ('10000000-0000-4000-8000-000000000706', 'lunch', 'Current meal'),
  ('10000000-0000-4000-8000-000000000707', 'lunch', 'Historical meal'),
  ('10000000-0000-4000-8000-000000000708', 'dinner', 'Cleanup meal')
on conflict (entry_id) do nothing;

insert into public.entry_photos (
  id,
  entry_id,
  patient_id,
  photo_path,
  thumbnail_path,
  original_filename,
  mime_type,
  width_px,
  height_px,
  size_bytes,
  thumbnail_size_bytes,
  context_type,
  context_label
)
values
  (
    '30000000-0000-4000-8000-000000000701',
    '10000000-0000-4000-8000-000000000706',
    '00000000-0000-4000-8000-000000000701',
    'patients/00000000-0000-4000-8000-000000000701/entries/10000000-0000-4000-8000-000000000706/photos/current.jpg',
    'patients/00000000-0000-4000-8000-000000000701/entries/10000000-0000-4000-8000-000000000706/thumbs/current.jpg',
    'current.jpg',
    'image/jpeg',
    1280,
    960,
    300000,
    30000,
    'meal',
    'Current meal'
  ),
  (
    '30000000-0000-4000-8000-000000000702',
    '10000000-0000-4000-8000-000000000707',
    '00000000-0000-4000-8000-000000000701',
    'patients/00000000-0000-4000-8000-000000000701/entries/10000000-0000-4000-8000-000000000707/photos/historical.jpg',
    'patients/00000000-0000-4000-8000-000000000701/entries/10000000-0000-4000-8000-000000000707/thumbs/historical.jpg',
    'historical.jpg',
    'image/jpeg',
    1280,
    960,
    300000,
    30000,
    'meal',
    'Historical meal'
  ),
  (
    '30000000-0000-4000-8000-000000000703',
    '10000000-0000-4000-8000-000000000708',
    '00000000-0000-4000-8000-000000000701',
    'patients/00000000-0000-4000-8000-000000000701/entries/10000000-0000-4000-8000-000000000708/photos/cleanup.jpg',
    'patients/00000000-0000-4000-8000-000000000701/entries/10000000-0000-4000-8000-000000000708/thumbs/cleanup.jpg',
    'cleanup.jpg',
    'image/jpeg',
    1280,
    960,
    300000,
    30000,
    'meal',
    'Cleanup meal'
  ),
  (
    '30000000-0000-4000-8000-000000000704',
    '10000000-0000-4000-8000-000000000706',
    '00000000-0000-4000-8000-000000000701',
    'patients/00000000-0000-4000-8000-000000000701/entries/10000000-0000-4000-8000-000000000706/photos/metadata-current.jpg',
    'patients/00000000-0000-4000-8000-000000000701/entries/10000000-0000-4000-8000-000000000706/thumbs/metadata-current.jpg',
    'metadata-current.jpg',
    'image/jpeg',
    1280,
    960,
    300000,
    30000,
    'meal',
    'Metadata current'
  ),
  (
    '30000000-0000-4000-8000-000000000705',
    '10000000-0000-4000-8000-000000000707',
    '00000000-0000-4000-8000-000000000701',
    'patients/00000000-0000-4000-8000-000000000701/entries/10000000-0000-4000-8000-000000000707/photos/metadata-historical.jpg',
    'patients/00000000-0000-4000-8000-000000000701/entries/10000000-0000-4000-8000-000000000707/thumbs/metadata-historical.jpg',
    'metadata-historical.jpg',
    'image/jpeg',
    1280,
    960,
    300000,
    30000,
    'meal',
    'Metadata historical'
  )
on conflict (id) do nothing;

insert into storage.objects (id, bucket_id, name, owner, owner_id, metadata)
values
  (
    '40000000-0000-4000-8000-000000000701',
    'patient-entry-photos',
    'patients/00000000-0000-4000-8000-000000000701/entries/10000000-0000-4000-8000-000000000706/photos/current.jpg',
    '00000000-0000-4000-8000-000000000701',
    '00000000-0000-4000-8000-000000000701',
    '{"mimetype":"image/jpeg","size":300000}'::jsonb
  ),
  (
    '40000000-0000-4000-8000-000000000711',
    'patient-entry-photos',
    'patients/00000000-0000-4000-8000-000000000701/entries/10000000-0000-4000-8000-000000000706/thumbs/current.jpg',
    '00000000-0000-4000-8000-000000000701',
    '00000000-0000-4000-8000-000000000701',
    '{"mimetype":"image/jpeg","size":30000}'::jsonb
  ),
  (
    '40000000-0000-4000-8000-000000000702',
    'patient-entry-photos',
    'patients/00000000-0000-4000-8000-000000000701/entries/10000000-0000-4000-8000-000000000707/photos/historical.jpg',
    '00000000-0000-4000-8000-000000000701',
    '00000000-0000-4000-8000-000000000701',
    '{"mimetype":"image/jpeg","size":300000}'::jsonb
  ),
  (
    '40000000-0000-4000-8000-000000000712',
    'patient-entry-photos',
    'patients/00000000-0000-4000-8000-000000000701/entries/10000000-0000-4000-8000-000000000707/thumbs/historical.jpg',
    '00000000-0000-4000-8000-000000000701',
    '00000000-0000-4000-8000-000000000701',
    '{"mimetype":"image/jpeg","size":30000}'::jsonb
  ),
  (
    '40000000-0000-4000-8000-000000000703',
    'patient-entry-photos',
    'patients/00000000-0000-4000-8000-000000000701/entries/10000000-0000-4000-8000-000000000708/photos/cleanup.jpg',
    '00000000-0000-4000-8000-000000000701',
    '00000000-0000-4000-8000-000000000701',
    '{"mimetype":"image/jpeg","size":300000}'::jsonb
  ),
  (
    '40000000-0000-4000-8000-000000000713',
    'patient-entry-photos',
    'patients/00000000-0000-4000-8000-000000000701/entries/10000000-0000-4000-8000-000000000708/thumbs/cleanup.jpg',
    '00000000-0000-4000-8000-000000000701',
    '00000000-0000-4000-8000-000000000701',
    '{"mimetype":"image/jpeg","size":30000}'::jsonb
  ),
  (
    '40000000-0000-4000-8000-000000000723',
    'patient-entry-photos',
    'patients/00000000-0000-4000-8000-000000000701/entries/10000000-0000-4000-8000-000000000708/photos/not-authorized.jpg',
    '00000000-0000-4000-8000-000000000701',
    '00000000-0000-4000-8000-000000000701',
    '{"mimetype":"image/jpeg","size":300000}'::jsonb
  )
on conflict (id) do nothing;

do $$
begin
  if not has_column_privilege(
    'authenticated', 'public.patient_entries', 'occurred_at', 'UPDATE'
  ) or not has_column_privilege(
    'authenticated', 'public.patient_entries', 'text', 'UPDATE'
  ) then
    raise exception 'authenticated patients need update privilege on mutable entry fields';
  end if;

  if has_column_privilege(
    'authenticated', 'public.patient_entries', 'id', 'UPDATE'
  ) or has_column_privilege(
    'authenticated', 'public.patient_entries', 'patient_id', 'UPDATE'
  ) or has_column_privilege(
    'authenticated', 'public.patient_entries', 'kind', 'UPDATE'
  ) or has_column_privilege(
    'authenticated', 'public.patient_entries', 'client_entry_id', 'UPDATE'
  ) or has_column_privilege(
    'authenticated', 'public.patient_entries', 'created_at', 'UPDATE'
  ) or has_column_privilege(
    'authenticated', 'public.patient_entries', 'updated_at', 'UPDATE'
  ) then
    raise exception 'entry identity and server-managed fields must not be directly updateable';
  end if;

  if has_table_privilege(
    'authenticated',
    'app_private.patient_photo_cleanup_authorizations',
    'SELECT'
  ) or has_table_privilege(
    'authenticated',
    'app_private.patient_photo_cleanup_authorizations',
    'INSERT'
  ) then
    raise exception 'clients must not read or create photo cleanup authorizations';
  end if;

  if has_function_privilege(
    'authenticated',
    'app_private.authorize_current_day_photo_cleanup()',
    'EXECUTE'
  ) then
    raise exception 'clients must not execute the cleanup authorization trigger';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from (
      values
        ('public', 'daily_form_details', 'daily_insert_own', 'INSERT'),
        ('public', 'daily_form_details', 'daily_delete_own', 'DELETE'),
        ('public', 'food_form_details', 'food_form_insert_own', 'INSERT'),
        ('public', 'food_form_details', 'food_form_delete_own', 'DELETE'),
        ('public', 'meal_details', 'meal_insert_own', 'INSERT'),
        ('public', 'meal_details', 'meal_delete_own', 'DELETE'),
        ('public', 'other_fluid_details', 'other_fluids_insert_own', 'INSERT'),
        ('public', 'other_fluid_details', 'other_fluids_delete_own', 'DELETE'),
        ('public', 'symptom_details', 'symptom_insert_own', 'INSERT'),
        ('public', 'symptom_details', 'symptom_delete_own', 'DELETE'),
        ('public', 'stool_details', 'stool_insert_own', 'INSERT'),
        ('public', 'stool_details', 'stool_delete_own', 'DELETE'),
        ('public', 'medication_details', 'medication_insert_own', 'INSERT'),
        ('public', 'medication_details', 'medication_delete_own', 'DELETE'),
        ('public', 'exercise_details', 'exercise_insert_own', 'INSERT'),
        ('public', 'exercise_details', 'exercise_delete_own', 'DELETE'),
        ('public', 'menstruation_events', 'menstruation_insert_own', 'INSERT'),
        ('public', 'menstruation_events', 'menstruation_delete_own', 'DELETE'),
        ('public', 'entry_photos', 'photos_insert_own', 'INSERT'),
        ('storage', 'objects', 'patient_photo_objects_insert_own_entry', 'INSERT')
    ) expected(schemaname, tablename, policyname, cmd)
    left join pg_catalog.pg_policies policy
      on policy.schemaname = expected.schemaname
      and policy.tablename = expected.tablename
      and policy.policyname = expected.policyname
      and policy.cmd = expected.cmd
    where policy.policyname is null
      or position(
        'patient_owns_current_day_entry'
        in coalesce(policy.qual, policy.with_check, '')
      ) = 0
  ) then
    raise exception 'all detail and photo insert/delete policies must enforce the current day';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_policies policy
    where policy.schemaname = 'public'
      and policy.tablename = 'menstruation_events'
      and policy.policyname = 'menstruation_insert_own'
      and policy.with_check like '%baseline.sex%female%'
  ) then
    raise exception 'menstruation inserts must retain the female baseline guard';
  end if;
end $$;

set local role anon;

do $$
declare
  changed_rows integer;
begin
  begin
    update public.patient_entries
    set text = 'Anonymous edit'
    where id = '10000000-0000-4000-8000-000000000701';
    raise exception 'anonymous entry updates must be denied';
  exception when insufficient_privilege then null;
  end;

  delete from storage.objects
  where id = '40000000-0000-4000-8000-000000000703';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'anonymous Storage deletes must be denied';
  end if;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000702';

do $$
declare
  changed_rows integer;
begin
  update public.patient_entries
  set text = 'Other patient edit'
  where id = '10000000-0000-4000-8000-000000000701';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'another patient must not update a current-day entry';
  end if;

  delete from storage.objects
  where id = '40000000-0000-4000-8000-000000000703';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'another patient must not delete a current-day photo object';
  end if;

  delete from public.entry_photos
  where id = '30000000-0000-4000-8000-000000000704';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'another patient must not delete photo metadata';
  end if;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000704';

do $$
declare
  changed_rows integer;
begin
  update public.patient_entries
  set text = 'Unlinked doctor edit'
  where id = '10000000-0000-4000-8000-000000000701';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'an unlinked doctor must not update entries';
  end if;

  delete from storage.objects
  where id = '40000000-0000-4000-8000-000000000703';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'an unlinked doctor must not delete photo objects';
  end if;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000703';

do $$
declare
  changed_rows integer;
begin
  update public.patient_entries
  set text = 'Linked doctor edit'
  where id = '10000000-0000-4000-8000-000000000701';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'a linked doctor must remain read-only';
  end if;

  delete from storage.objects
  where id = '40000000-0000-4000-8000-000000000703';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'a linked doctor must not delete photo objects';
  end if;

  delete from public.entry_photos
  where id = '30000000-0000-4000-8000-000000000704';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'a linked doctor must not delete photo metadata';
  end if;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000701';

do $$
declare
  changed_rows integer;
  saved_entry_id uuid;
  saved_kind public.entry_kind;
  cleanup_metadata_rows integer;
begin
  update public.patient_entries
  set text = 'Current note updated'
  where id = '10000000-0000-4000-8000-000000000701';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'the owner must update a current-day entry';
  end if;

  update public.patient_entries
  set occurred_at = (
    date_trunc('day', now() at time zone 'Europe/Belgrade') + interval '11 hours'
  ) at time zone 'Europe/Belgrade'
  where id = '10000000-0000-4000-8000-000000000701';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'the owner must move a current-day time within the same day';
  end if;

  update public.patient_entries
  set text = 'Historical edit'
  where id = '10000000-0000-4000-8000-000000000702';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'the owner must not update a historical entry';
  end if;

  begin
    update public.patient_entries
    set occurred_at = (
      date_trunc('day', now() at time zone 'Europe/Belgrade') - interval '1 hour'
    ) at time zone 'Europe/Belgrade'
    where id = '10000000-0000-4000-8000-000000000701';
    raise exception 'a current entry must not be moved to a previous day';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.patient_entries
    set kind = 'custom'
    where id = '10000000-0000-4000-8000-000000000701';
    raise exception 'direct clients must not update entry kind';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.patient_entries
    set client_entry_id = 'changed-key'
    where id = '10000000-0000-4000-8000-000000000701';
    raise exception 'direct clients must not update entry idempotency identity';
  exception when insufficient_privilege then null;
  end;

  update public.meal_details
  set name = 'Current meal updated'
  where entry_id = '10000000-0000-4000-8000-000000000706';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'current-day detail updates must remain available';
  end if;

  update public.meal_details
  set name = 'Historical meal updated'
  where entry_id = '10000000-0000-4000-8000-000000000707';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'historical detail updates must be denied';
  end if;

  insert into public.meal_details (entry_id, meal_type, name)
  values ('10000000-0000-4000-8000-000000000709', 'snack', 'Current insert');
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'current-day detail inserts must remain available';
  end if;

  begin
    insert into public.meal_details (entry_id, meal_type, name)
    values ('10000000-0000-4000-8000-000000000710', 'snack', 'Historical insert');
    raise exception 'historical detail inserts must be denied';
  exception when insufficient_privilege then null;
  end;

  delete from public.meal_details
  where entry_id = '10000000-0000-4000-8000-000000000707';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'historical detail deletes must be denied';
  end if;

  delete from public.meal_details
  where entry_id = '10000000-0000-4000-8000-000000000709';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'current-day detail deletes must remain available';
  end if;

  select saved.id, saved.kind
  into saved_entry_id, saved_kind
  from public.save_patient_note(
    '10000000-0000-4000-8000-000000000704',
    (
      date_trunc('day', now() at time zone 'Europe/Belgrade') + interval '10 hours'
    ) at time zone 'Europe/Belgrade',
    'No stool today',
    null
  ) saved;

  if saved_entry_id <> '10000000-0000-4000-8000-000000000704'
    or saved_kind <> 'note'::public.entry_kind then
    raise exception 'current-day stool-to-note conversion must preserve entry identity';
  end if;

  select public.save_patient_stool(
    '10000000-0000-4000-8000-000000000704',
    (
      date_trunc('day', now() at time zone 'Europe/Belgrade') + interval '10 hours'
    ) at time zone 'Europe/Belgrade',
    4,
    'none',
    false,
    false,
    false,
    false,
    false,
    null
  ) into saved_entry_id;

  if saved_entry_id <> '10000000-0000-4000-8000-000000000704' then
    raise exception 'current-day note-to-stool conversion must preserve entry identity';
  end if;

  begin
    perform public.save_patient_note(
      '10000000-0000-4000-8000-000000000705',
      (
        date_trunc('day', now() at time zone 'Europe/Belgrade')
        - interval '1 day'
        + interval '10 hours'
      ) at time zone 'Europe/Belgrade',
      'No stool today',
      null
    );
    raise exception 'historical stool RPC updates must be denied';
  exception when insufficient_privilege then null;
  end;

  if not exists (
    select 1
    from public.stool_details
    where entry_id = '10000000-0000-4000-8000-000000000705'
  ) then
    raise exception 'a denied historical conversion must roll back detail deletion';
  end if;

  insert into public.entry_photos (
    id,
    entry_id,
    patient_id,
    photo_path,
    thumbnail_path,
    mime_type,
    width_px,
    height_px,
    size_bytes,
    thumbnail_size_bytes,
    context_type
  ) values (
    '30000000-0000-4000-8000-000000000706',
    '10000000-0000-4000-8000-000000000706',
    '00000000-0000-4000-8000-000000000701',
    'patients/00000000-0000-4000-8000-000000000701/entries/10000000-0000-4000-8000-000000000706/photos/current-insert.jpg',
    'patients/00000000-0000-4000-8000-000000000701/entries/10000000-0000-4000-8000-000000000706/thumbs/current-insert.jpg',
    'image/jpeg',
    1280,
    960,
    300000,
    30000,
    'meal'
  );
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'current-day photo metadata inserts must remain available';
  end if;

  delete from public.entry_photos
  where id = '30000000-0000-4000-8000-000000000706';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'current-day photo metadata cleanup must remain available';
  end if;

  begin
    insert into public.entry_photos (
      id,
      entry_id,
      patient_id,
      photo_path,
      thumbnail_path,
      mime_type,
      width_px,
      height_px,
      size_bytes,
      thumbnail_size_bytes,
      context_type
    ) values (
      '30000000-0000-4000-8000-000000000707',
      '10000000-0000-4000-8000-000000000707',
      '00000000-0000-4000-8000-000000000701',
      'patients/00000000-0000-4000-8000-000000000701/entries/10000000-0000-4000-8000-000000000707/photos/historical-insert.jpg',
      'patients/00000000-0000-4000-8000-000000000701/entries/10000000-0000-4000-8000-000000000707/thumbs/historical-insert.jpg',
      'image/jpeg',
      1280,
      960,
      300000,
      30000,
      'meal'
    );
    raise exception 'historical photo metadata inserts must be denied';
  exception when insufficient_privilege then null;
  end;

  insert into storage.objects (id, bucket_id, name, owner, owner_id, metadata)
  values (
    '40000000-0000-4000-8000-000000000724',
    'patient-entry-photos',
    'patients/00000000-0000-4000-8000-000000000701/entries/10000000-0000-4000-8000-000000000706/photos/metadata-current.jpg',
    '00000000-0000-4000-8000-000000000701',
    '00000000-0000-4000-8000-000000000701',
    '{"mimetype":"image/jpeg","size":300000}'::jsonb
  );
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'current-day Storage inserts must remain available';
  end if;

  begin
    insert into storage.objects (id, bucket_id, name, owner, owner_id, metadata)
    values (
      '40000000-0000-4000-8000-000000000725',
      'patient-entry-photos',
      'patients/00000000-0000-4000-8000-000000000701/entries/10000000-0000-4000-8000-000000000707/photos/metadata-historical.jpg',
      '00000000-0000-4000-8000-000000000701',
      '00000000-0000-4000-8000-000000000701',
      '{"mimetype":"image/jpeg","size":300000}'::jsonb
    );
    raise exception 'historical Storage inserts must be denied';
  exception when insufficient_privilege then null;
  end;

  delete from storage.objects
  where id = '40000000-0000-4000-8000-000000000724';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'current-day Storage cleanup must remain available';
  end if;

  delete from storage.objects
  where id in (
    '40000000-0000-4000-8000-000000000701',
    '40000000-0000-4000-8000-000000000711'
  );
  get diagnostics changed_rows = row_count;
  if changed_rows <> 2 then
    raise exception 'the owner must delete current-day photo objects';
  end if;

  delete from public.entry_photos
  where id = '30000000-0000-4000-8000-000000000701';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'the owner must delete current-day metadata after both objects';
  end if;

  delete from storage.objects
  where id = '40000000-0000-4000-8000-000000000702';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'the owner must not delete historical photo objects';
  end if;

  delete from public.entry_photos
  where id = '30000000-0000-4000-8000-000000000705';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'the owner must not delete historical metadata even when objects are absent';
  end if;

  delete from public.entry_photos
  where id = '30000000-0000-4000-8000-000000000704';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'current-day metadata cleanup must remain available when objects are absent';
  end if;

  delete from public.patient_entries
  where id = '10000000-0000-4000-8000-000000000707';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'the owner must not delete a historical photo parent';
  end if;

  delete from public.patient_entries
  where id = '10000000-0000-4000-8000-000000000708';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'the owner must delete a current-day photo parent';
  end if;

  select count(*) into cleanup_metadata_rows
  from public.entry_photos
  where id = '30000000-0000-4000-8000-000000000703';
  if cleanup_metadata_rows <> 0 then
    raise exception 'current-day parent deletion must cascade photo metadata';
  end if;

  if app_private.can_delete_patient_photo_object(
    'patient-entry-photos',
    'patients/00000000-0000-4000-8000-000000000701/entries/10000000-0000-4000-8000-000000000708/photos/not-authorized.jpg'
  ) then
    raise exception 'cleanup authorization must be exact-path only';
  end if;

  delete from storage.objects
  where id = '40000000-0000-4000-8000-000000000723';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'a sibling path must not inherit cleanup authorization';
  end if;

  delete from storage.objects
  where id in (
    '40000000-0000-4000-8000-000000000703',
    '40000000-0000-4000-8000-000000000713'
  );
  get diagnostics changed_rows = row_count;
  if changed_rows <> 2 then
    raise exception 'exact paths must remain deletable briefly after current-day parent cascade';
  end if;
end $$;

reset role;

do $$
declare
  longest_authorization interval;
begin
  select max(authorized_until - created_at)
  into longest_authorization
  from app_private.patient_photo_cleanup_authorizations
  where patient_id = '00000000-0000-4000-8000-000000000701';

  if longest_authorization is null
    or longest_authorization > interval '15 minutes' then
    raise exception 'photo cleanup authorization must expire within 15 minutes';
  end if;
end $$;

rollback;
