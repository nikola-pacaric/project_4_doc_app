begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, created_at, updated_at
)
values
  ('00000000-0000-4000-8000-000000000801', 'authenticated', 'authenticated', 'photo_outbox_a@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000802', 'authenticated', 'authenticated', 'photo_outbox_b@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000803', 'authenticated', 'authenticated', 'photo_outbox_doctor@example.test', 'test', now(), '{"app_role":"doctor"}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.user_profiles (id, role, display_name)
values
  ('00000000-0000-4000-8000-000000000801', 'patient', 'Photo Outbox A'),
  ('00000000-0000-4000-8000-000000000802', 'patient', 'Photo Outbox B'),
  ('00000000-0000-4000-8000-000000000803', 'doctor', 'Photo Outbox Doctor')
on conflict (id) do nothing;

insert into public.patient_entries (id, patient_id, kind, occurred_at)
values
  (
    '10000000-0000-4000-8000-000000000801',
    '00000000-0000-4000-8000-000000000801',
    'meal',
    (date_trunc('day', now() at time zone 'Europe/Belgrade') + interval '10 hours')
      at time zone 'Europe/Belgrade'
  ),
  (
    '10000000-0000-4000-8000-000000000811',
    '00000000-0000-4000-8000-000000000801',
    'meal',
    (date_trunc('day', now() at time zone 'Europe/Belgrade') + interval '12 hours')
      at time zone 'Europe/Belgrade'
  ),
  (
    '10000000-0000-4000-8000-000000000802',
    '00000000-0000-4000-8000-000000000802',
    'meal',
    (date_trunc('day', now() at time zone 'Europe/Belgrade') + interval '11 hours')
      at time zone 'Europe/Belgrade'
  )
on conflict (id) do nothing;

insert into public.meal_details (entry_id, meal_type, name)
values
  ('10000000-0000-4000-8000-000000000801', 'breakfast', 'Retained meal'),
  ('10000000-0000-4000-8000-000000000811', 'lunch', 'Cascade meal'),
  ('10000000-0000-4000-8000-000000000802', 'lunch', 'Other patient meal')
on conflict (entry_id) do nothing;

insert into public.entry_photos (
  id, entry_id, patient_id, photo_path, thumbnail_path, mime_type, context_type
)
values
  (
    '30000000-0000-4000-8000-000000000801',
    '10000000-0000-4000-8000-000000000801',
    '00000000-0000-4000-8000-000000000801',
    'patients/00000000-0000-4000-8000-000000000801/entries/10000000-0000-4000-8000-000000000801/photos/retained.jpg',
    'patients/00000000-0000-4000-8000-000000000801/entries/10000000-0000-4000-8000-000000000801/thumbs/retained.jpg',
    'image/jpeg',
    'meal'
  ),
  (
    '30000000-0000-4000-8000-000000000811',
    '10000000-0000-4000-8000-000000000811',
    '00000000-0000-4000-8000-000000000801',
    'patients/00000000-0000-4000-8000-000000000801/entries/10000000-0000-4000-8000-000000000811/photos/cascade.jpg',
    'patients/00000000-0000-4000-8000-000000000801/entries/10000000-0000-4000-8000-000000000811/thumbs/cascade.jpg',
    'image/jpeg',
    'meal'
  ),
  (
    '30000000-0000-4000-8000-000000000821',
    '10000000-0000-4000-8000-000000000801',
    '00000000-0000-4000-8000-000000000801',
    'patients/00000000-0000-4000-8000-000000000801/entries/10000000-0000-4000-8000-000000000801/photos/blocked.jpg',
    'patients/00000000-0000-4000-8000-000000000801/entries/10000000-0000-4000-8000-000000000801/thumbs/blocked.jpg',
    'image/jpeg',
    'meal'
  ),
  (
    '30000000-0000-4000-8000-000000000802',
    '10000000-0000-4000-8000-000000000802',
    '00000000-0000-4000-8000-000000000802',
    'patients/00000000-0000-4000-8000-000000000802/entries/10000000-0000-4000-8000-000000000802/photos/other.jpg',
    'patients/00000000-0000-4000-8000-000000000802/entries/10000000-0000-4000-8000-000000000802/thumbs/other.jpg',
    'image/jpeg',
    'meal'
  )
on conflict (id) do nothing;

-- One remaining object is enough to prove completion does not acknowledge a
-- partially removed photo. The transaction rollback removes this fixture.
insert into storage.objects (id, bucket_id, name, owner, owner_id, metadata)
values (
  '40000000-0000-4000-8000-000000000821',
  'patient-entry-photos',
  'patients/00000000-0000-4000-8000-000000000801/entries/10000000-0000-4000-8000-000000000801/thumbs/blocked.jpg',
  '00000000-0000-4000-8000-000000000801',
  '00000000-0000-4000-8000-000000000801',
  '{"mimetype":"image/jpeg"}'::jsonb
)
on conflict (id) do nothing;

do $$
begin
  if has_table_privilege(
    'authenticated',
    'app_private.patient_photo_cleanup_jobs',
    'SELECT'
  ) then
    raise exception 'authenticated must not read the private cleanup table';
  end if;

  if has_function_privilege(
    'anon',
    'public.list_pending_patient_photo_cleanups()',
    'EXECUTE'
  ) then
    raise exception 'anon must not list photo cleanup jobs';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.save_patient_food_form_with_photo_cleanup(timestamptz,timestamptz,timestamptz,numeric,boolean,text,jsonb,uuid[])',
    'EXECUTE'
  ) then
    raise exception 'authenticated patients need atomic food/photo save access';
  end if;
