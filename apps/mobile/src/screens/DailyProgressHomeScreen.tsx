import type { EntryKind, PatientEntry, UserProfile } from '@project4/contracts';
import { DEFAULT_LOCALE, t, type TranslationKey } from '@project4/i18n';
import { spacing } from '@project4/ui-tokens';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { colors, sharedStyles } from '../theme';
import { formatEntryTime, toLocalDateInput } from '../utils/dateTime';

interface DailyProgressHomeScreenProps {
  onOpenDaily: () => void;
  onOpenBaseline: () => void;
  onOpenExercise: () => void;
  onOpenFood: () => void;
  onOpenMedication: () => void;
  onOpenNotes: () => void;
  onOpenPeriod: () => void;
  onOpenStool: () => void;
  onOpenSymptoms: () => void;
  onSignOut: () => void | Promise<void>;
  canTrackMenstruation: boolean;
  dailyCompleted: boolean;
  exerciseCompleted: boolean;
  exerciseRequired: boolean;
  medicationCompleted: boolean;
  medicationRequired: boolean;
  symptomsCompleted: boolean;
  profile: UserProfile;
  recentEntries: PatientEntry[];
  error: string | null;
  loading: boolean;
}

interface QuickAction {
  id: 'daily' | 'food' | 'symptoms' | 'exercise' | 'stool' | 'medication' | 'period' | 'notes';
  icon: string;
  labelKey: TranslationKey;
}

const quickActions: QuickAction[] = [
  { id: 'daily', icon: '☀️', labelKey: 'home.action.daily' },
  { id: 'food', icon: '🍽️', labelKey: 'home.action.food' },
  { id: 'symptoms', icon: '⚠️', labelKey: 'home.action.symptoms' },
  { id: 'exercise', icon: '🏃', labelKey: 'home.action.exercise' },
  { id: 'stool', icon: '💩', labelKey: 'home.action.stool' },
  { id: 'medication', icon: '💊', labelKey: 'home.action.medication' },
  { id: 'period', icon: '🩸', labelKey: 'home.action.period' },
  { id: 'notes', icon: '📝', labelKey: 'home.action.notes' },
];

