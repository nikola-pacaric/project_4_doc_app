import type { UserProfile } from '@project4/contracts';
import type { NoteDraft } from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { createPatientNote, type AppSupabaseClient } from '@project4/supabase-client';
import { useState } from 'react';

import { NoteFormScreen } from './NoteFormScreen';

interface PatientNoteScreenProps {
  client: AppSupabaseClient;
  onBack: () => void;
  onSaved: () => void;
  profile: UserProfile;
}

export function PatientNoteScreen({ client, onBack, onSaved, profile }: PatientNoteScreenProps) {
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

  return <NoteFormScreen busy={saving} error={error} onBack={onBack} onSave={save} />;
}
