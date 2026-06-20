import type { UserProfile } from '@project4/contracts';
import type { MenstruationDraft } from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { createPatientMenstruation, type AppSupabaseClient } from '@project4/supabase-client';
import { useState } from 'react';

import { MenstruationFormScreen } from './MenstruationFormScreen';

interface PatientMenstruationScreenProps {
  client: AppSupabaseClient;
  onBack: () => void;
  onSaved: () => void;
  profile: UserProfile;
}

export function PatientMenstruationScreen({
  client,
  onBack,
  onSaved,
  profile,
}: PatientMenstruationScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(draft: MenstruationDraft) {
    setSaving(true);
    setError(null);
    try {
      await createPatientMenstruation(client, profile.id, draft);
      onSaved();
    } catch {
      setError(t(locale, 'menstruation.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return <MenstruationFormScreen busy={saving} error={error} onBack={onBack} onSave={save} />;
}
