begin;

create index if not exists entry_photos_photo_path_idx
  on public.entry_photos (photo_path);

create index if not exists entry_photos_thumbnail_path_idx
  on public.entry_photos (thumbnail_path);

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

-- Entry deletion cascades photo metadata before the Storage API removes the
-- underlying objects. Give only the authenticated owner enough visibility to
-- clean objects whose parent entry no longer exists; existing-entry photo
-- visibility stays intact for owners and linked doctors.
drop policy if exists "patient_photo_objects_select_visible_metadata" on storage.objects;
create policy "patient_photo_objects_select_visible_metadata"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'patient-entry-photos'
    and (
      exists (
        select 1
        from public.entry_photos photo
        where photo.photo_path = storage.objects.name
          or photo.thumbnail_path = storage.objects.name
      )
      or (
        split_part(name, '/', 1) = 'patients'
        and split_part(name, '/', 2) = (select auth.uid())::text
        and split_part(name, '/', 3) = 'entries'
        and split_part(name, '/', 5) in ('photos', 'thumbs')
        and name like 'patients/%/entries/%/%.jpg'
        and split_part(name, '/', 7) = ''
        and not exists (
          select 1
          from public.patient_entries entry
          where entry.id = app_private.try_uuid(split_part(storage.objects.name, '/', 4))
        )
      )
    )
  );

drop policy if exists "patient_photo_objects_delete_own_metadata" on storage.objects;
create policy "patient_photo_objects_delete_own_metadata"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'patient-entry-photos'
    and (
      exists (
        select 1
        from public.entry_photos photo
        join public.patient_entries entry on entry.id = photo.entry_id
        where photo.patient_id = (select auth.uid())
          and entry.occurred_at >= (
            date_trunc('day', now() at time zone 'Europe/Belgrade')
            at time zone 'Europe/Belgrade'
          )
          and entry.occurred_at < (
            (date_trunc('day', now() at time zone 'Europe/Belgrade') + interval '1 day')
            at time zone 'Europe/Belgrade'
          )
          and (
            photo.photo_path = storage.objects.name
            or photo.thumbnail_path = storage.objects.name
          )
      )
      or (
        split_part(name, '/', 1) = 'patients'
        and split_part(name, '/', 2) = (select auth.uid())::text
        and split_part(name, '/', 3) = 'entries'
        and split_part(name, '/', 5) in ('photos', 'thumbs')
        and name like 'patients/%/entries/%/%.jpg'
        and split_part(name, '/', 7) = ''
        and not exists (
          select 1
          from public.patient_entries entry
          where entry.id = app_private.try_uuid(split_part(storage.objects.name, '/', 4))
        )
      )
    )
  );

commit;
