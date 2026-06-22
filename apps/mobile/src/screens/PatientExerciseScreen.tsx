import type { ExerciseRecord, UserProfile } from '@project4/contracts';
import type { ExerciseDraft } from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { createPatientExercise, type AppSupabaseClient } from '@project4/supabase-client';
import { spacing } from '@project4/ui-tokens';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { colors, sharedStyles } from '../theme';
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
  const [savedExercise, setSavedExercise] = useState<ExerciseRecord | null>(null);
  const [formVersion, setFormVersion] = useState(0);

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

  return (
    <ExerciseFormScreen
      busy={saving}
      error={error}
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
});
