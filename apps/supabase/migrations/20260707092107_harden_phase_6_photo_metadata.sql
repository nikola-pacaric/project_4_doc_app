-- Harden Phase 6 photo metadata before expanding linked-doctor workflows.

begin;

revoke all privileges on table public.entry_photos from anon, authenticated;
grant select, insert, update, delete on table public.entry_photos to authenticated;

do $$
begin
  if exists (
    select 1
    from public.entry_photos photo
    where photo.context_type is null
  ) then
    raise exception using
      errcode = '23514',
      message = 'entry_photos.context_type must be populated before enabling strict Phase 6 photo enforcement';
  end if;

  if exists (
    select 1
    from public.entry_photos photo
    join public.patient_entries entry on entry.id = photo.entry_id
    where entry.patient_id is distinct from photo.patient_id
       or entry.kind::text is distinct from photo.context_type
  ) then
    raise exception using
      errcode = '23514',
      message = 'entry_photos rows must match the referenced entry patient and kind before enabling strict Phase 6 photo enforcement';
  end if;
end $$;

alter table public.entry_photos
  alter column context_type set not null;

create or replace function app_private.enforce_entry_photo_entry_context()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actual_entry_kind text;
  actual_patient_id uuid;
begin
  select entry.kind::text, entry.patient_id
  into actual_entry_kind, actual_patient_id
  from public.patient_entries entry
  where entry.id = new.entry_id;

  if actual_patient_id is distinct from new.patient_id then
    raise exception using
      errcode = '23514',
      message = 'entry_photos.patient_id must match the referenced patient entry';
  end if;

  if actual_entry_kind is distinct from new.context_type then
    raise exception using
      errcode = '23514',
      message = 'entry_photos.context_type must match the referenced patient entry kind';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_entry_photo_entry_context on public.entry_photos;
create trigger enforce_entry_photo_entry_context
  before insert or update of entry_id, patient_id, context_type on public.entry_photos
  for each row execute function app_private.enforce_entry_photo_entry_context();

commit;