end $$;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000801';

do $$
declare
  v_day_start timestamptz :=
    date_trunc('day', now() at time zone 'Europe/Belgrade') at time zone 'Europe/Belgrade';
  v_day_end timestamptz := v_day_start + interval '1 day';
  v_job_id uuid;
begin
  perform public.save_patient_food_form_with_photo_cleanup(
    v_day_start,
    v_day_end,
    v_day_start + interval '9 hours',
    1.5,
    false,
    null,
    jsonb_build_array(
      jsonb_build_object(
        'entry_id', '10000000-0000-4000-8000-000000000801',
        'meal_type', 'breakfast',
        'name', 'Retained meal',
        'description', null,
        'occurred_at', v_day_start + interval '10 hours'
      ),
      jsonb_build_object(
        'entry_id', '10000000-0000-4000-8000-000000000811',
        'meal_type', 'lunch',
        'name', 'Cascade meal',
        'description', null,
        'occurred_at', v_day_start + interval '12 hours'
      )
    ),
    array['30000000-0000-4000-8000-000000000801'::uuid]
  );

  select job_id into v_job_id
  from public.list_pending_patient_photo_cleanups()
  where photo_id = '30000000-0000-4000-8000-000000000801';

  if v_job_id is null then
    raise exception 'retained photo removal must create a durable job';
  end if;

  perform public.complete_patient_photo_cleanups(array[v_job_id]);

  if exists (
    select 1 from public.entry_photos
    where id = '30000000-0000-4000-8000-000000000801'
  ) then
    raise exception 'completion must remove retained photo metadata';
  end if;

  begin
    perform public.save_patient_food_form_with_photo_cleanup(
      v_day_start,
      v_day_end,
      v_day_start + interval '9 hours',
      9.0,
      false,
      null,
      '[]'::jsonb,
      array['30000000-0000-4000-8000-000000000802'::uuid]
    );
    raise exception 'cross-patient photo cleanup must fail';
  exception when insufficient_privilege then null;
  end;

  if exists (
    select 1
    from public.food_form_details food
    join public.patient_entries entry on entry.id = food.entry_id
    where entry.patient_id = '00000000-0000-4000-8000-000000000801'
      and food.water_liters = 9.0
  ) then
    raise exception 'rejected cleanup must roll back food mutations';
  end if;
end $$;

delete from public.patient_entries
where id = '10000000-0000-4000-8000-000000000811';

do $$
declare
  v_job_id uuid;
begin
  select job_id into v_job_id
  from public.list_pending_patient_photo_cleanups()
  where photo_id = '30000000-0000-4000-8000-000000000811';

  if v_job_id is null then
    raise exception 'entry cascade must create a durable cleanup job';
  end if;

  perform public.complete_patient_photo_cleanups(array[v_job_id]);
end $$;

do $$
declare
  v_day_start timestamptz :=
    date_trunc('day', now() at time zone 'Europe/Belgrade') at time zone 'Europe/Belgrade';
  v_day_end timestamptz := v_day_start + interval '1 day';
  v_job_id uuid;
begin
  perform public.save_patient_food_form_with_photo_cleanup(
    v_day_start,
    v_day_end,
    v_day_start + interval '9 hours',
    1.75,
    false,
    null,
    jsonb_build_array(
      jsonb_build_object(
        'entry_id', '10000000-0000-4000-8000-000000000801',
        'meal_type', 'breakfast',
        'name', 'Retained meal',
        'description', null,
        'occurred_at', v_day_start + interval '10 hours'
      )
    ),
    array['30000000-0000-4000-8000-000000000821'::uuid]
  );

  select job_id into v_job_id
  from public.list_pending_patient_photo_cleanups()
  where photo_id = '30000000-0000-4000-8000-000000000821';

  begin
    perform public.complete_patient_photo_cleanups(array[v_job_id]);
    raise exception 'completion must fail while either Storage object exists';
  exception when object_not_in_prerequisite_state then null;
  end;

  if not exists (
    select 1 from public.list_pending_patient_photo_cleanups()
    where photo_id = '30000000-0000-4000-8000-000000000821'
  ) then
    raise exception 'blocked completion must retain the durable job';
  end if;

  if not exists (
    select 1 from public.entry_photos
    where id = '30000000-0000-4000-8000-000000000821'
  ) then
    raise exception 'blocked completion must retain photo metadata';
  end if;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000803';

do $$
begin
  begin
    perform public.list_pending_patient_photo_cleanups();
    raise exception 'doctors must not list patient photo cleanup jobs';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

rollback;
