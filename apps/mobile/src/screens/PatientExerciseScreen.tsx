import type { UserProfile } from '@project4/contracts';
import type { ExerciseDraft } from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { createPatientExercise, type AppSupabaseClient } from '@project4/supabase-client';
import { useState } from 'react';

import { ExerciseFormScreen } from './ExerciseFormScreen';

interface PatientExerciseScreenProps {
  client: AppSupabaseClient;
  onBack: () => void;
  onSaved: () => void;
  profile: UserProfile;
}

export function PatientExerciseScreen({
  client,
  onBack,
  onSaved,
  profile,
}: PatientExerciseScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(draft: ExerciseDraft) {
    setSaving(true);
    setError(null);
    try {
      await createPatientExercise(client, profile.id, draft);
      onSaved();
    } catch {
      setError(t(locale, 'exercise.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return <ExerciseFormScreen busy={saving} error={error} onBack={onBack} onSave={save} />;
}
