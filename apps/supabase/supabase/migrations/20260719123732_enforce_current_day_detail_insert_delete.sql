begin;

-- The July 17 hardening closed historical updates but left direct INSERT and
-- DELETE policies on detail rows using the older ownership-only helper. Keep
-- every structured mutation on the same Europe/Belgrade calendar-day boundary.
alter policy "daily_insert_own"
  on public.daily_form_details
  with check (app_private.patient_owns_current_day_entry(entry_id));

alter policy "daily_delete_own"
  on public.daily_form_details
  using (app_private.patient_owns_current_day_entry(entry_id));

alter policy "food_form_insert_own"
  on public.food_form_details
  with check (app_private.patient_owns_current_day_entry(entry_id));

alter policy "food_form_delete_own"
  on public.food_form_details
  using (app_private.patient_owns_current_day_entry(entry_id));

alter policy "meal_insert_own"
  on public.meal_details
  with check (app_private.patient_owns_current_day_entry(entry_id));

alter policy "meal_delete_own"
  on public.meal_details
  using (app_private.patient_owns_current_day_entry(entry_id));

alter policy "symptom_insert_own"
  on public.symptom_details
  with check (app_private.patient_owns_current_day_entry(entry_id));

alter policy "symptom_delete_own"
  on public.symptom_details
  using (app_private.patient_owns_current_day_entry(entry_id));

alter policy "stool_insert_own"
  on public.stool_details
  with check (app_private.patient_owns_current_day_entry(entry_id));

alter policy "stool_delete_own"
  on public.stool_details
  using (app_private.patient_owns_current_day_entry(entry_id));

alter policy "medication_insert_own"
  on public.medication_details
  with check (app_private.patient_owns_current_day_entry(entry_id));

alter policy "medication_delete_own"
  on public.medication_details
  using (app_private.patient_owns_current_day_entry(entry_id));

alter policy "exercise_insert_own"
  on public.exercise_details
  with check (app_private.patient_owns_current_day_entry(entry_id));

alter policy "exercise_delete_own"
  on public.exercise_details
  using (app_private.patient_owns_current_day_entry(entry_id));

alter policy "menstruation_insert_own"
  on public.menstruation_events
  with check (
    app_private.patient_owns_current_day_entry(entry_id)
    and exists (
      select 1
      from public.patient_entries entry
      join public.patient_baseline_profiles baseline
        on baseline.patient_id = entry.patient_id
      where entry.id = entry_id
        and baseline.sex = 'female'
    )
  );

alter policy "menstruation_delete_own"
  on public.menstruation_events
  using (app_private.patient_owns_current_day_entry(entry_id));

alter policy "other_fluids_insert_own"
  on public.other_fluid_details
  with check (
    app_private.patient_owns_current_day_entry(daily_entry_id)
    and (
      entry_id is null
      or app_private.patient_owns_current_day_entry(entry_id)
    )
  );

alter policy "other_fluids_delete_own"
  on public.other_fluid_details
  using (
    app_private.patient_owns_current_day_entry(daily_entry_id)
    and (
      entry_id is null
      or app_private.patient_owns_current_day_entry(entry_id)
    )
  );

-- Photo metadata is inserted before Storage objects. Require both layers to
-- reference an owned current-day entry so missing historical objects cannot be
-- recreated through the Storage API.
alter policy "photos_insert_own"
  on public.entry_photos
  with check (
    patient_id = (select auth.uid())
    and app_private.patient_owns_current_day_entry(entry_id)
    and photo_path = concat(
      'patients/', patient_id::text, '/entries/', entry_id::text,
      '/photos/', split_part(photo_path, '/', 6)
    )
    and thumbnail_path = concat(
      'patients/', patient_id::text, '/entries/', entry_id::text,
      '/thumbs/', split_part(thumbnail_path, '/', 6)
    )
    and photo_path like 'patients/%/entries/%/photos/%.jpg'
    and thumbnail_path like 'patients/%/entries/%/thumbs/%.jpg'
    and split_part(photo_path, '/', 7) = ''
    and split_part(thumbnail_path, '/', 7) = ''
    and photo_path not like '%base64%'
    and thumbnail_path not like '%base64%'
  );

alter policy "patient_photo_objects_insert_own_entry"
  on storage.objects
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
        and photo.entry_id = app_private.try_uuid(
          split_part(storage.objects.name, '/', 4)
        )
        and app_private.patient_owns_current_day_entry(photo.entry_id)
        and (
          photo.photo_path = storage.objects.name
          or photo.thumbnail_path = storage.objects.name
        )
    )
  );

commit;
