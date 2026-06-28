import { noteDraftDefaults, validateNote, type NoteDraft } from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { spacing } from '@project4/ui-tokens';
import { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FormField } from '../components/FormField';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, sharedStyles } from '../theme';
import { formatTimeInput, toLocalDateInput, toLocalTimeInput } from '../utils/dateTime';

interface NoteFormScreenProps {
  busy?: boolean;
  error?: string | null;
  initialDraft?: NoteDraft;
  onBack: () => void;
  onSave: (draft: NoteDraft) => void | Promise<void>;
}

function createInitialDraft(): NoteDraft {
  const now = new Date();
  return {
    ...noteDraftDefaults,
    occurredAt: `${toLocalDateInput(now)} ${toLocalTimeInput(now)}`,
  };
}

export function NoteFormScreen({
  busy = false,
  error,
  initialDraft,
  onBack,
  onSave,
}: NoteFormScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [draft, setDraft] = useState<NoteDraft>(() => initialDraft ?? createInitialDraft());
  const [showErrors, setShowErrors] = useState(false);

  function update<K extends keyof NoteDraft>(field: K, value: NoteDraft[K]) {
    setShowErrors(false);
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateDateTime(date: string, time: string) {
    update('occurredAt', `${date} ${time}`);
  }

  function save() {
    if (!validateNote(draft).valid) {
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
        <ScreenHeader eyebrow={t(locale, 'role.patient')} title={t(locale, 'note.title')} />
        <Text style={sharedStyles.body}>{t(locale, 'note.subtitle')}</Text>

        <FormField
          autoCapitalize="sentences"
          label={t(locale, 'note.text')}
          multiline
          onChangeText={(value) => update('text', value)}
          placeholder={t(locale, 'note.textPlaceholder')}
          value={draft.text ?? ''}
        />
        <FormField
          autoCapitalize="none"
          editable={false}
          label={t(locale, 'note.date')}
          value={date}
        />
        <FormField
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
          label={t(locale, 'note.time')}
          maxLength={5}
          onChangeText={(value) => updateDateTime(date, formatTimeInput(value, time, 23))}
          placeholder={t(locale, 'note.timePlaceholder')}
          value={time}
        />

        {showErrors ? (
          <Text selectable style={sharedStyles.error}>
            {t(locale, 'note.requiredError')}
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
