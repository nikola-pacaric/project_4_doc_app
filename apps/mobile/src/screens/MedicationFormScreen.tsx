import { medicationDraftDefaults, validateMedication, type MedicationDraft } from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { spacing } from '@project4/ui-tokens';
import { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FormField } from '../components/FormField';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, sharedStyles } from '../theme';
import { formatTimeInput, toLocalDateInput, toLocalTimeInput } from '../utils/dateTime';

interface MedicationFormScreenProps {
  busy?: boolean;
  error?: string | null;
  initialDraft?: MedicationDraft;
  onBack: () => void;
  onSave: (draft: MedicationDraft) => void | Promise<void>;
}

function createInitialDraft(): MedicationDraft {
  const now = new Date();
  return {
    ...medicationDraftDefaults,
    takenAt: `${toLocalDateInput(now)} ${toLocalTimeInput(now)}`,
    isChronicTherapy: false,
  };
}

export function MedicationFormScreen({
  busy = false,
  error,
  initialDraft,
  onBack,
  onSave,
}: MedicationFormScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [draft, setDraft] = useState<MedicationDraft>(() => initialDraft ?? createInitialDraft());
  const [showErrors, setShowErrors] = useState(false);

  function update<K extends keyof MedicationDraft>(field: K, value: MedicationDraft[K]) {
    setShowErrors(false);
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateTime(value: string) {
    const date = draft.takenAt?.slice(0, 10) ?? toLocalDateInput(new Date());
    const currentTime = draft.takenAt?.slice(11, 16) ?? '';
    update('takenAt', `${date} ${formatTimeInput(value, currentTime, 23)}`);
  }

  function save() {
    if (!validateMedication(draft).valid) {
      setShowErrors(true);
      return;
    }
    void onSave(draft);
  }

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScrollView
        contentContainerStyle={sharedStyles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader eyebrow={t(locale, 'role.patient')} title={t(locale, 'medication.title')} />
        <Text style={sharedStyles.body}>{t(locale, 'medication.subtitle')}</Text>

        <FormField
          autoCapitalize="words"
          label={t(locale, 'medication.name')}
          onChangeText={(value) => update('name', value)}
          placeholder={t(locale, 'medication.namePlaceholder')}
          value={draft.name ?? ''}
        />
        <FormField
          label={t(locale, 'medication.dose')}
          onChangeText={(value) => update('dose', value)}
          placeholder={t(locale, 'medication.dosePlaceholder')}
          value={draft.dose ?? ''}
        />
        <FormField
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
          label={t(locale, 'medication.timeTaken')}
          maxLength={5}
          onChangeText={updateTime}
          placeholder={t(locale, 'medication.timePlaceholder')}
          value={draft.takenAt?.slice(11, 16) ?? ''}
        />
        <FormField
          label={t(locale, 'medication.reason')}
          multiline
          onChangeText={(value) => update('reason', value)}
          placeholder={t(locale, 'medication.reasonPlaceholder')}
          value={draft.reason ?? ''}
        />

        {showErrors ? (
          <Text selectable style={sharedStyles.error}>
            {t(locale, 'medication.requiredError')}
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
