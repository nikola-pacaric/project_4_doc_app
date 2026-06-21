alter table public.patient_entries
  drop constraint if exists patient_entries_note_text_check,
  add constraint patient_entries_note_text_check
  check (kind <> 'note' or nullif(btrim(coalesce(text, '')), '') is not null);
