import type { PatientEntry } from '@project4/contracts';
import { DEFAULT_LOCALE, t, type TranslationKey } from '@project4/i18n';
import { spacing } from '@project4/ui-tokens';
import { useState } from 'react';
import { Alert, Modal, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { colors, sharedStyles } from '../theme';
import {
  formatEntryDate,
  formatEntryTime,
  parseLocalDateTime,
  toLocalDateInput,
  toLocalTimeInput,
} from '../utils/dateTime';
import { FormField } from './FormField';
import { PrimaryButton } from './PrimaryButton';

interface TimelineEntryCardProps {
  entry: PatientEntry;
  onDelete: (entryId: string) => Promise<void>;
  onUpdateTimestamp: (entryId: string, occurredAt: string) => Promise<boolean>;
}

export function TimelineEntryCard({ entry, onDelete, onUpdateTimestamp }: TimelineEntryCardProps) {
  const locale = DEFAULT_LOCALE;
  const originalTimestamp = new Date(entry.occurredAt);
  const [editorOpen, setEditorOpen] = useState(false);
  const [date, setDate] = useState(toLocalDateInput(originalTimestamp));
  const [time, setTime] = useState(toLocalTimeInput(originalTimestamp));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const kindLabel = t(locale, `entry.kind.${entry.kind}` as TranslationKey);
  const entryLabel = entry.text ?? kindLabel;

  async function saveTimestamp() {
    const occurredAt = parseLocalDateTime(date, time);

    if (!occurredAt) {
      setError(t(locale, 'entry.timestampError'));
      return;
    }

    setBusy(true);
    setError(null);
    const updated = await onUpdateTimestamp(entry.id, occurredAt);
    setBusy(false);

    if (updated) {
      setEditorOpen(false);
    } else {
      setError(t(locale, 'entry.updateError'));
    }
  }

  function confirmDelete() {
    Alert.alert(t(locale, 'entry.deleteTitle'), t(locale, 'entry.deleteConfirm'), [
      { text: t(locale, 'common.cancel'), style: 'cancel' },
      {
        text: t(locale, 'common.delete'),
        style: 'destructive',
        onPress: () => void onDelete(entry.id),
      },
    ]);
  }

  return (
    <>
      <View style={styles.card}>
        <View style={styles.timestamp}>
          <Text style={styles.date}>{formatEntryDate(entry.occurredAt, locale)}</Text>
          <Text style={styles.time}>{formatEntryTime(entry.occurredAt, locale)}</Text>
        </View>
        <Text selectable style={styles.entryText}>
          {entryLabel}
        </Text>
        {entry.text && entry.kind !== 'text' ? (
          <Text selectable style={styles.entryKind}>
            {kindLabel}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <View style={styles.action}>
            <PrimaryButton
              label={t(locale, 'common.edit')}
              onPress={() => setEditorOpen(true)}
              variant="secondary"
            />
          </View>
          <View style={styles.action}>
            <PrimaryButton
              label={t(locale, 'common.delete')}
              onPress={confirmDelete}
              variant="danger"
            />
          </View>
        </View>
      </View>

      <Modal animationType="slide" onRequestClose={() => setEditorOpen(false)} visible={editorOpen}>
        <SafeAreaView style={sharedStyles.screen}>
          <View style={sharedStyles.scrollContent}>
            <Text style={sharedStyles.heading}>{t(locale, 'common.edit')}</Text>
            <FormField
              autoCapitalize="none"
              label={t(locale, 'entry.date')}
              onChangeText={setDate}
              value={date}
            />
            <FormField
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
              label={t(locale, 'entry.time')}
              onChangeText={setTime}
              value={time}
            />
            {error ? <Text style={sharedStyles.error}>{error}</Text> : null}
            <PrimaryButton
              busy={busy}
              label={t(locale, 'common.save')}
              onPress={() => void saveTimestamp()}
            />
            <PrimaryButton
              label={t(locale, 'common.cancel')}
              onPress={() => setEditorOpen(false)}
              variant="secondary"
            />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  timestamp: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  date: {
    flex: 1,
    color: colors.accent,
    fontSize: 15,
    fontWeight: '800',
  },
  time: {
    color: colors.mutedText,
    fontSize: 15,
    fontWeight: '700',
  },
  entryText: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 25,
  },
  entryKind: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
  },
});
