import { exerciseIntensities } from '@project4/contracts';
import { exerciseDraftDefaults, validateExercise, type ExerciseDraft } from '@project4/forms';
import { DEFAULT_LOCALE, t, type TranslationKey } from '@project4/i18n';
import { spacing } from '@project4/ui-tokens';
import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FormField } from '../components/FormField';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, sharedStyles } from '../theme';
import { formatTimeInput, toLocalDateInput, toLocalTimeInput } from '../utils/dateTime';

interface ExerciseFormScreenProps {
  busy?: boolean;
  error?: string | null;
  onBack: () => void;
  onSave: (draft: ExerciseDraft) => void | Promise<void>;
}

function createInitialDraft(): ExerciseDraft {
  const now = new Date();
  return {
    ...exerciseDraftDefaults,
    occurredAt: `${toLocalDateInput(now)} ${toLocalTimeInput(now)}`,
  };
}

export function ExerciseFormScreen({
  busy = false,
  error,
  onBack,
  onSave,
}: ExerciseFormScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [draft, setDraft] = useState<ExerciseDraft>(createInitialDraft);
  const [showErrors, setShowErrors] = useState(false);

  function update<K extends keyof ExerciseDraft>(field: K, value: ExerciseDraft[K]) {
    setShowErrors(false);
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateDateTime(date: string, time: string) {
    update('occurredAt', `${date} ${time}`);
  }

  function save() {
    if (!validateExercise(draft).valid) {
      setShowErrors(true);
      return;
    }

    void onSave(draft);
  }

  const date = draft.occurredAt?.slice(0, 10) ?? '';
  const time = draft.occurredAt?.slice(11, 16) ?? '';

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScrollView
        contentContainerStyle={sharedStyles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader eyebrow={t(locale, 'role.patient')} title={t(locale, 'exercise.title')} />
        <Text style={sharedStyles.body}>{t(locale, 'exercise.subtitle')}</Text>

        <FormField
          autoCapitalize="sentences"
          label={t(locale, 'exercise.activity')}
          onChangeText={(value) => update('activity', value)}
          placeholder={t(locale, 'exercise.activityPlaceholder')}
          value={draft.activity ?? ''}
        />
        <FormField
          keyboardType="number-pad"
          label={t(locale, 'exercise.duration')}
          onChangeText={(value) => {
            const parsed = Number(value);
            update('durationMinutes', value.trim() && Number.isFinite(parsed) ? parsed : undefined);
          }}
          placeholder={t(locale, 'exercise.durationPlaceholder')}
          value={draft.durationMinutes === undefined ? '' : String(draft.durationMinutes)}
        />

        <View style={styles.section}>
          <Text style={sharedStyles.fieldLabel}>{t(locale, 'exercise.intensity')}</Text>
          <View accessibilityRole="radiogroup" style={styles.segmentedRow}>
            {exerciseIntensities.map((intensity) => {
              const selected = draft.intensity === intensity;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  key={intensity}
                  onPress={() => update('intensity', intensity)}
                  style={[styles.segment, selected && styles.selectedOption]}
                >
                  <Text style={[styles.segmentText, selected && styles.selectedText]}>
                    {t(locale, `exercise.intensity.${intensity}` as TranslationKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <FormField
          autoCapitalize="none"
          editable={false}
          label={t(locale, 'exercise.date')}
          value={date}
        />
        <FormField
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
          label={t(locale, 'exercise.time')}
          maxLength={5}
          onChangeText={(value) => updateDateTime(date, formatTimeInput(value, time, 23))}
          placeholder={t(locale, 'exercise.timePlaceholder')}
          value={time}
        />
        <FormField
          label={t(locale, 'exercise.notes')}
          multiline
          onChangeText={(value) => update('notes', value)}
          placeholder={t(locale, 'exercise.notesPlaceholder')}
          value={draft.notes ?? ''}
        />

        {showErrors ? (
          <Text selectable style={sharedStyles.error}>
            {t(locale, 'exercise.requiredError')}
          </Text>
        ) : null}
        {error ? (
          <Text selectable style={sharedStyles.error}>
            {error}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <View style={styles.action}>
            <PrimaryButton
              label={t(locale, 'common.cancel')}
              onPress={onBack}
              variant="secondary"
            />
          </View>
          <View style={styles.action}>
            <PrimaryButton busy={busy} label={t(locale, 'common.save')} onPress={save} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  segmentedRow: { flexDirection: 'row', gap: spacing.sm },
  segment: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.xs,
  },
  segmentText: { color: colors.text, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  selectedOption: { backgroundColor: colors.accent, borderColor: colors.accent },
  selectedText: { color: '#ffffff' },
  actions: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 'auto',
    paddingTop: spacing.md,
  },
  action: { flex: 1 },
});
