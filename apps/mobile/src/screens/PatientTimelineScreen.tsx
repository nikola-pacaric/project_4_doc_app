import { isNoStoolTodayEntry, type PatientEntry } from '@project4/contracts';
import { DEFAULT_LOCALE, t, type TranslationKey } from '@project4/i18n';
import { spacing } from '@project4/ui-tokens';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, sharedStyles } from '../theme';
import { formatEntryDate, formatEntryTime } from '../utils/dateTime';

interface PatientTimelineScreenProps {
  entries: PatientEntry[];
  error: string | null;
  loading: boolean;
  onBack: () => void;
  onRefresh: () => void | Promise<void>;
}

const entryIcons: Record<PatientEntry['kind'], string> = {
  text: '📝',
  daily: '☀️',
  meal: '🍽️',
  symptom: '⚠️',
  stool: '💩',
  medication: '💊',
  exercise: '🏃',
  menstruation: '🩸',
  note: '📝',
  custom: '📋',
};

export function PatientTimelineScreen({
  entries,
  error,
  loading,
  onBack,
  onRefresh,
}: PatientTimelineScreenProps) {
  const locale = DEFAULT_LOCALE;

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScrollView
        contentContainerStyle={sharedStyles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
      >
        <ScreenHeader eyebrow={t(locale, 'role.patient')} title={t(locale, 'timeline.title')} />

        <View style={styles.actions}>
          <View style={styles.action}>
            <PrimaryButton
              label={t(locale, 'common.back')}
              onPress={onBack}
              variant="secondary"
            />
          </View>
          <View style={styles.action}>
            <PrimaryButton
              label={t(locale, 'timeline.refresh')}
              onPress={() => void onRefresh()}
              variant="secondary"
            />
          </View>
        </View>

        {error ? <Text style={sharedStyles.error}>{error}</Text> : null}
        {loading ? <ActivityIndicator color={colors.accent} size="large" /> : null}
        {!loading && !entries.length ? (
          <Text style={styles.empty}>{t(locale, 'entry.empty')}</Text>
        ) : null}

        <View style={styles.list}>
          {entries.map((entry) => {
            const kindLabel = t(locale, `entry.kind.${entry.kind}` as TranslationKey);
            const title = isNoStoolTodayEntry(entry)
              ? t(locale, 'stool.noStoolToday')
              : entry.text?.trim() || kindLabel;

            return (
              <View key={entry.id} style={styles.card}>
                <View style={styles.iconContainer}>
                  <Text style={styles.icon}>{entryIcons[entry.kind]}</Text>
                </View>
                <View style={styles.copy}>
                  <Text style={styles.title}>{title}</Text>
                  <Text style={styles.meta}>
                    {formatEntryDate(entry.occurredAt, locale)} -{' '}
                    {formatEntryTime(entry.occurredAt, locale)}
                  </Text>
                  {entry.text && !isNoStoolTodayEntry(entry) ? (
                    <Text style={styles.kind}>{kindLabel}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: { flex: 1 },
  empty: { color: colors.mutedText, fontSize: 15, lineHeight: 22 },
  list: { gap: spacing.sm },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 76,
    padding: spacing.md,
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  icon: { fontSize: 21 },
  copy: { flex: 1, gap: 3 },
  title: { color: colors.text, fontSize: 16, fontWeight: '800', lineHeight: 22 },
  meta: { color: colors.mutedText, fontSize: 13, fontWeight: '600' },
  kind: { color: colors.accent, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
});
