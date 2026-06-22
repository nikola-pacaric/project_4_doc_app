import type { SymptomRecord, UserProfile } from '@project4/contracts';
import type { SymptomDraft } from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import {
  listPatientSymptoms,
  savePatientSymptoms,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { colors, sharedStyles } from '../theme';
import { toLocalDateInput, toLocalTimeInput } from '../utils/dateTime';
import { SymptomFormScreen } from './SymptomFormScreen';

interface PatientSymptomsScreenProps {
  client: AppSupabaseClient;
  onBack: () => void;
  onSaved: () => void;
  profile: UserProfile;
}

function todayRange(): { start: string; end: string } {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(),
    end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString(),
  };
}

function localDateTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return `${toLocalDateInput(date)} ${toLocalTimeInput(date)}`;
}

function toDraft(record: SymptomRecord): SymptomDraft {
  return {
    entryId: record.entryId,
    type: record.type,
    customType: record.customType ?? '',
    startedAt: localDateTime(record.startedAt),
    endedAt: localDateTime(record.endedAt),
    intensity: record.intensity,
    modifyingFactors: record.modifyingFactors ?? '',
    wokeFromSleep: record.wokeFromSleep,
    painLocation: record.painLocation ?? undefined,
    painLocationCustom: record.painLocationCustom ?? '',
    painRadiates: record.painRadiates ?? undefined,
    painRadiation: record.painRadiation ?? '',
    painDescription: record.painDescription ?? undefined,
    painDescriptionCustom: record.painDescriptionCustom ?? '',
  };
}

export function PatientSymptomsScreen({
  client,
  onBack,
  onSaved,
  profile,
}: PatientSymptomsScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [drafts, setDrafts] = useState<SymptomDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [formVersion, setFormVersion] = useState(0);

  useEffect(() => {
    let active = true;
    const range = todayRange();
    void listPatientSymptoms(client, profile.id, range.start, range.end)
      .then((records) => {
        if (active) setDrafts(records.map(toDraft));
      })
      .catch(() => {
        if (active) {
          setLoadFailed(true);
          setError(t(locale, 'symptom.loadError'));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [client, locale, profile.id]);

  async function save(nextDrafts: SymptomDraft[]) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const range = todayRange();
      await savePatientSymptoms(client, range, nextDrafts);
      const saved = await listPatientSymptoms(client, profile.id, range.start, range.end);
      setDrafts(saved.map(toDraft));
      setFormVersion((current) => current + 1);
      setMessage(t(locale, 'symptom.saved'));
      onSaved();
    } catch {
      setError(t(locale, 'symptom.saveError'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={sharedStyles.screen}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={sharedStyles.body}>{t(locale, 'app.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loadFailed) {
    return (
      <SafeAreaView style={sharedStyles.screen}>
        <View style={styles.centered}>
          <Text style={sharedStyles.error}>{error}</Text>
          <PrimaryButton label={t(locale, 'common.cancel')} onPress={onBack} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SymptomFormScreen
      busy={saving}
      error={error}
      initialDrafts={drafts}
      key={formVersion}
      message={message}
      onBack={onBack}
      onSave={save}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
});
