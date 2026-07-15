drop function public.save_patient_note(uuid, timestamptz, text);

create function public.save_patient_note(
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
  previous_occurred_at timestamptz;
  previous_text text;
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
    on conflict (patient_id, client_entry_id)
      where client_entry_id is not null
      do nothing
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
    else
      insert into public.audit_events (actor_id, actor_role, patient_id, event_type, metadata)
      values (
        patient_id_value,
        'patient',
        patient_id_value,
        'patient_note_created',
        pg_catalog.jsonb_build_object(
          'entry_id', note_entry_id,
          'client_entry_id', normalized_client_entry_id,
          'new_occurred_at', p_occurred_at,
          'new_text', next_text
        )
      );
    end if;
  else
    select entry.occurred_at, entry.text
    into previous_occurred_at, previous_text
    from public.patient_entries entry
    where entry.id = p_entry_id
      and entry.patient_id = patient_id_value
      and entry.kind = 'note';

    if previous_occurred_at is null then
      raise exception using errcode = '42501', message = 'Note entry is not editable by this patient';
    end if;

    update public.patient_entries entry
    set occurred_at = p_occurred_at,
        text = next_text
    where entry.id = p_entry_id
      and entry.patient_id = patient_id_value
      and entry.kind = 'note'
    returning entry.id into note_entry_id;

    insert into public.audit_events (actor_id, actor_role, patient_id, event_type, metadata)
    values (
      patient_id_value,
      'patient',
      patient_id_value,
      'patient_note_updated',
      pg_catalog.jsonb_build_object(
        'entry_id', note_entry_id,
        'previous_occurred_at', previous_occurred_at,
        'new_occurred_at', p_occurred_at,
        'previous_text', previous_text,
        'new_text', next_text
      )
    );
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
