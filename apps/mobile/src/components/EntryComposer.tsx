import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { spacing } from '@project4/ui-tokens';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { sharedStyles } from '../theme';
import { parseLocalDateTime, toLocalDateInput, toLocalTimeInput } from '../utils/dateTime';
import { FormField } from './FormField';
import { PrimaryButton } from './PrimaryButton';

interface EntryComposerProps {
  busy: boolean;
  onCreate: (text: string, occurredAt: string) => Promise<boolean>;
}

export function EntryComposer({ busy, onCreate }: EntryComposerProps) {
  const locale = DEFAULT_LOCALE;
  const now = new Date();
  const [text, setText] = useState('');
  const [date, setDate] = useState(toLocalDateInput(now));
  const [time, setTime] = useState(toLocalTimeInput(now));
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!text.trim()) {
      setError(t(locale, 'entry.textRequired'));
      return;
    }

    const occurredAt = parseLocalDateTime(date, time);

    if (!occurredAt) {
      setError(t(locale, 'entry.timestampError'));
      return;
    }

    setError(null);
    const created = await onCreate(text, occurredAt);

    if (created) {
      const nextNow = new Date();
      setText('');
      setDate(toLocalDateInput(nextNow));
      setTime(toLocalTimeInput(nextNow));
    }
  }

  return (
    <View style={styles.composer}>
      <FormField
        label={t(locale, 'entry.placeholder')}
        multiline
        onChangeText={setText}
        placeholder={t(locale, 'entry.placeholder')}
        value={text}
      />
      <View style={styles.timestampRow}>
        <View style={styles.timestampField}>
          <FormField
            autoCapitalize="none"
            editable={false}
            label={t(locale, 'entry.date')}
            value={date}
          />
        </View>
        <View style={styles.timestampField}>
          <FormField
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
            label={t(locale, 'entry.time')}
            onChangeText={setTime}
            value={time}
          />
        </View>
      </View>
      {error ? <Text style={sharedStyles.error}>{error}</Text> : null}
      <PrimaryButton busy={busy} label={t(locale, 'entry.create')} onPress={() => void submit()} />
    </View>
  );
}

const styles = StyleSheet.create({
  composer: {
    gap: spacing.md,
  },
  timestampRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timestampField: {
    flex: 1,
    minWidth: 0,
  },
});