const entryIcons: Record<EntryKind, string> = {
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

const actionEntryKinds: Record<QuickAction['id'], EntryKind> = {
  daily: 'daily',
  food: 'meal',
  symptoms: 'symptom',
  exercise: 'exercise',
  stool: 'stool',
  medication: 'medication',
  period: 'menstruation',
  notes: 'note',
};

function greetingKey(hour: number): TranslationKey {
  if (hour < 12) return 'home.greeting.morning';
  if (hour < 18) return 'home.greeting.afternoon';
  return 'home.greeting.evening';
}

export function DailyProgressHomeScreen({
  onOpenDaily,
  onOpenBaseline,
  onOpenExercise,
  onOpenFood,
  onOpenMedication,
  onOpenNotes,
  onOpenPeriod,
  onOpenStool,
  onOpenSymptoms,
  onSignOut,
  canTrackMenstruation,
  dailyCompleted,
  exerciseCompleted,
  exerciseRequired,
  medicationCompleted,
  medicationRequired,
  symptomsCompleted,
  profile,
  recentEntries,
  error,
  loading,
}: DailyProgressHomeScreenProps) {
  const locale = DEFAULT_LOCALE;
  const { width } = useWindowDimensions();
  const now = new Date();
  const visibleQuickActions = canTrackMenstruation
    ? quickActions
    : quickActions.filter((action) => action.id !== 'period');
  const today = toLocalDateInput(now);
  const todayEntries = recentEntries
    .filter((entry) => toLocalDateInput(new Date(entry.occurredAt)) === today)
    .slice(0, 8);
  const completedKinds = new Set(todayEntries.map((entry) => entry.kind));
  const completedItems = visibleQuickActions.filter((action) =>
    action.id === 'daily' ? dailyCompleted : completedKinds.has(actionEntryKinds[action.id]),
  ).length;
  const progress = Math.round((completedItems / visibleQuickActions.length) * 100);
  const actionWidth = width < 360 ? '47%' : '22%';
  const displayName = profile.displayName?.trim() || t(locale, 'role.patient');
  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(now);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      style={sharedStyles.screen}
    >
      <View style={styles.topBar}>
        <View />
        <View style={styles.accountActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => void onSignOut()}
            style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}
          >
            <Text style={styles.signOutLabel}>{t(locale, 'auth.signOut')}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={t(locale, 'baseline.open')}
            accessibilityRole="button"
            onPress={onOpenBaseline}
            style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
          >
            <Text style={styles.avatarText}>{displayName.slice(0, 2).toUpperCase()}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.greetingBlock}>
        <Text style={styles.date}>{dateLabel}</Text>
        <Text style={styles.greeting}>
          {t(locale, greetingKey(now.getHours()))}, {displayName}
        </Text>
      </View>

      {error ? <Text style={sharedStyles.error}>{error}</Text> : null}

      <View style={styles.progressCard}>
        <View style={styles.progressCircle}>
          <Text style={styles.progressValue}>{progress}%</Text>
        </View>
        <View style={styles.progressCopy}>
          <Text style={styles.progressTitle}>{t(locale, 'home.progress.title')}</Text>
          <Text style={styles.progressDetail}>
            {t(locale, 'home.progress.items')
              .replace('{completed}', String(completedItems))
              .replace('{total}', String(visibleQuickActions.length))}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t(locale, 'home.quickActions')}</Text>
        <View style={styles.actionGrid}>
          {visibleQuickActions.map((action) => {
            const onPress =
              action.id === 'daily'
                ? onOpenDaily
                : action.id === 'symptoms'
                  ? onOpenSymptoms
                  : action.id === 'exercise'
                    ? onOpenExercise
                    : action.id === 'food'
                      ? onOpenFood
                      : action.id === 'stool'
                        ? onOpenStool
                        : action.id === 'medication'
                          ? onOpenMedication
                          : action.id === 'period'
                            ? onOpenPeriod
                            : onOpenNotes;
            const showExerciseStatus = action.id === 'exercise';
            const showMedicationStatus = action.id === 'medication';
            const showSymptomsCompleted = action.id === 'symptoms' && symptomsCompleted;
            const exerciseStatusKey = exerciseCompleted
              ? 'home.action.completed'
              : exerciseRequired
                ? 'home.action.required'
                : 'home.action.optional';
            const medicationStatusKey = medicationCompleted
              ? 'home.action.completed'
              : medicationRequired
                ? 'home.action.required'
                : 'home.action.optional';
            const actionRequired =
              (showExerciseStatus && exerciseRequired && !exerciseCompleted) ||
              (showMedicationStatus && medicationRequired && !medicationCompleted);

            return (
              <Pressable
                accessibilityLabel={t(locale, action.labelKey)}
                accessibilityRole="button"
                key={action.id}
                onPress={onPress}
                style={({ pressed }) => [
                  styles.actionCard,
                  styles.actionCardEnabled,
                  actionRequired && styles.actionCardRequired,
                  pressed && styles.actionCardPressed,
                  { flexBasis: actionWidth },
                ]}
              >
                <View style={styles.actionIconContainer}>
                  <Text style={styles.actionIcon}>{action.icon}</Text>
                </View>
                <Text numberOfLines={2} style={styles.actionLabel}>
                  {t(locale, action.labelKey)}
                </Text>
                {showExerciseStatus ? (
                  <Text
                    style={[
                      styles.actionStatus,
                      exerciseRequired && !exerciseCompleted && styles.actionStatusRequired,
                      exerciseCompleted && styles.actionStatusCompleted,
                    ]}
                  >
                    {t(locale, exerciseStatusKey)}
                  </Text>
                ) : null}
                {showMedicationStatus ? (
                  <Text
                    style={[
                      styles.actionStatus,
                      medicationRequired && !medicationCompleted && styles.actionStatusRequired,
                      medicationCompleted && styles.actionStatusCompleted,
                    ]}
                  >
                    {t(locale, medicationStatusKey)}
                  </Text>
                ) : null}
                {showSymptomsCompleted ? (
                  <Text style={[styles.actionStatus, styles.actionStatusCompleted]}>
                    {t(locale, 'home.action.completed')}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t(locale, 'home.recentEntries')}</Text>
        {loading ? (
          <ActivityIndicator color={colors.accent} size="large" />
        ) : todayEntries.length ? (
          <View style={styles.entryList}>
            {todayEntries.map((entry) => {
              const kindLabel = t(locale, `entry.kind.${entry.kind}` as TranslationKey);
              const entryCompleted = entry.kind !== 'daily' || dailyCompleted;
              return (
                <View key={entry.id} style={styles.entryCard}>
                  <View style={styles.entryIconContainer}>
                    <Text style={styles.entryIcon}>{entryIcons[entry.kind]}</Text>
                  </View>
                  <View style={styles.entryCopy}>
                    <Text numberOfLines={1} style={styles.entryTitle}>
                      {entry.text?.trim() || kindLabel}
                    </Text>
                    <Text style={styles.entryTime}>
                      {formatEntryTime(entry.occurredAt, locale)}
                    </Text>
                  </View>
                  <View style={styles.entryTrailing}>
                    <Text style={[styles.entryStatus, !entryCompleted && styles.entryStatusDraft]}>
                      {t(locale, entryCompleted ? 'home.action.completed' : 'daily.statusDraft')}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyEntries}>{t(locale, 'home.noEntriesToday')}</Text>
        )}
      </View>

      <View style={styles.submitBlock}>
        <PrimaryButton disabled label={t(locale, 'home.submit')} onPress={() => undefined} />
        <Text style={styles.submitHelp}>{t(locale, 'home.submitHelp')}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    gap: spacing.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pressed: { opacity: 0.7 },
  accountActions: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  signOutButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  signOutLabel: { color: colors.accent, fontSize: 13, fontWeight: '800' },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  greetingBlock: { gap: spacing.xs },
  date: {
    color: colors.mutedText,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  greeting: { color: colors.text, fontSize: 29, fontWeight: '800', lineHeight: 36 },
  progressCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  progressCircle: {
    alignItems: 'center',
    borderColor: colors.accent,
    borderRadius: 38,
    borderWidth: 7,
    height: 76,
    justifyContent: 'center',
    width: 76,
  },
  progressValue: {
    color: colors.text,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  progressCopy: { flex: 1, gap: spacing.xs },
  progressTitle: { color: colors.text, fontSize: 19, fontWeight: '800' },
  progressDetail: { color: colors.mutedText, fontSize: 15, lineHeight: 21 },
  section: { gap: spacing.md },
  sectionTitle: {
    color: colors.mutedText,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexGrow: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 108,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.md,
  },
  actionCardEnabled: { borderColor: colors.accent },
  actionCardRequired: { backgroundColor: '#fff4e5', borderColor: '#d97706' },
  actionCardPressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  actionIconContainer: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  actionIcon: { fontSize: 24 },
  actionLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
    textAlign: 'center',
  },
  actionStatus: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  actionStatusRequired: { color: '#b42318' },
  actionStatusCompleted: { color: '#16794b' },
  entryList: { gap: spacing.sm },
  entryCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 68,
    padding: spacing.sm,
  },
  entryIconContainer: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  entryIcon: { fontSize: 21 },
  entryCopy: { flex: 1, gap: 2 },
  entryTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  entryTime: { color: colors.mutedText, fontSize: 13, fontWeight: '600' },
  entryTrailing: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  entryStatus: { color: '#16794b', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  entryStatusDraft: { color: '#a15c00' },
  emptyEntries: { color: colors.mutedText, fontSize: 14, lineHeight: 20 },
  submitBlock: { gap: spacing.sm, marginTop: 'auto' },
  submitHelp: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
