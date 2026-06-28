import type { PatientEntry, UserProfile } from '@project4/contracts';
import type { NoteDraft } from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { createPatientNote, type AppSupabaseClient } from '@project4/supabase-client';
import { useState } from 'react';

import { NoteFormScreen } from './NoteFormScreen';

interface PatientNoteScreenProps {
  client: AppSupabaseClient;
  entryToEdit?: PatientEntry | null;
  onBack: () => void;
  onSaved: () => void;
  profile: UserProfile;
}

function toDraft(entry: PatientEntry): NoteDraft {
  const occurredAt = new Date(entry.occurredAt);
  return {
    entryId: entry.kind === 'note' ? entry.id : undefined,
    text: entry.text ?? '',
    occurredAt: `${occurredAt.getFullYear()}-${String(occurredAt.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(occurredAt.getDate()).padStart(2, '0')} ${String(
      occurredAt.getHours(),
    ).padStart(2, '0')}:${String(occurredAt.getMinutes()).padStart(2, '0')}`,
  };
}

export function PatientNoteScreen({
  client,
  entryToEdit,
  onBack,
  onSaved,
  profile,
}: PatientNoteScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(draft: NoteDraft) {
    setSaving(true);
    setError(null);
    try {
      await createPatientNote(client, profile.id, draft);
      onSaved();
    } catch {
      setError(t(locale, 'note.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <NoteFormScreen
      busy={saving}
      error={error}
      initialDraft={entryToEdit ? toDraft(entryToEdit) : undefined}
      onBack={onBack}
      onSave={save}
    />
  );
}
