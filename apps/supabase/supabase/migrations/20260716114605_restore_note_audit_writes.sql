begin;

-- Keep audit_events private from clients while allowing patient note writes to
-- emit mandatory audit rows through a narrowly scoped internal trigger.
create or replace function app_private.audit_patient_note_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id_value uuid := (select auth.uid());
  actor_role_value public.user_role := app_private.current_user_role();
begin
  -- Operator/service work has no end-user auth context. Preserve that workflow
  -- without granting the client role a way to manufacture audit records.
  if actor_id_value is null
    or actor_role_value is distinct from 'patient'::public.user_role
    or actor_id_value is distinct from new.patient_id then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.kind is distinct from 'note'::public.entry_kind then
      return new;
    end if;

    insert into public.audit_events (
      actor_id,
      actor_role,
      patient_id,
      event_type,
      metadata
    )
    values (
      actor_id_value,
      actor_role_value,
      new.patient_id,
      'patient_note_created',
      pg_catalog.jsonb_build_object(
        'entry_id', new.id,
        'client_entry_id', new.client_entry_id,
        'new_occurred_at', new.occurred_at,
        'new_text', new.text
      )
    );
  elsif tg_op = 'UPDATE' then
    if old.kind is distinct from 'note'::public.entry_kind
      or new.kind is distinct from 'note'::public.entry_kind
      or (
        old.occurred_at is not distinct from new.occurred_at
        and old.text is not distinct from new.text
      ) then
      return new;
    end if;

    insert into public.audit_events (
      actor_id,
      actor_role,
      patient_id,
      event_type,
      metadata
    )
    values (
      actor_id_value,
      actor_role_value,
      new.patient_id,
      'patient_note_updated',
      pg_catalog.jsonb_build_object(
        'entry_id', new.id,
        'previous_occurred_at', old.occurred_at,
        'new_occurred_at', new.occurred_at,
        'previous_text', old.text,
        'new_text', new.text
      )
    );
  end if;

  return new;
end;
$$;

revoke execute on function app_private.audit_patient_note_changes()
from public, anon, authenticated;

drop trigger if exists audit_patient_note_changes on public.patient_entries;
create trigger audit_patient_note_changes
  after insert or update of occurred_at, text on public.patient_entries
  for each row execute function app_private.audit_patient_note_changes();

create or replace function public.save_patient_note(
  p_entry_id uuid,
  p_occurred_at timestamptz,
  p_text text,
  p_client_entry_id text
)
returns table (
  id uuid,
  patient_id uuid,
  kind public.entry_kind,
  occurred_at timestamptz,
  text text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  patient_id_value uuid := (select auth.uid());
  note_entry_id uuid;
  next_text text := btrim(p_text);
  normalized_client_entry_id text := nullif(btrim(p_client_entry_id), '');
begin
  if patient_id_value is null or app_private.current_user_role() is distinct from 'patient' then
    raise exception using errcode = '42501', message = 'Only authenticated patients can save notes';
  end if;

  if p_occurred_at is null then
    raise exception using errcode = '22023', message = 'Note time is required';
  end if;

  if nullif(next_text, '') is null then
    raise exception using errcode = '22023', message = 'Note text is required';
  end if;

  if normalized_client_entry_id is not null and (
    pg_catalog.length(normalized_client_entry_id) > 128
    or normalized_client_entry_id !~ '^[A-Za-z0-9._:-]+$'
  ) then
    raise exception using errcode = '22023', message = 'Invalid note idempotency key';
  end if;

  if p_entry_id is not null and normalized_client_entry_id is not null then
    raise exception using
      errcode = '22023',
      message = 'An idempotency key cannot be used when updating a note';
  end if;

  if p_entry_id is null then
    insert into public.patient_entries (
      patient_id,
      kind,
      occurred_at,
      text,
      client_entry_id
    )
    values (
      patient_id_value,
      'note',
      p_occurred_at,
      next_text,
      normalized_client_entry_id
    )
    on conflict do nothing
    returning patient_entries.id into note_entry_id;

    if note_entry_id is null then
      select entry.id
      into note_entry_id
      from public.patient_entries entry
      where entry.patient_id = patient_id_value
        and entry.client_entry_id = normalized_client_entry_id
        and entry.kind = 'note'
        and entry.occurred_at = p_occurred_at
        and entry.text = next_text;

      if note_entry_id is null then
        raise exception using
          errcode = '22023',
          message = 'Note idempotency key was already used with different content';
      end if;
    end if;
  else
    select entry.id
    into note_entry_id
    from public.patient_entries entry
    where entry.id = p_entry_id
      and entry.patient_id = patient_id_value
      and entry.kind = 'note';

    if note_entry_id is null then
      raise exception using errcode = '42501', message = 'Note entry is not editable by this patient';
    end if;

    update public.patient_entries entry
    set occurred_at = p_occurred_at,
        text = next_text
    where entry.id = note_entry_id
    returning entry.id into note_entry_id;
  end if;

  return query
  select
    entry.id,
    entry.patient_id,
    entry.kind,
    entry.occurred_at,
    entry.text,
    entry.created_at,
    entry.updated_at
  from public.patient_entries entry
  where entry.id = note_entry_id;
end;
$$;

revoke execute on function public.save_patient_note(
  uuid,
  timestamptz,
  text,
  text
) from public, anon;

grant execute on function public.save_patient_note(
  uuid,
  timestamptz,
  text,
  text
) to authenticated;

revoke insert on table public.audit_events from authenticated;
drop policy if exists "audit_insert_self" on public.audit_events;

commit;
