import type { UserProfile } from '@project4/contracts';
import type { StoolDraft } from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { createPatientStool, type AppSupabaseClient } from '@project4/supabase-client';
import { useState } from 'react';

import { StoolFormScreen } from './StoolFormScreen';

interface PatientStoolScreenProps {
  client: AppSupabaseClient;
  onBack: () => void;
  onSaved: () => void;
  profile: UserProfile;
}

export function PatientStoolScreen({ client, onBack, onSaved, profile }: PatientStoolScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(draft: StoolDraft) {
    setSaving(true);
    setError(null);
    try {
      await createPatientStool(client, profile.id, draft);
      onSaved();
    } catch {
      setError(t(locale, 'stool.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return <StoolFormScreen busy={saving} error={error} onBack={onBack} onSave={save} />;
}
