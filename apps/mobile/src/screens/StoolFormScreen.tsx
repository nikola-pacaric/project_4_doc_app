import type { BristolStoolType, StoolUrgencyLevel } from '@project4/contracts';
import { stoolDraftDefaults, validateStool, type StoolDraft } from '@project4/forms';
import { DEFAULT_LOCALE, t, type TranslationKey } from '@project4/i18n';
import { spacing } from '@project4/ui-tokens';
import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FormField } from '../components/FormField';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, sharedStyles } from '../theme';

interface StoolFormScreenProps {
  busy?: boolean;
  error?: string | null;
  initialDraft?: StoolDraft;
  onBack: () => void;
  onSave: (draft: StoolDraft) => void | Promise<void>;
  onSaveNoStool: () => void | Promise<void>;
}

const bristolTypes: BristolStoolType[] = [1, 2, 3, 4, 5, 6, 7];
const urgencyLevels: StoolUrgencyLevel[] = ['none', 'mild', 'moderate', 'severe'];
const symptomFields = ['pain', 'mucus', 'blood', 'fattyStool', 'blackStool'] as const;

const defaultStoolDraft: StoolDraft = {
  ...stoolDraftDefaults,
  pain: false,
  mucus: false,
  blood: false,
  fattyStool: false,
  blackStool: false,
};

function bristolDescriptionKey(type: BristolStoolType): TranslationKey {
  return `stool.bristolDescription.${type}` as TranslationKey;
}

export function StoolFormScreen({
  busy = false,
  error,
  initialDraft = defaultStoolDraft,
  onBack,
  onSave,
  onSaveNoStool,
}: StoolFormScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [draft, setDraft] = useState<StoolDraft>(initialDraft);
  const [showErrors, setShowErrors] = useState(false);

  function update<K extends keyof StoolDraft>(field: K, value: StoolDraft[K]) {
    setShowErrors(false);
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function save() {
    if (!validateStool(draft).valid) {
      setShowErrors(true);
      return;
    }

    void onSave(draft);
  }

  return (
    <SafeAreaView style={sharedStyles.formScreen}>
      <ScrollView
        contentContainerStyle={sharedStyles.formScrollContent}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader eyebrow={t(locale, 'role.patient')} title={t(locale, 'stool.title')} />
        <Text style={sharedStyles.body}>{t(locale, 'stool.subtitle')}</Text>

        <View style={styles.noStoolCard}>
          <Text style={styles.noStoolTitle}>{t(locale, 'stool.noStoolToday')}</Text>
          <Text style={styles.noStoolDetail}>{t(locale, 'stool.noStoolDetail')}</Text>
          <PrimaryButton
            busy={busy}
            label={t(locale, 'stool.saveNoStool')}
            onPress={() => void onSaveNoStool()}
            variant="secondary"
          />
        </View>

        <View style={styles.section}>
          <Text style={sharedStyles.fieldLabel}>{t(locale, 'stool.bristolType')}</Text>
          <View accessibilityRole="radiogroup" style={styles.bristolOptions}>
            {bristolTypes.map((type) => {
              const selected = draft.bristolType === type;
              return (
                <Pressable
                  accessibilityLabel={`${t(locale, 'stool.bristolType')} ${type}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  key={type}
                  onPress={() => update('bristolType', type)}
                  style={[styles.bristolOption, selected && styles.selectedOption]}
                >
                  <Text style={[styles.bristolNumber, selected && styles.selectedText]}>
                    {type}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {draft.bristolType ? (
            <View style={styles.bristolCard}>
              <View style={styles.bristolCardHeader}>
                <Text style={styles.bristolCardType}>
                  {t(locale, 'stool.bristolSelected').replace('{type}', String(draft.bristolType))}
                </Text>
                <Text style={styles.chartLabel}>{t(locale, 'stool.bristolChart')}</Text>
              </View>
              <Text style={styles.bristolDescription}>
                {t(locale, bristolDescriptionKey(draft.bristolType))}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={sharedStyles.fieldLabel}>{t(locale, 'stool.urgency')}</Text>
          <View accessibilityRole="radiogroup" style={styles.segmentedRow}>
            {urgencyLevels.map((level) => {
              const selected = draft.urgencyLevel === level;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  key={level}
                  onPress={() => update('urgencyLevel', level)}
                  style={[styles.segment, selected && styles.selectedOption]}
                >
                  <Text style={[styles.segmentText, selected && styles.selectedText]}>
                    {t(locale, `stool.urgency.${level}` as TranslationKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={sharedStyles.fieldLabel}>{t(locale, 'stool.checkmarks')}</Text>
          <View style={styles.checkGrid}>
            {symptomFields.map((field) => {
              const selected = draft[field] === true;
              return (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  key={field}
                  onPress={() => update(field, !selected)}
                  style={styles.checkOption}
                >
                  <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                    {selected ? <Text style={styles.checkmark}>✓</Text> : null}
                  </View>
                  <Text style={styles.checkLabel}>
                    {t(locale, `stool.${field}` as TranslationKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <FormField
          label={t(locale, 'stool.notes')}
          multiline
          onChangeText={(value) => update('notes', value)}
          placeholder={t(locale, 'stool.notesPlaceholder')}
          value={draft.notes ?? ''}
        />

        <View style={styles.disclaimer}>
          <Text selectable style={styles.disclaimerText}>
            △ {t(locale, 'stool.disclaimer')}
          </Text>
        </View>

        {showErrors ? (
          <Text selectable style={sharedStyles.error}>
            {t(locale, 'stool.requiredError')}
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
  noStoolCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  noStoolTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  noStoolDetail: { color: colors.mutedText, fontSize: 14, lineHeight: 20 },
  bristolOptions: { flexDirection: 'row', gap: 6 },
  bristolOption: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  bristolNumber: { color: colors.text, fontSize: 16, fontWeight: '800' },
  selectedOption: { backgroundColor: colors.accent, borderColor: colors.accent },
  selectedText: { color: '#ffffff' },
  bristolCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  bristolCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bristolCardType: { color: colors.accent, fontSize: 16, fontWeight: '800' },
  chartLabel: { color: colors.mutedText, fontSize: 12, fontWeight: '700' },
  bristolDescription: { color: '#a85b25', fontSize: 14, fontWeight: '700', lineHeight: 20 },
  segmentedRow: { flexDirection: 'row', gap: spacing.sm },
  segment: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 4,
  },
  segmentText: { color: colors.text, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  checkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  checkOption: {
    alignItems: 'center',
    flexBasis: '47%',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 44,
  },
  checkbox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  checkboxSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkmark: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  checkLabel: { color: colors.text, flex: 1, fontSize: 14, lineHeight: 19 },
  disclaimer: {
    backgroundColor: '#fff1f1',
    borderColor: '#ffc9cf',
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.md,
  },
  disclaimerText: { color: colors.danger, fontSize: 13, lineHeight: 19 },
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
