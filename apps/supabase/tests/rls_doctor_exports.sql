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
  ('00000000-0000-4000-8000-000000000081', 'authenticated', 'authenticated', 'export_patient_a@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000082', 'authenticated', 'authenticated', 'export_patient_b@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000083', 'authenticated', 'authenticated', 'export_doctor_a@example.test', 'test', now(), '{"app_role":"doctor"}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000084', 'authenticated', 'authenticated', 'export_doctor_b@example.test', 'test', now(), '{"app_role":"doctor"}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.user_profiles (id, role, display_name)
values
  ('00000000-0000-4000-8000-000000000081', 'patient', 'Export Patient A'),
  ('00000000-0000-4000-8000-000000000082', 'patient', 'Export Patient B'),
  ('00000000-0000-4000-8000-000000000083', 'doctor', 'Export Doctor A'),
  ('00000000-0000-4000-8000-000000000084', 'doctor', 'Export Doctor B')
on conflict (id) do nothing;

insert into public.doctor_patient_access (
  id,
  doctor_id,
  patient_id,
  active,
  revoked_at
)
values (
  '10000000-0000-4000-8000-000000000081',
  '00000000-0000-4000-8000-000000000083',
  '00000000-0000-4000-8000-000000000081',
  true,
  null
);

insert into public.patient_baseline_profiles (
  patient_id,
  sex,
  birth_year,
  occupation,
  weight_kg,
  height_cm,
  recent_major_weight_change,
  weight_reminder_due_at
)
values (
  '00000000-0000-4000-8000-000000000081',
  'female',
  1985,
  'Teacher',
  70.50,
  168.00,
  'No',
  now() + interval '3 months'
);

insert into public.patient_entries (
  id,
  patient_id,
  kind,
  occurred_at,
  text,
  client_entry_id
)
values
  ('20000000-0000-4000-8000-000000000081', '00000000-0000-4000-8000-000000000081', 'note', '2026-07-08 10:00:00+00', 'Doctor export note', 'export-note-a'),
  ('20000000-0000-4000-8000-000000000082', '00000000-0000-4000-8000-000000000081', 'medication', '2026-07-08 12:00:00+00', null, 'export-med-a'),
  ('20000000-0000-4000-8000-000000000083', '00000000-0000-4000-8000-000000000081', 'note', '2026-07-01 09:00:00+00', 'Earlier month note', 'export-note-month-a'),
  ('20000000-0000-4000-8000-000000000084', '00000000-0000-4000-8000-000000000082', 'note', '2026-07-08 11:00:00+00', 'Other patient note', 'export-note-b'),
  ('20000000-0000-4000-8000-000000000085', '00000000-0000-4000-8000-000000000081', 'note', '2026-07-07 21:59:59+00', 'Before Serbia-local day', 'export-before-day'),
  ('20000000-0000-4000-8000-000000000086', '00000000-0000-4000-8000-000000000081', 'note', '2026-07-07 22:00:00+00', 'Start of Serbia-local day', 'export-day-start'),
  ('20000000-0000-4000-8000-000000000087', '00000000-0000-4000-8000-000000000081', 'note', '2026-07-08 22:00:00+00', 'After Serbia-local day', 'export-day-end');

insert into public.medication_details (
  entry_id,
  name,
  dose,
  notes,
  is_chronic_therapy
)
values (
  '20000000-0000-4000-8000-000000000082',
  'Test medicine',
  '10 mg',
  'Package photo attached',
  false
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
  '30000000-0000-4000-8000-000000000081',
  '20000000-0000-4000-8000-000000000082',
  '00000000-0000-4000-8000-000000000081',
  'patients/00000000-0000-4000-8000-000000000081/entries/20000000-0000-4000-8000-000000000082/photos/30000000-0000-4000-8000-000000000081.jpg',
  'patients/00000000-0000-4000-8000-000000000081/entries/20000000-0000-4000-8000-000000000082/thumbs/30000000-0000-4000-8000-000000000081.jpg',
  'medicine.jpg',
  'image/jpeg',
  1024,
  768,
  300000,
  32000,
  'medication',
  'Test medicine package'
);

set local role anon;

do $$
begin
  begin
    perform public.export_patient_data(
      '00000000-0000-4000-8000-000000000081',
      'all_data',
      'selected_day',
      '2026-07-08',
      null
    );
    raise exception 'anonymous users should not execute patient exports';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000083';

do $$
declare
  selected_day_payload jsonb;
  image_payload jsonb;
  all_time_payload jsonb;
  request_rows integer;
begin
  selected_day_payload := public.export_patient_data(
    '00000000-0000-4000-8000-000000000081',
    'all_data',
    'selected_day',
    '2026-07-08',
    null
  );

  if selected_day_payload ->> 'mode' <> 'all_data' then
    raise exception 'selected-day export should preserve export mode';
  end if;

  if jsonb_array_length(selected_day_payload -> 'entries') <> 3 then
    raise exception 'selected-day export should include three Serbia-local patient A entries, got %',
      jsonb_array_length(selected_day_payload -> 'entries');
  end if;

  if (selected_day_payload #>> '{range,start}')::timestamptz
      <> '2026-07-07 22:00:00+00'::timestamptz
    or (selected_day_payload #>> '{range,end}')::timestamptz
      <> '2026-07-08 22:00:00+00'::timestamptz then
    raise exception 'selected-day export should use Europe/Belgrade calendar boundaries';
  end if;

  if selected_day_payload::text like '%data:image/%'
    or selected_day_payload::text like '%;base64,%' then
    raise exception 'selected-day export must not contain base64 images';
  end if;

  image_payload := public.export_patient_data(
    '00000000-0000-4000-8000-000000000081',
    'images_only_with_labels',
    'partial_month',
    null,
    '2026-07-01'
  );

  if jsonb_array_length(image_payload -> 'entries') <> 1 then
    raise exception 'images-only export should include one image reference, got %',
      jsonb_array_length(image_payload -> 'entries');
  end if;

  if image_payload #>> '{entries,0,photo,photoPath}' is null then
    raise exception 'images-only export should include storage photo paths';
  end if;

  if (image_payload #>> '{range,start}')::timestamptz
      <> '2026-06-30 22:00:00+00'::timestamptz then
    raise exception 'partial-month export should start at Europe/Belgrade month midnight';
  end if;

  if image_payload::text like '%data:image/%'
    or image_payload::text like '%;base64,%' then
    raise exception 'images-only export must not contain base64 images';
  end if;

  all_time_payload := public.export_patient_data(
    '00000000-0000-4000-8000-000000000081',
    'all_data',
    'all_time',
    null,
    null
  );

  if all_time_payload #>> '{range,type}' <> 'all_time' then
    raise exception 'all-time export should preserve the range type';
  end if;

  if all_time_payload #>> '{range,selectedDate}' is not null
    or all_time_payload #>> '{range,selectedMonth}' is not null then
    raise exception 'all-time export should not retain a selected date or month';
  end if;

  if jsonb_array_length(all_time_payload -> 'entries') <> 6 then
    raise exception 'all-time export should include every patient A entry, got %',
      jsonb_array_length(all_time_payload -> 'entries');
  end if;

  if all_time_payload::text like '%data:image/%'
    or all_time_payload::text like '%;base64,%' then
    raise exception 'all-time export must not contain base64 images';
  end if;

  begin
    perform public.export_patient_data(
      '00000000-0000-4000-8000-000000000081',
      'all_data',
      'all_time',
      '2026-07-08',
      null
    );
    raise exception 'all-time exports should reject selected dates';
  exception when invalid_parameter_value then null;
  end;

  select count(*) into request_rows
  from public.export_requests
  where doctor_id = '00000000-0000-4000-8000-000000000083'
    and patient_id = '00000000-0000-4000-8000-000000000081'
    and status = 'completed';

  if request_rows <> 3 then
    raise exception 'linked doctor should have three completed export request rows, saw %', request_rows;
  end if;

end $$;

reset role;

do $$
declare
  audit_rows integer;
begin
  select count(*) into audit_rows
  from public.audit_events
  where actor_id = '00000000-0000-4000-8000-000000000083'
    and patient_id = '00000000-0000-4000-8000-000000000081'
    and event_type = 'patient_export_created';

  if audit_rows <> 3 then
    raise exception 'linked doctor exports should create three audit rows, saw %', audit_rows;
  end if;
end $$;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000084';

do $$
declare
  visible_exports integer;
begin
  select count(*) into visible_exports from public.export_requests;
  if visible_exports <> 0 then
    raise exception 'unlinked doctor should not see another doctor export rows, saw %', visible_exports;
  end if;

  begin
    perform public.export_patient_data(
      '00000000-0000-4000-8000-000000000081',
      'all_data_with_images',
      'selected_day',
      '2026-07-08',
      null
    );
    raise exception 'unlinked doctors should not export patient data';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

rollback;
