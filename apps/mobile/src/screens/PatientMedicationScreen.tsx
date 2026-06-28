import type { MedicationRecord, UserProfile } from '@project4/contracts';
import type { MedicationDraft } from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import {
  createPatientMedication,
  getPatientMedication,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { colors, sharedStyles } from '../theme';
import { toLocalDateInput, toLocalTimeInput } from '../utils/dateTime';
import { MedicationFormScreen } from './MedicationFormScreen';

interface PatientMedicationScreenProps {
  client: AppSupabaseClient;
  entryToEdit?: { id: string; occurredAt: string } | null;
  onBack: () => void;
  onSaved: () => void;
  profile: UserProfile;
}

function toDraft(record: MedicationRecord): MedicationDraft {
  const occurredAt = new Date(record.occurredAt);
  return {
    entryId: record.entryId,
    name: record.name,
    dose: record.dose,
    takenAt: `${toLocalDateInput(occurredAt)} ${toLocalTimeInput(occurredAt)}`,
    reason: record.reason ?? '',
    isChronicTherapy: record.isChronicTherapy,
  };
}

export function PatientMedicationScreen({
  client,
  entryToEdit,
  onBack,
  onSaved,
  profile,
}: PatientMedicationScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [initialDraft, setInitialDraft] = useState<MedicationDraft | null>(null);
  const [loading, setLoading] = useState(Boolean(entryToEdit));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entryToEdit) {
      setInitialDraft(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    void getPatientMedication(client, entryToEdit.id, entryToEdit.occurredAt)
      .then((record) => {
        if (!active) return;
        if (!record) {
          setError(t(locale, 'medication.loadError'));
          return;
        }
        setInitialDraft(toDraft(record));
      })
      .catch(() => {
        if (active) setError(t(locale, 'medication.loadError'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [client, entryToEdit, locale]);

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

  if (loading) {
    return (
      <View style={[sharedStyles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <MedicationFormScreen
      busy={saving}
      error={error}
      initialDraft={initialDraft ?? undefined}
      onBack={onBack}
      onSave={save}
    />
  );
}
