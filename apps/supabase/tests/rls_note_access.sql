begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, created_at, updated_at
)
values
  ('00000000-0000-4000-8000-000000000301', 'authenticated', 'authenticated', 'note_patient_a@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000302', 'authenticated', 'authenticated', 'note_patient_b@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000303', 'authenticated', 'authenticated', 'note_doctor@example.test', 'test', now(), '{"app_role":"doctor"}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.user_profiles (id, role, display_name)
values
  ('00000000-0000-4000-8000-000000000301', 'patient', 'Note Patient A'),
  ('00000000-0000-4000-8000-000000000302', 'patient', 'Note Patient B'),
  ('00000000-0000-4000-8000-000000000303', 'doctor', 'Note Doctor')
on conflict (id) do nothing;

insert into public.patient_entries (id, patient_id, kind, occurred_at, text)
values
  ('10000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000301', 'note', now(), 'Patient A note'),
  ('10000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000302', 'note', now(), 'Patient B note')
on conflict (id) do nothing;

set local role anon;

do $$
declare visible_notes integer;
begin
  select count(*) into visible_notes from public.patient_entries where kind = 'note';
  if visible_notes <> 0 then
    raise exception 'unauthenticated users should see 0 notes, saw %', visible_notes;
  end if;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000301';

do $$
declare
  visible_notes integer;
  changed_rows integer;
begin
  select count(*) into visible_notes from public.patient_entries where kind = 'note';
  if visible_notes <> 1 then
    raise exception 'patient A should see exactly 1 own note, saw %', visible_notes;
  end if;

  update public.patient_entries set text = 'Updated own note'
  where id = '10000000-0000-4000-8000-000000000301';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then raise exception 'patient A should update an own note'; end if;

  update public.patient_entries set text = 'not allowed'
  where id = '10000000-0000-4000-8000-000000000302';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then raise exception 'patient A should not update patient B note'; end if;

  begin
    insert into public.patient_entries (patient_id, kind, occurred_at, text)
    values ('00000000-0000-4000-8000-000000000301', 'note', now(), '   ');
    raise exception 'blank note text should be rejected';
  exception when check_violation then null;
  end;

  begin
    insert into public.patient_entries (patient_id, kind, occurred_at, text)
    values (
      '00000000-0000-4000-8000-000000000302',
      'note',
      now(),
      'Patient A attempted to create a note for patient B'
    );
    raise exception 'patient A should not create a note for patient B';
  exception when insufficient_privilege then null;
  end;

  insert into public.patient_entries (id, patient_id, kind, occurred_at, text)
  values ('10000000-0000-4000-8000-000000000309', '00000000-0000-4000-8000-000000000301', 'note', now(), 'Temporary note');

  delete from public.patient_entries where id = '10000000-0000-4000-8000-000000000309';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then raise exception 'patient A should delete an own note'; end if;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000303';

do $$
declare
  visible_notes integer;
  changed_rows integer;
begin
  select count(*) into visible_notes from public.patient_entries where kind = 'note';
  if visible_notes <> 0 then
    raise exception 'unlinked doctor should see 0 notes, saw %', visible_notes;
  end if;

  update public.patient_entries set text = 'not allowed'
  where id = '10000000-0000-4000-8000-000000000301';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then raise exception 'unlinked doctor should not update notes'; end if;
end $$;

reset role;

insert into public.doctor_patient_access (doctor_id, patient_id)
values ('00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000301')
on conflict (doctor_id, patient_id)
where active = true and revoked_at is null
do nothing;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000303';

do $$
declare
  visible_notes integer;
  changed_rows integer;
begin
  select count(*) into visible_notes from public.patient_entries where kind = 'note';
  if visible_notes <> 1 then
    raise exception 'linked doctor should see exactly 1 note, saw %', visible_notes;
  end if;

  update public.patient_entries set text = 'doctor attempted edit'
  where id = '10000000-0000-4000-8000-000000000301';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then raise exception 'linked doctor should not update notes'; end if;
end $$;

reset role;

rollback;
