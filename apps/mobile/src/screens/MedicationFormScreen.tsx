import { medicationDraftDefaults, validateMedication, type MedicationDraft } from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { spacing } from '@project4/ui-tokens';
import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { FormField } from '../components/FormField';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, sharedStyles } from '../theme';
import { toLocalDateInput, toLocalTimeInput } from '../utils/dateTime';

interface MedicationFormScreenProps {
  busy?: boolean;
  error?: string | null;
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
  onBack,
  onSave,
}: MedicationFormScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [draft, setDraft] = useState<MedicationDraft>(createInitialDraft);
  const [showErrors, setShowErrors] = useState(false);

  function update<K extends keyof MedicationDraft>(field: K, value: MedicationDraft[K]) {
    setShowErrors(false);
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateTime(value: string) {
    const date = draft.takenAt?.slice(0, 10) ?? toLocalDateInput(new Date());
    update('takenAt', `${date} ${value}`);
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
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleRow}>
          <Text selectable style={styles.title}>
            {t(locale, 'medication.title')}
          </Text>
          <Pressable
            accessibilityLabel={t(locale, 'common.cancel')}
            accessibilityRole="button"
            hitSlop={12}
            onPress={onBack}
            style={styles.closeButton}
          >
            <Text style={styles.closeLabel}>×</Text>
          </Pressable>
        </View>
        <Text selectable style={styles.subtitle}>
          {t(locale, 'medication.subtitle')}
        </Text>

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

        <View style={styles.switchCard}>
          <View style={styles.switchCopy}>
            <Text style={styles.switchLabel}>{t(locale, 'medication.chronicTherapy')}</Text>
            <Text selectable style={styles.switchHelp}>
              {t(locale, 'medication.chronicTherapyHelp')}
            </Text>
          </View>
          <Switch
            accessibilityLabel={t(locale, 'medication.chronicTherapy')}
            onValueChange={(value) => update('isChronicTherapy', value)}
            thumbColor="#ffffff"
            trackColor={{ false: colors.border, true: colors.accent }}
            value={draft.isChronicTherapy ?? false}
          />
        </View>

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
            <PrimaryButton busy={busy} label={t(locale, 'medication.save')} onPress={save} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing.md, padding: spacing.lg },
  titleRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  closeButton: { alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 44 },
  closeLabel: { color: colors.accent, fontSize: 32, fontWeight: '500', lineHeight: 34 },
  subtitle: { color: colors.mutedText, fontSize: 14, lineHeight: 20 },
  switchCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  switchCopy: { flex: 1, gap: spacing.xs },
  switchLabel: { color: colors.text, fontSize: 15, fontWeight: '800' },
  switchHelp: { color: colors.mutedText, fontSize: 12, lineHeight: 18 },
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
