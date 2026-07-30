import type { MenstruationRecord, UserProfile } from '@project4/contracts';
import type { MenstruationDraft } from '@project4/forms';
import { getActiveLocale, t } from '@project4/i18n';
import {
  createPatientMenstruation,
  getPatientMenstruation,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { spacing } from '@project4/ui-tokens';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { StatusMessage } from '../components/StatusMessage';
import { colors, sharedStyles } from '../theme';
import { toLocalDateInput, toLocalTimeInput } from '../utils/dateTime';
import { MenstruationFormScreen } from './MenstruationFormScreen';

interface PatientMenstruationScreenProps {
  client: AppSupabaseClient;
  entryToEdit?: { id: string; occurredAt: string } | null;
  onBack: () => void;
  onCancelProfile?: () => void;
  onCancelTimeline?: () => void;
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
  onCancelProfile,
  onCancelTimeline,
  onSaved,
  profile,
}: PatientMenstruationScreenProps) {
  const locale = getActiveLocale();
  const [initialDraft, setInitialDraft] = useState<MenstruationDraft | null>(null);
  const [loading, setLoading] = useState(Boolean(entryToEdit));
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entryToEdit) {
      setInitialDraft(null);
      setLoading(false);
      setLoadFailed(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    setLoadFailed(false);
    void getPatientMenstruation(client, entryToEdit.id, entryToEdit.occurredAt)
      .then((record) => {
        if (!active) return;
        if (!record) {
          setError(t(locale, 'menstruation.loadError'));
          setLoadFailed(true);
          return;
        }
        setInitialDraft(toDraft(record));
      })
      .catch(() => {
        if (!active) return;
        setLoadFailed(true);
        setError(t(locale, 'menstruation.loadError'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [client, entryToEdit, loadAttempt, locale]);

  function retryLoad() {
    setLoading(true);
    setLoadFailed(false);
    setError(null);
    setLoadAttempt((current) => current + 1);
  }

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

  if (loadFailed) {
    return (
      <View style={[sharedStyles.screen, { gap: spacing.md, justifyContent: 'center', padding: spacing.lg }]}>
        <StatusMessage
          message={error ?? t(locale, 'menstruation.loadError')}
          style={sharedStyles.error}
          tone="error"
        />
        <PrimaryButton label={t(locale, 'common.retry')} onPress={retryLoad} />
        <PrimaryButton
          label={t(locale, 'common.cancel')}
          onPress={onBack}
          variant="secondary"
        />
      </View>
    );
  }

  return (
    <MenstruationFormScreen
      busy={saving}
      error={error}
      initialDraft={initialDraft ?? undefined}
      onBack={onBack}
      onCancelProfile={onCancelProfile}
      onCancelTimeline={onCancelTimeline}
      onSave={save}
    />
  );
}
