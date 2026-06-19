import type { UserProfile } from '@project4/contracts';
import type { MedicationDraft } from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { createPatientMedication, type AppSupabaseClient } from '@project4/supabase-client';
import { useState } from 'react';

import { MedicationFormScreen } from './MedicationFormScreen';

interface PatientMedicationScreenProps {
  client: AppSupabaseClient;
  onBack: () => void;
  onSaved: () => void;
  profile: UserProfile;
}

export function PatientMedicationScreen({
  client,
  onBack,
  onSaved,
  profile,
}: PatientMedicationScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(draft: MedicationDraft) {
    setSaving(true);
    setError(null);
    try {
      await createPatientMedication(client, profile.id, draft);
      onSaved();
    } catch {
      setError(t(locale, 'medication.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return <MedicationFormScreen busy={saving} error={error} onBack={onBack} onSave={save} />;
}
