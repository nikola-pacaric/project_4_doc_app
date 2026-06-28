import type { ExerciseRecord, UserProfile } from '@project4/contracts';
import type { ExerciseDraft } from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import {
  createPatientExercise,
  getPatientExercise,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { spacing } from '@project4/ui-tokens';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { colors, sharedStyles } from '../theme';
import { ExerciseFormScreen } from './ExerciseFormScreen';

interface PatientExerciseScreenProps {
  client: AppSupabaseClient;
  entryToEdit?: { id: string; occurredAt: string } | null;
  onBack: () => void;
  onSaved: () => void;
  profile: UserProfile;
}

function toLocalDraftDateTime(value: string): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
}

function toDraft(record: ExerciseRecord): ExerciseDraft {
  return {
    entryId: record.entryId,
    activity: record.activity,
    durationMinutes: record.durationMinutes,
    intensity: record.intensity,
    occurredAt: toLocalDraftDateTime(record.occurredAt),
    notes: record.notes ?? '',
  };
}

export function PatientExerciseScreen({
  client,
  entryToEdit,
  onBack,
  onSaved,
  profile,
}: PatientExerciseScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [initialDraft, setInitialDraft] = useState<ExerciseDraft | null>(null);
  const [loading, setLoading] = useState(Boolean(entryToEdit));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedExercise, setSavedExercise] = useState<ExerciseRecord | null>(null);
  const [formVersion, setFormVersion] = useState(0);

  useEffect(() => {
    if (!entryToEdit) {
      setInitialDraft(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    void getPatientExercise(client, entryToEdit.id, entryToEdit.occurredAt)
      .then((record) => {
        if (!active) return;
        if (!record) {
          setError(t(locale, 'exercise.loadError'));
          return;
        }
        setInitialDraft(toDraft(record));
      })
      .catch(() => {
        if (active) setError(t(locale, 'exercise.loadError'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [client, entryToEdit, locale]);

  async function save(draft: ExerciseDraft) {
    setSaving(true);
    setError(null);
    try {
      const saved = await createPatientExercise(client, profile.id, draft);
      setSavedExercise(saved);
      onSaved();
    } catch {
      setError(t(locale, 'exercise.saveError'));
    } finally {
      setSaving(false);
    }
  }

  if (savedExercise) {
    return (
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        style={sharedStyles.screen}
      >
        <View style={styles.successIcon}>
          <Text selectable style={styles.successIconText}>
            ✓
          </Text>
        </View>
        <Text selectable style={styles.title}>
          {t(locale, 'exercise.savedTitle')}
        </Text>
        <Text selectable style={styles.activity}>
          {savedExercise.activity}
        </Text>
        <Text selectable style={styles.detail}>
          {t(locale, 'exercise.savedDetail')}
        </Text>
        <View style={styles.actions}>
          <PrimaryButton
            label={t(locale, 'exercise.addAnother')}
            onPress={() => {
              setSavedExercise(null);
              setFormVersion((current) => current + 1);
            }}
          />
          <PrimaryButton label={t(locale, 'exercise.done')} onPress={onBack} variant="secondary" />
        </View>
      </ScrollView>
    );
  }

  if (loading) {
    return (
      <View style={[sharedStyles.screen, styles.loadingScreen]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <ExerciseFormScreen
      busy={saving}
      error={error}
      initialDraft={initialDraft ?? undefined}
      key={formVersion}
      onBack={onBack}
      onSave={save}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'stretch',
    flexGrow: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  successIcon: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.accent,
    borderRadius: 36,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  successIconText: { color: '#ffffff', fontSize: 38, fontWeight: '800' },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', textAlign: 'center' },
  activity: { color: colors.accent, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  detail: { color: colors.mutedText, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  actions: { gap: spacing.sm, paddingTop: spacing.md },
  loadingScreen: { alignItems: 'center', justifyContent: 'center' },
});
