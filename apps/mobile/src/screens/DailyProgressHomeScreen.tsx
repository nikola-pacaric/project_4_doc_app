import { ActivityIndicator, Platform, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { EntryKind, PatientEntry, UserProfile } from '@project4/contracts';
import { DEFAULT_LOCALE, t, type TranslationKey } from '@project4/i18n';
import { spacing } from '@project4/ui-tokens';

import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { CircularProgress } from '../components/CircularProgress';
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
  onOpenEntry: (entry: PatientEntry) => void;
  onOpenTimeline: () => void;
  onSubmitDay: () => void | Promise<void>;
  onSignOut: () => void | Promise<void>;
  canTrackMenstruation: boolean;
  dailyCompleted: boolean;
  dailyReadyToSubmit: boolean;
  exerciseCompleted: boolean;
  exerciseRequired: boolean;
  medicationCompleted: boolean;
  completeMealEntryIds: string[];
  completeMedicationEntryIds: string[];
  medicationRequired: boolean;
  periodCompleted: boolean;
  periodRequired: boolean;
  stoolCompleted: boolean;
  symptomsCompleted: boolean;
  foodCompleted: boolean;
  foodStarted: boolean;
  profile: UserProfile;
  pendingEntryIds?: string[];
  recentEntries: PatientEntry[];
  error: string | null;
  loading: boolean;
  offlineMode: boolean;
  submitDisabled: boolean;
  submitBusy: boolean;
  submitHelp: string;
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
  fluid: '🥤',
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

function fitTextSize(
  text: string,
  availableWidth: number,
  maxSize: number,
  minSize: number,
  widthFactor = 0.6,
): number {
  const longestWord = text
    .split(/\s+/)
    .map((word) => word.trim().length)
    .reduce((max, length) => Math.max(max, length), 1);
  const sizeForWidth = Math.floor(availableWidth / Math.max(1, longestWord * widthFactor));
  return Math.max(minSize, Math.min(maxSize, sizeForWidth));
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
  onOpenEntry,
  onOpenTimeline,
  onSubmitDay,
  onSignOut,
  canTrackMenstruation,
  dailyCompleted,
  dailyReadyToSubmit,
  exerciseCompleted,
  exerciseRequired,
  medicationCompleted,
  completeMealEntryIds,
  completeMedicationEntryIds,
  medicationRequired,
  periodCompleted,
  periodRequired,
  stoolCompleted,
  symptomsCompleted,
  foodCompleted,
  foodStarted,
  profile,
  pendingEntryIds = [],
  recentEntries,
  error,
  loading,
  offlineMode,
  submitDisabled,
  submitBusy,
  submitHelp,
}: DailyProgressHomeScreenProps) {
  const locale = DEFAULT_LOCALE;
  const { width } = useWindowDimensions();
  const now = new Date();
  const visibleQuickActions = canTrackMenstruation
    ? quickActions
    : quickActions.filter((action) => action.id !== 'period');
  const progressActions = visibleQuickActions.filter((action) => {
    if (action.id === 'notes') return false;
    if (action.id === 'exercise') return exerciseRequired;
    if (action.id === 'medication') return medicationRequired;
    if (action.id === 'period') return periodRequired;
    return true;
  });
  const today = toLocalDateInput(now);
  const allTodayEntries = recentEntries.filter(
    (entry) => toLocalDateInput(new Date(entry.occurredAt)) === today,
  );
  const todayEntries = allTodayEntries.slice(0, 8);
  const pendingIds = new Set(pendingEntryIds);
  const completeMealIds = new Set(completeMealEntryIds);
  const completeMedicationIds = new Set(completeMedicationEntryIds);
  const completedKinds = new Set(allTodayEntries.map((entry) => entry.kind));
  const completedItems = progressActions.filter((action) =>
    action.id === 'daily'
      ? dailyCompleted || dailyReadyToSubmit
      : action.id === 'stool'
        ? stoolCompleted
        : action.id === 'food'
          ? foodCompleted
          : completedKinds.has(actionEntryKinds[action.id]),
  ).length;
  const progress = Math.round((completedItems / progressActions.length) * 100);
  const actionColumns = 4;
  const isSmallPhone = width < 360;
  const isVerySmallPhone = width < 330;
  const horizontalPadding = isSmallPhone ? spacing.md : spacing.lg;
  const actionGridWidth = width - horizontalPadding * 2 - spacing.sm * (actionColumns - 1);
  const actionCardWidth = Math.min(112, actionGridWidth / actionColumns);
  const actionCardHeight = actionCardWidth;
  const actionCardScale = Math.max(0.68, Math.min(1, actionCardWidth / 112));
  const actionCardPadding = Math.max(3, Math.round(actionCardWidth * 0.06));
  const actionCardGap = Math.max(1, Math.round(actionCardWidth * 0.035));
  const actionIconBoxSize = Math.round(actionCardWidth * 0.27);
  const actionIconFontSize = Math.round(actionIconBoxSize * 0.58);
  const actionTextWidth = actionCardWidth - actionCardPadding * 2;
  const actionStatusSlotHeight = Math.round(actionCardHeight * 0.13);
  const actionLabelSlotHeight =
    actionCardHeight -
    actionCardPadding * 2 -
    actionIconBoxSize -
    actionStatusSlotHeight -
    actionCardGap * 2;
  const displayName = profile.displayName?.trim() || t(locale, 'role.patient');
  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(now);
  const submitHelpIsList = submitHelp.includes('\n- ');

  return (
    <SafeAreaView style={[sharedStyles.screen, styles.safeArea]}>
      <KeyboardAwareScrollView
        keyboardDismissMode="on-drag"
        contentContainerStyle={[
          styles.content,
          isSmallPhone && styles.contentCompact,
        ]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        style={sharedStyles.screen}
      >
        <View style={styles.headerGroup}>
          <View style={[styles.topBar, isVerySmallPhone && styles.topBarStacked]}>
            <View style={styles.greetingBlock}>
              <Text style={styles.date}>{dateLabel}</Text>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.82}
                numberOfLines={1}
                style={[styles.greeting, isSmallPhone && styles.greetingCompact]}
              >
                {t(locale, greetingKey(now.getHours()))},
              </Text>
              <Text
                style={[styles.greetingName, isSmallPhone && styles.greetingNameCompact]}
                numberOfLines={2}
              >
                {displayName}
              </Text>
            </View>
            <View style={[styles.accountActions, isVerySmallPhone && styles.accountActionsStacked]}>
              <Pressable
                accessibilityRole="button"
                onPress={() => void onSignOut()}
                style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}
              >
                <Text style={styles.signOutLabel}>{t(locale, 'auth.signOut')}</Text>
              </Pressable>
              <Pressable
                accessibilityLabel={t(locale, 'baseline.open')}
                accessibilityHint={offlineMode ? t(locale, 'offline.actionsDisabled') : undefined}
                accessibilityRole="button"
                accessibilityState={{ disabled: offlineMode }}
                disabled={offlineMode}
                onPress={onOpenBaseline}
                style={({ pressed }) => [
                  styles.avatar,
                  offlineMode && styles.avatarDisabled,
                  pressed && !offlineMode && styles.pressed,
                ]}
              >
                <Text style={styles.avatarText}>{displayName.slice(0, 2).toUpperCase()}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {error ? <Text style={sharedStyles.error}>{error}</Text> : null}

        <View style={styles.progressCard}>
          <CircularProgress progress={progress} size={76} strokeWidth={7}>
            <Text style={styles.progressValue}>{progress}%</Text>
          </CircularProgress>
          <View style={styles.progressCopy}>
            <Text style={styles.progressTitle}>{t(locale, 'home.progress.title')}</Text>
            <Text style={styles.progressDetail}>
              {t(locale, 'home.progress.items')
                .replace('{completed}', String(completedItems))
                .replace('{total}', String(progressActions.length))}
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
              const showPeriodStatus = action.id === 'period';
              const showStoolCompleted = action.id === 'stool' && stoolCompleted;
              const showDailyCompleted = action.id === 'daily' && dailyCompleted;
              const showDailyReady = action.id === 'daily' && !dailyCompleted && dailyReadyToSubmit;
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
              const periodStatusKey = periodCompleted
                ? 'home.action.completed'
                : periodRequired
                  ? 'home.action.required'
                  : 'home.action.optional';
              const actionRequired =
                (showExerciseStatus && exerciseRequired && !exerciseCompleted) ||
                (showMedicationStatus && medicationRequired && !medicationCompleted) ||
                (showPeriodStatus && periodRequired && !periodCompleted);
              const offlineDisabled = offlineMode && action.id !== 'notes';
              const actionLabel = t(locale, action.labelKey);
              let actionStatusText: string | null = null;
              let actionStatusStyle = null;

              if (offlineDisabled) {
                actionStatusText = t(locale, 'offline.onlyNotes');
                actionStatusStyle = styles.actionStatusOffline;
              } else if (showExerciseStatus) {
                actionStatusText = t(locale, exerciseStatusKey);
                actionStatusStyle =
                  exerciseRequired && !exerciseCompleted
                    ? styles.actionStatusRequired
                    : exerciseCompleted
                      ? styles.actionStatusCompleted
                      : null;
              } else if (showMedicationStatus) {
                actionStatusText = t(locale, medicationStatusKey);
                actionStatusStyle =
                  medicationRequired && !medicationCompleted
                    ? styles.actionStatusRequired
                    : medicationCompleted
                      ? styles.actionStatusCompleted
                      : null;
              } else if (showPeriodStatus) {
                actionStatusText = t(locale, periodStatusKey);
                actionStatusStyle =
                  periodRequired && !periodCompleted
                    ? styles.actionStatusRequired
                    : periodCompleted
                      ? styles.actionStatusCompleted
                      : null;
              } else if (action.id === 'food') {
                if (foodCompleted) {
                  actionStatusText = t(locale, 'home.action.completed');
                  actionStatusStyle = styles.actionStatusCompleted;
                } else if (foodStarted) {
                  actionStatusText = t(locale, 'daily.statusDraft');
                  actionStatusStyle = styles.actionStatusDraft;
                }
              } else if (
                showDailyCompleted ||
                showDailyReady ||
                showStoolCompleted ||
                showSymptomsCompleted
              ) {
                actionStatusText = t(locale, 'home.action.completed');
                actionStatusStyle = styles.actionStatusCompleted;
              }

              const maxLabelSizeByHeight = Math.floor(actionLabelSlotHeight / 2) - 1;
              const actionLabelFontSize = Math.min(
                fitTextSize(actionLabel, actionTextWidth, 12, 7.5),
                Math.max(7.5, maxLabelSizeByHeight),
              );
              const actionLabelLineHeight = Math.max(
                9,
                Math.floor(actionLabelSlotHeight / 2),
              );
              const actionStatusFontSize = actionStatusText
                ? Math.min(
                    fitTextSize(actionStatusText, actionTextWidth, 10, 7, 0.64),
                    Math.max(7, actionStatusSlotHeight - 3),
                  )
                : 10;
              const actionStatusLineHeight = Math.max(8, actionStatusSlotHeight);

              return (
                <Pressable
                  accessibilityLabel={actionLabel}
                  accessibilityHint={
                    offlineDisabled ? t(locale, 'offline.actionsDisabled') : undefined
                  }
                  accessibilityRole="button"
                  accessibilityState={{ disabled: offlineDisabled }}
                  disabled={offlineDisabled}
                  key={action.id}
                  onPress={onPress}
                  style={({ pressed }) => [
                    styles.actionCard,
                    styles.actionCardEnabled,
                    actionRequired && styles.actionCardRequired,
                    offlineDisabled && styles.actionCardDisabled,
                    pressed && !offlineDisabled && styles.actionCardPressed,
                    {
                      gap: actionCardGap,
                      height: actionCardHeight,
                      paddingHorizontal: actionCardPadding,
                      paddingVertical: actionCardPadding,
                      width: actionCardWidth,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.actionIconContainer,
                      {
                        borderRadius: actionIconBoxSize / 2,
                        height: actionIconBoxSize,
                        width: actionIconBoxSize,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.actionIcon,
                        { fontSize: actionIconFontSize, lineHeight: actionIconBoxSize },
                      ]}
                    >
                      {action.icon}
                    </Text>
                  </View>
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                    numberOfLines={2}
                    style={[
                      styles.actionLabel,
                      { fontSize: actionLabelFontSize, lineHeight: actionLabelLineHeight },
                    ]}
                  >
                    {actionLabel}
                  </Text>
                  {actionStatusText ? (
                    <Text
                      adjustsFontSizeToFit
                      minimumFontScale={0.72}
                      numberOfLines={1}
                      style={[
                        styles.actionStatus,
                        {
                          fontSize: actionStatusFontSize,
                          lineHeight: actionStatusLineHeight,
                        },
                        actionStatusStyle,
                      ]}
                    >
                      {actionStatusText}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t(locale, 'home.recentEntries')}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={onOpenTimeline}
              style={({ pressed }) => [styles.viewAllButton, pressed && styles.pressed]}
            >
              <Text style={styles.viewAllLabel}>{t(locale, 'home.viewAll')}</Text>
            </Pressable>
          </View>
          {loading ? (
            <ActivityIndicator color={colors.accent} size="large" />
          ) : todayEntries.length ? (
            <View style={styles.entryList}>
              {todayEntries.map((entry) => {
                const kindLabel = t(locale, `entry.kind.${entry.kind}` as TranslationKey);
                const dailyEntryReady = entry.kind === 'daily' && dailyReadyToSubmit;
                const entryPending = pendingIds.has(entry.id);
                const entryOfflineDisabled = offlineMode && entry.kind !== 'note' && entry.kind !== 'text';
                const entryCompleted =
                  entry.kind === 'daily'
                    ? dailyCompleted
                    : entry.kind === 'meal'
                      ? completeMealIds.has(entry.id) && foodCompleted
                    : entry.kind === 'medication'
                      ? completeMedicationIds.has(entry.id)
                      : true;
                const statusKey =
                  entryPending
                    ? 'sync.pending'
                    : entryOfflineDisabled
                    ? 'offline.onlyNotes'
                    : entryCompleted || dailyEntryReady
                    ? 'home.action.completed'
                    : 'daily.statusDraft';
                return (
                  <Pressable
                    accessibilityHint={
                      entryOfflineDisabled
                        ? t(locale, 'offline.actionsDisabled')
                        : t(locale, 'home.entryOpenHint')
                    }
                    accessibilityRole="button"
                    accessibilityState={{ disabled: entryPending || entryOfflineDisabled }}
                    disabled={entryPending || entryOfflineDisabled}
                    key={entry.id}
                    onPress={() => {
                      if (!entryPending && !entryOfflineDisabled) onOpenEntry(entry);
                    }}
                    style={({ pressed }) => [
                      styles.entryCard,
                      entryOfflineDisabled && styles.entryCardDisabled,
                      pressed && !entryPending && !entryOfflineDisabled && styles.pressed,
                    ]}
                  >
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
                      <Text
                        style={[
                          styles.entryStatus,
                          entryPending && styles.entryStatusPending,
                          !entryCompleted && !dailyEntryReady && styles.entryStatusDraft,
                          entryOfflineDisabled && styles.entryStatusOffline,
                        ]}
                      >
                        {t(locale, statusKey)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyEntries}>{t(locale, 'home.noEntriesToday')}</Text>
          )}
        </View>

        <View style={styles.submitBlock}>
          <PrimaryButton
            busy={submitBusy}
            disabled={submitDisabled}
            label={t(locale, dailyCompleted ? 'home.submitCompleted' : 'home.submit')}
            onPress={() => void onSubmitDay()}
            variant={dailyCompleted ? 'secondary' : 'primary'}
          />
          <Text
            style={[
              styles.submitHelp,
              submitHelpIsList && styles.submitHelpList,
              dailyCompleted && styles.submitHelpCompleted,
            ]}
          >
            {submitHelp}
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  content: {
    flexGrow: 1,
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl + spacing.lg,
  },
  contentCompact: {
    padding: spacing.md,
    paddingBottom: spacing.xl + spacing.md,
  },
  headerGroup: {
    gap: spacing.md,
  },
  topBar: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  topBarStacked: {
    alignItems: 'stretch',
    flexDirection: 'column',
  },
  pressed: { opacity: 0.7 },
  accountActions: {
    alignItems: 'flex-end',
    flexShrink: 0,
    gap: spacing.sm,
  },
  accountActionsStacked: {
    alignSelf: 'flex-end',
  },
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
  greetingBlock: {
    flex: 1,
    flexBasis: '64%',
    gap: spacing.xs,
    minWidth: 0,
    paddingTop: spacing.xs,
  },
  date: {
    color: colors.mutedText,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  greeting: { color: colors.text, fontSize: 25, fontWeight: '800', lineHeight: 30 },
  greetingCompact: { fontSize: 23, lineHeight: 28 },
  greetingName: { color: colors.text, fontSize: 27, fontWeight: '800', lineHeight: 32 },
  greetingNameCompact: { fontSize: 24, lineHeight: 29 },
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
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.mutedText,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  viewAllButton: {
    alignItems: 'center',
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  viewAllLabel: { color: colors.accent, fontSize: 13, fontWeight: '800' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.xs,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  actionCardEnabled: { borderColor: colors.accent },
  actionCardRequired: { backgroundColor: '#fff4e5', borderColor: '#d97706' },
  actionCardDisabled: {
    backgroundColor: '#f2ecee',
    borderColor: colors.border,
    opacity: 0.48,
  },
  avatarDisabled: { backgroundColor: colors.border, opacity: 0.55 },
  actionCardPressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  actionIconContainer: {
    alignItems: 'center',
    backgroundColor: colors.background,
    justifyContent: 'center',
  },
  actionIcon: { lineHeight: 22 },
  actionLabel: {
    alignSelf: 'stretch',
    color: colors.text,
    fontWeight: '700',
    lineHeight: 15,
    textAlign: 'center',
  },
  actionStatus: {
    alignSelf: 'stretch',
    color: colors.mutedText,
    fontWeight: '800',
    lineHeight: 12,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  actionStatusRequired: { color: '#b42318' },
  actionStatusCompleted: { color: '#16794b' },
  actionStatusOffline: { color: colors.mutedText },
  actionStatusDraft: { color: '#a15c00' },
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
  entryStatusPending: { color: '#a15c00' },
  entryStatusOffline: { color: colors.mutedText },
  entryCardDisabled: { opacity: 0.52 },
  emptyEntries: { color: colors.mutedText, fontSize: 14, lineHeight: 20 },
  submitBlock: { gap: spacing.sm, marginTop: 'auto' },
  submitHelp: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  submitHelpList: {
    alignSelf: 'stretch',
    textAlign: 'left',
  },
  submitHelpCompleted: { color: '#16794b', fontWeight: '700' },
});
