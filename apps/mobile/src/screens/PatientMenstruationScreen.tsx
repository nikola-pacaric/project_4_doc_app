import type { MenstruationRecord, UserProfile } from '@project4/contracts';
import type { MenstruationDraft } from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import {
  createPatientMenstruation,
  getPatientMenstruation,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { colors, sharedStyles } from '../theme';
import { toLocalDateInput, toLocalTimeInput } from '../utils/dateTime';
import { MenstruationFormScreen } from './MenstruationFormScreen';

interface PatientMenstruationScreenProps {
  client: AppSupabaseClient;
  entryToEdit?: { id: string; occurredAt: string } | null;
  onBack: () => void;
  onSaved: () => void;
  profile: UserProfile;
}

function toDraft(record: MenstruationRecord): MenstruationDraft {
  const occurredAt = new Date(record.occurredAt);
  return {
    entryId: record.entryId,
    flow: record.flow,
    painLevel: record.painLevel,
    occurredAt: `${toLocalDateInput(occurredAt)} ${toLocalTimeInput(occurredAt)}`,
    notes: record.notes ?? '',
  };
}

export function PatientMenstruationScreen({
  client,
  entryToEdit,
  onBack,
  onSaved,
  profile,
}: PatientMenstruationScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [initialDraft, setInitialDraft] = useState<MenstruationDraft | null>(null);
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
    void getPatientMenstruation(client, entryToEdit.id, entryToEdit.occurredAt)
      .then((record) => {
        if (!active) return;
        if (!record) {
          setError(t(locale, 'menstruation.loadError'));
          return;
        }
        setInitialDraft(toDraft(record));
      })
      .catch(() => {
        if (active) setError(t(locale, 'menstruation.loadError'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [client, entryToEdit, locale]);

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

  if (loading) {
    return (
      <View style={[sharedStyles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <MenstruationFormScreen
      busy={saving}
      error={error}
      initialDraft={initialDraft ?? undefined}
      onBack={onBack}
      onSave={save}
    />
  );
}
