import { menstruationFlows, type MenstruationPainLevel } from '@project4/contracts';
import {
  menstruationDraftDefaults,
  validateMenstruation,
  type MenstruationDraft,
} from '@project4/forms';
import { DEFAULT_LOCALE, t, type TranslationKey } from '@project4/i18n';
import { spacing } from '@project4/ui-tokens';
import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FormField } from '../components/FormField';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, sharedStyles } from '../theme';
import { toLocalDateInput, toLocalTimeInput } from '../utils/dateTime';

interface MenstruationFormScreenProps {
  busy?: boolean;
  error?: string | null;
  onBack: () => void;
  onSave: (draft: MenstruationDraft) => void | Promise<void>;
}

const painLevels: MenstruationPainLevel[] = [1, 2, 3];

function createInitialDraft(): MenstruationDraft {
  const now = new Date();
  return {
    ...menstruationDraftDefaults,
    occurredAt: `${toLocalDateInput(now)} ${toLocalTimeInput(now)}`,
  };
}

export function MenstruationFormScreen({
  busy = false,
  error,
  onBack,
  onSave,
}: MenstruationFormScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [draft, setDraft] = useState<MenstruationDraft>(createInitialDraft);
  const [showErrors, setShowErrors] = useState(false);

  function update<K extends keyof MenstruationDraft>(field: K, value: MenstruationDraft[K]) {
    setShowErrors(false);
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateDateTime(date: string, time: string) {
    update('occurredAt', `${date} ${time}`);
  }

  function save() {
    if (!validateMenstruation(draft).valid) {
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
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleRow}>
          <Text selectable style={styles.title}>
            {t(locale, 'menstruation.title')}
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
          {t(locale, 'menstruation.subtitle')}
        </Text>

        <View style={styles.section}>
          <Text style={sharedStyles.fieldLabel}>{t(locale, 'menstruation.flow')}</Text>
          <View accessibilityRole="radiogroup" style={styles.segmentedRow}>
            {menstruationFlows.map((flow) => {
              const selected = draft.flow === flow;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  key={flow}
                  onPress={() => update('flow', flow)}
                  style={[styles.segment, selected && styles.selectedOption]}
                >
                  <Text style={[styles.segmentText, selected && styles.selectedText]}>
                    {t(locale, `menstruation.flow.${flow}` as TranslationKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={sharedStyles.fieldLabel}>{t(locale, 'menstruation.pain')}</Text>
          <View accessibilityRole="radiogroup" style={styles.painOptions}>
            {painLevels.map((painLevel) => {
              const selected = draft.painLevel === painLevel;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  key={painLevel}
                  onPress={() => update('painLevel', painLevel)}
                  style={[styles.painOption, selected && styles.selectedOption]}
                >
                  <Text style={[styles.painNumber, selected && styles.selectedText]}>
                    {painLevel}
                  </Text>
                  <Text style={[styles.painLabel, selected && styles.selectedText]}>
                    {t(locale, `menstruation.pain.${painLevel}` as TranslationKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <FormField
          autoCapitalize="none"
          editable={false}
          label={t(locale, 'menstruation.date')}
          value={date}
        />
        <FormField
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
          label={t(locale, 'menstruation.time')}
          onChangeText={(value) => updateDateTime(date, value)}
          placeholder={t(locale, 'menstruation.timePlaceholder')}
          value={time}
        />
        <FormField
          label={t(locale, 'menstruation.notes')}
          multiline
          onChangeText={(value) => update('notes', value)}
          placeholder={t(locale, 'menstruation.notesPlaceholder')}
          value={draft.notes ?? ''}
        />

        {showErrors ? (
          <Text selectable style={sharedStyles.error}>
            {t(locale, 'menstruation.requiredError')}
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
            <PrimaryButton busy={busy} label={t(locale, 'menstruation.save')} onPress={save} />
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
  painOptions: { flexDirection: 'row', gap: spacing.sm },
  painOption: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    minHeight: 64,
    paddingHorizontal: spacing.xs,
  },
  painNumber: { color: colors.text, fontSize: 17, fontWeight: '900' },
  painLabel: { color: colors.mutedText, fontSize: 11, fontWeight: '700', textAlign: 'center' },
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
