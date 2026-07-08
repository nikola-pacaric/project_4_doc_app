insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'patient-entry-photos',
  'patient-entry-photos',
  false,
  2097152,
  array['image/jpeg']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.entry_photos
  add column if not exists context_type text
    check (context_type is null or context_type in ('meal', 'fluid', 'medication')),
  add column if not exists context_label text;

alter table public.entry_photos
  add constraint entry_photos_photo_path_shape
  check (
    photo_path = concat('patients/', patient_id::text, '/entries/', entry_id::text, '/photos/', split_part(photo_path, '/', 6))
    and photo_path like 'patients/%/entries/%/photos/%.jpg'
    and split_part(photo_path, '/', 7) = ''
  ) not valid;

alter table public.entry_photos
  add constraint entry_photos_thumbnail_path_shape
  check (
    thumbnail_path = concat('patients/', patient_id::text, '/entries/', entry_id::text, '/thumbs/', split_part(thumbnail_path, '/', 6))
    and thumbnail_path like 'patients/%/entries/%/thumbs/%.jpg'
    and split_part(thumbnail_path, '/', 7) = ''
  ) not valid;

alter table public.entry_photos
  validate constraint entry_photos_photo_path_shape;

alter table public.entry_photos
  validate constraint entry_photos_thumbnail_path_shape;

alter policy "photos_insert_own"
  on public.entry_photos
  with check (
    patient_id = (select auth.uid())
    and app_private.patient_owns_entry(entry_id)
    and photo_path = concat('patients/', patient_id::text, '/entries/', entry_id::text, '/photos/', split_part(photo_path, '/', 6))
    and thumbnail_path = concat('patients/', patient_id::text, '/entries/', entry_id::text, '/thumbs/', split_part(thumbnail_path, '/', 6))
    and photo_path like 'patients/%/entries/%/photos/%.jpg'
    and thumbnail_path like 'patients/%/entries/%/thumbs/%.jpg'
    and split_part(photo_path, '/', 7) = ''
    and split_part(thumbnail_path, '/', 7) = ''
    and photo_path not like '%base64%'
    and thumbnail_path not like '%base64%'
  );

create or replace function app_private.try_uuid(value text)
returns uuid
language plpgsql
immutable
security invoker
set search_path = public
as $$
begin
  return value::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

drop policy if exists "patient_photo_objects_select_visible_metadata" on storage.objects;
create policy "patient_photo_objects_select_visible_metadata"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'patient-entry-photos'
    and exists (
      select 1
      from public.entry_photos photo
      where photo.photo_path = storage.objects.name
        or photo.thumbnail_path = storage.objects.name
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
    and app_private.patient_owns_entry(app_private.try_uuid(split_part(name, '/', 4)))
  );

drop policy if exists "patient_photo_objects_delete_own_metadata" on storage.objects;
create policy "patient_photo_objects_delete_own_metadata"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'patient-entry-photos'
    and exists (
      select 1
      from public.entry_photos photo
      where photo.patient_id = (select auth.uid())
        and (
          photo.photo_path = storage.objects.name
          or photo.thumbnail_path = storage.objects.name
        )
    )
  );
