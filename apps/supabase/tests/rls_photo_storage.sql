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
  ('00000000-0000-4000-8000-000000000041', 'authenticated', 'authenticated', 'photo_patient_a@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000042', 'authenticated', 'authenticated', 'photo_patient_b@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000043', 'authenticated', 'authenticated', 'photo_doctor@example.test', 'test', now(), '{"app_role":"doctor"}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.user_profiles (id, role, display_name)
values
  ('00000000-0000-4000-8000-000000000041', 'patient', 'Photo Patient A'),
  ('00000000-0000-4000-8000-000000000042', 'patient', 'Photo Patient B'),
  ('00000000-0000-4000-8000-000000000043', 'doctor', 'Photo Doctor')
on conflict (id) do nothing;

insert into public.patient_entries (id, patient_id, kind, occurred_at, text)
values
  ('10000000-0000-4000-8000-000000000041', '00000000-0000-4000-8000-000000000041', 'meal', now(), 'Patient A meal photo entry'),
  ('10000000-0000-4000-8000-000000000141', '00000000-0000-4000-8000-000000000041', 'fluid', now(), 'Patient A fluid photo entry'),
  ('10000000-0000-4000-8000-000000000241', '00000000-0000-4000-8000-000000000041', 'medication', now(), 'Patient A medication photo entry'),
  ('10000000-0000-4000-8000-000000000341', '00000000-0000-4000-8000-000000000041', 'note', now(), 'Patient A note entry'),
  ('10000000-0000-4000-8000-000000000042', '00000000-0000-4000-8000-000000000042', 'meal', now(), 'Patient B meal photo entry')
on conflict (id) do nothing;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000041';

do $$
declare
  visible_photos integer;
begin
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
  values (
    '30000000-0000-4000-8000-000000000041',
    '10000000-0000-4000-8000-000000000041',
    '00000000-0000-4000-8000-000000000041',
    'patients/00000000-0000-4000-8000-000000000041/entries/10000000-0000-4000-8000-000000000041/photos/photo-a.jpg',
    'patients/00000000-0000-4000-8000-000000000041/entries/10000000-0000-4000-8000-000000000041/thumbs/photo-a.jpg',
    'photo-a.jpg',
    'image/jpeg',
    1280,
    960,
    320000,
    32000,
    'meal',
    'Breakfast oatmeal'
  );

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
  values (
    '30000000-0000-4000-8000-000000000141',
    '10000000-0000-4000-8000-000000000141',
    '00000000-0000-4000-8000-000000000041',
    'patients/00000000-0000-4000-8000-000000000041/entries/10000000-0000-4000-8000-000000000141/photos/fluid-a.jpg',
    'patients/00000000-0000-4000-8000-000000000041/entries/10000000-0000-4000-8000-000000000141/thumbs/fluid-a.jpg',
    'fluid-a.jpg',
    'image/jpeg',
    1280,
    960,
    310000,
    31000,
    'fluid',
    'Tea'
  );

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
  values (
    '30000000-0000-4000-8000-000000000241',
    '10000000-0000-4000-8000-000000000241',
    '00000000-0000-4000-8000-000000000041',
    'patients/00000000-0000-4000-8000-000000000041/entries/10000000-0000-4000-8000-000000000241/photos/medication-a.jpg',
    'patients/00000000-0000-4000-8000-000000000041/entries/10000000-0000-4000-8000-000000000241/thumbs/medication-a.jpg',
    'medication-a.jpg',
    'image/jpeg',
    1280,
    960,
    300000,
    30000,
    'medication',
    'Morning medication'
  );

  select count(*) into visible_photos from public.entry_photos;
  if visible_photos <> 3 then
    raise exception 'patient A should see exactly 3 own photos, saw %', visible_photos;
  end if;

  begin
    truncate table public.entry_photos;
    raise exception 'authenticated users should not be able to truncate photo metadata';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.entry_photos (
      entry_id,
      patient_id,
      photo_path,
      thumbnail_path,
      mime_type,
      width_px,
      height_px,
      context_type
    )
    values (
      '10000000-0000-4000-8000-000000000042',
      '00000000-0000-4000-8000-000000000042',
      'patients/00000000-0000-4000-8000-000000000042/entries/10000000-0000-4000-8000-000000000042/photos/photo-b.jpg',
      'patients/00000000-0000-4000-8000-000000000042/entries/10000000-0000-4000-8000-000000000042/thumbs/photo-b.jpg',
      'image/jpeg',
      1280,
      960,
      'meal'
    );
    raise exception 'patient A should not insert photo metadata for patient B';
  exception
    when insufficient_privilege or check_violation or invalid_text_representation or with_check_option_violation then null;
  end;

  begin
    insert into public.entry_photos (
      entry_id,
      patient_id,
      photo_path,
      thumbnail_path,
      mime_type,
      width_px,
      height_px,
      context_type
    )
    values (
      '10000000-0000-4000-8000-000000000041',
      '00000000-0000-4000-8000-000000000042',
      'patients/00000000-0000-4000-8000-000000000042/entries/10000000-0000-4000-8000-000000000041/photos/patient-mismatch.jpg',
      'patients/00000000-0000-4000-8000-000000000042/entries/10000000-0000-4000-8000-000000000041/thumbs/patient-mismatch.jpg',
      'image/jpeg',
      1280,
      960,
      'meal'
    );
    raise exception 'photo metadata patient_id must match the referenced entry owner';
  exception
    when insufficient_privilege or check_violation or invalid_text_representation or with_check_option_violation then null;
  end;

  begin
    insert into public.entry_photos (
      entry_id,
      patient_id,
      photo_path,
      thumbnail_path,
      mime_type,
      width_px,
      height_px,
      context_type
    )
    values (
      '10000000-0000-4000-8000-000000000241',
      '00000000-0000-4000-8000-000000000041',
      'patients/00000000-0000-4000-8000-000000000041/entries/10000000-0000-4000-8000-000000000241/photos/meal-on-medication.jpg',
      'patients/00000000-0000-4000-8000-000000000041/entries/10000000-0000-4000-8000-000000000241/thumbs/meal-on-medication.jpg',
      'image/jpeg',
      1280,
      960,
      'meal'
    );
    raise exception 'meal photo context must not be accepted for a medication entry';
  exception
    when insufficient_privilege or check_violation or invalid_text_representation or with_check_option_violation then null;
  end;

  begin
    insert into public.entry_photos (
      entry_id,
      patient_id,
      photo_path,
      thumbnail_path,
      mime_type,
      width_px,
      height_px,
      context_type
    )
    values (
      '10000000-0000-4000-8000-000000000041',
      '00000000-0000-4000-8000-000000000041',
      'patients/00000000-0000-4000-8000-000000000041/entries/10000000-0000-4000-8000-000000000041/photos/fluid-on-meal.jpg',
      'patients/00000000-0000-4000-8000-000000000041/entries/10000000-0000-4000-8000-000000000041/thumbs/fluid-on-meal.jpg',
      'image/jpeg',
      1280,
      960,
      'fluid'
    );
    raise exception 'fluid photo context must not be accepted for a meal entry';
  exception
    when insufficient_privilege or check_violation or invalid_text_representation or with_check_option_violation then null;
  end;

  begin
    insert into public.entry_photos (
      entry_id,
      patient_id,
      photo_path,
      thumbnail_path,
      mime_type,
      width_px,
      height_px,
      context_type
    )
    values (
      '10000000-0000-4000-8000-000000000141',
      '00000000-0000-4000-8000-000000000041',
      'patients/00000000-0000-4000-8000-000000000041/entries/10000000-0000-4000-8000-000000000141/photos/medication-on-fluid.jpg',
      'patients/00000000-0000-4000-8000-000000000041/entries/10000000-0000-4000-8000-000000000141/thumbs/medication-on-fluid.jpg',
      'image/jpeg',
      1280,
      960,
      'medication'
    );
    raise exception 'medication photo context must not be accepted for a fluid entry';
  exception
    when insufficient_privilege or check_violation or invalid_text_representation or with_check_option_violation then null;
  end;

  begin
    insert into public.entry_photos (
      entry_id,
      patient_id,
      photo_path,
      thumbnail_path,
      mime_type,
      width_px,
      height_px,
      context_type
    )
    values (
      '10000000-0000-4000-8000-000000000341',
      '00000000-0000-4000-8000-000000000041',
      'patients/00000000-0000-4000-8000-000000000041/entries/10000000-0000-4000-8000-000000000341/photos/meal-on-note.jpg',
      'patients/00000000-0000-4000-8000-000000000041/entries/10000000-0000-4000-8000-000000000341/thumbs/meal-on-note.jpg',
      'image/jpeg',
      1280,
      960,
      'meal'
    );
    raise exception 'photo contexts must not be accepted for note entries';
  exception
    when insufficient_privilege or check_violation or invalid_text_representation or with_check_option_violation then null;
  end;

  begin
    insert into public.entry_photos (
      entry_id,
      patient_id,
      photo_path,
      thumbnail_path,
      mime_type,
      width_px,
      height_px,
      context_type
    )
    values (
      '10000000-0000-4000-8000-000000000041',
      '00000000-0000-4000-8000-000000000041',
      'patients/00000000-0000-4000-8000-000000000041/entries/10000000-0000-4000-8000-000000000041/photos/base64.jpg',
      'patients/00000000-0000-4000-8000-000000000041/entries/10000000-0000-4000-8000-000000000041/thumbs/base64.jpg',
      'image/jpeg',
      1280,
      960,
      'meal'
    );
    raise exception 'photo metadata must reject base64 path markers';
  exception
    when insufficient_privilege or check_violation or invalid_text_representation or with_check_option_violation then null;
  end;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000043';

do $$
declare
  visible_photos integer;
begin
  select count(*) into visible_photos from public.entry_photos;
  if visible_photos <> 0 then
    raise exception 'unlinked doctor should not see patient photos, saw %', visible_photos;
  end if;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000041';

do $$
declare
  visible_objects integer;
begin
  insert into storage.objects (id, bucket_id, name, owner, owner_id, metadata)
  values (
    '40000000-0000-4000-8000-000000000041',
    'patient-entry-photos',
    'patients/00000000-0000-4000-8000-000000000041/entries/10000000-0000-4000-8000-000000000041/photos/photo-a.jpg',
    '00000000-0000-4000-8000-000000000041',
    '00000000-0000-4000-8000-000000000041',
    '{"mimetype":"image/jpeg","size":320000}'::jsonb
  );

  select count(*) into visible_objects
  from storage.objects
  where bucket_id = 'patient-entry-photos';
  if visible_objects <> 1 then
    raise exception 'patient A should select own photo object once metadata exists, saw %', visible_objects;
  end if;

  begin
    insert into storage.objects (id, bucket_id, name, owner, owner_id, metadata)
    values (
      '40000000-0000-4000-8000-000000000042',
      'patient-entry-photos',
      'patients/00000000-0000-4000-8000-000000000042/entries/10000000-0000-4000-8000-000000000042/photos/photo-b.jpg',
      '00000000-0000-4000-8000-000000000041',
      '00000000-0000-4000-8000-000000000041',
      '{"mimetype":"image/jpeg","size":320000}'::jsonb
    );
    raise exception 'patient A should not insert photo objects under patient B path';
  exception
    when insufficient_privilege or check_violation or with_check_option_violation then null;
  end;

  begin
    insert into storage.objects (id, bucket_id, name, owner, owner_id, metadata)
    values (
      '40000000-0000-4000-8000-000000000043',
      'patient-entry-photos',
      'patients/00000000-0000-4000-8000-000000000041/entries/not-a-uuid/photos/photo-bad.jpg',
      '00000000-0000-4000-8000-000000000041',
      '00000000-0000-4000-8000-000000000041',
      '{"mimetype":"image/jpeg","size":320000}'::jsonb
    );
    raise exception 'malformed photo object paths should be denied cleanly';
  exception
    when insufficient_privilege or check_violation or with_check_option_violation then null;
  end;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000042';

do $$
declare
  visible_objects integer;
begin
  select count(*) into visible_objects
  from storage.objects
  where bucket_id = 'patient-entry-photos';
  if visible_objects <> 0 then
    raise exception 'patient B should not select patient A photo objects, saw %', visible_objects;
  end if;
end $$;

reset role;

insert into public.doctor_patient_access (doctor_id, patient_id)
values ('00000000-0000-4000-8000-000000000043', '00000000-0000-4000-8000-000000000041')
on conflict (doctor_id, patient_id)
where active = true and revoked_at is null
do nothing;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000043';

do $$
declare
  visible_photos integer;
  visible_objects integer;
  changed_rows integer;
begin
  select count(*) into visible_photos from public.entry_photos;
  if visible_photos <> 3 then
    raise exception 'linked doctor should see linked patient photo metadata, saw %', visible_photos;
  end if;

  update public.entry_photos
  set original_filename = 'doctor-edit.jpg'
  where id = '30000000-0000-4000-8000-000000000041';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'linked doctor should not update photo metadata';
  end if;

  select count(*) into visible_objects
  from storage.objects
  where bucket_id = 'patient-entry-photos';
  if visible_objects <> 1 then
    raise exception 'linked doctor should select linked patient photo objects, saw %', visible_objects;
  end if;
end $$;

reset role;

rollback;
