import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  ENTRY_KIND_ICONS,
  ENTRY_KIND_ICON_STYLES,
  entryKindIcon,
  entryKindIconStyle,
  type EntryKind,
  type PatientEntry,
  type UserProfile,
} from '@project4/contracts';
import { getActiveLocale, t, type TranslationKey } from '@project4/i18n';
import { darkTheme } from '@project4/ui-tokens';

import { CircularProgress } from '../components/CircularProgress';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { PatientBottomNav } from '../components/PatientBottomNav';
import { StatusMessage } from '../components/StatusMessage';
import { colors } from '../theme';
import { formatEntryTime, toLocalDateInput } from '../utils/dateTime';

/**
 * Stitch "Dashboard - Modern Redesign" / Tactile Bloom tokens.
 * Scoped to the mobile patient home only so other surfaces stay unchanged.
 */
const stitch = {
  background: '#fdf8fd',
  surface: '#ffffff',
  surfaceContainer: '#f1ecf2',
  surfaceContainerLow: '#f7f2f8',
  secondaryContainer: '#fcdae1',
  primary: '#a63553',
  primaryContainer: '#f4718f',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#6b022a',
  onSurface: '#1c1b1f',
  onSurfaceVariant: '#564145',
  outlineVariant: '#dcbfc3',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  success: '#16a34a',
  successSoft: '#f0fdf4',
  shadow: 'rgba(166, 53, 83, 0.08)',
} as const;

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
  onOpenSettings: () => void;
  onSubmitDay: () => void | Promise<void>;
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
  id: 'daily' | 'food' | 'symptoms' | 'stool' | 'medication' | 'exercise' | 'period' | 'notes';
  icon: string;
  labelKey: TranslationKey;
  iconColor: string;
  iconBg: string;
}

const actionEntryKinds: Record<QuickAction['id'], EntryKind> = {
  daily: 'daily',
  food: 'meal',
  symptoms: 'symptom',
  stool: 'stool',
  medication: 'medication',
  exercise: 'exercise',
  period: 'menstruation',
  notes: 'note',
};

const quickActions: QuickAction[] = [
  {
    id: 'daily',
    icon: ENTRY_KIND_ICONS.daily,
    labelKey: 'home.action.daily',
    iconColor: ENTRY_KIND_ICON_STYLES.daily.color,
    iconBg: ENTRY_KIND_ICON_STYLES.daily.background,
  },
  {
    id: 'food',
    icon: ENTRY_KIND_ICONS.meal,
    labelKey: 'home.action.food',
    iconColor: ENTRY_KIND_ICON_STYLES.meal.color,
    iconBg: ENTRY_KIND_ICON_STYLES.meal.background,
  },
  {
    id: 'symptoms',
    icon: ENTRY_KIND_ICONS.symptom,
    labelKey: 'home.action.symptoms',
    iconColor: ENTRY_KIND_ICON_STYLES.symptom.color,
    iconBg: ENTRY_KIND_ICON_STYLES.symptom.background,
  },
  {
    id: 'stool',
    icon: ENTRY_KIND_ICONS.stool,
    labelKey: 'home.action.stool',
    iconColor: ENTRY_KIND_ICON_STYLES.stool.color,
    iconBg: ENTRY_KIND_ICON_STYLES.stool.background,
  },
  {
    id: 'medication',
    icon: ENTRY_KIND_ICONS.medication,
    labelKey: 'home.action.medication',
    iconColor: ENTRY_KIND_ICON_STYLES.medication.color,
    iconBg: ENTRY_KIND_ICON_STYLES.medication.background,
  },
  {
    id: 'exercise',
    icon: ENTRY_KIND_ICONS.exercise,
    labelKey: 'home.action.exercise',
    iconColor: ENTRY_KIND_ICON_STYLES.exercise.color,
    iconBg: ENTRY_KIND_ICON_STYLES.exercise.background,
  },
  {
    id: 'period',
    icon: ENTRY_KIND_ICONS.menstruation,
    labelKey: 'home.action.period',
    iconColor: ENTRY_KIND_ICON_STYLES.menstruation.color,
    iconBg: ENTRY_KIND_ICON_STYLES.menstruation.background,
  },
  {
    id: 'notes',
    icon: ENTRY_KIND_ICONS.note,
    labelKey: 'home.action.notes',
    iconColor: ENTRY_KIND_ICON_STYLES.note.color,
    iconBg: ENTRY_KIND_ICON_STYLES.note.background,
  },
];

function greetingKey(hour: number): TranslationKey {
  if (hour < 12) return 'home.greeting.morning';
  if (hour < 18) return 'home.greeting.afternoon';
  return 'home.greeting.evening';
}

function isDarkThemeActive(): boolean {
  return colors.background === darkTheme.colors.background;
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
  onOpenSettings,
  onSubmitDay,
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
  const locale = getActiveLocale();
  const { width } = useWindowDimensions();
  const dark = isDarkThemeActive();
  const palette = dark
    ? {
        background: colors.background,
        surface: colors.surface,
        surfaceContainer: colors.surfaceAlt,
        secondaryContainer: colors.surfaceAlt,
        primary: colors.accentStrong,
        primaryContainer: colors.accent,
        onPrimary: colors.onAccent,
        onPrimaryContainer: colors.onAccent,
        onSurface: colors.text,
        onSurfaceVariant: colors.mutedText,
        outlineVariant: colors.border,
        error: colors.danger,
        errorContainer: colors.surfaceAlt,
        onErrorContainer: colors.danger,
        success: colors.accentStrong,
        successSoft: colors.surfaceAlt,
        shadow: '#000000',
      }
    : stitch;

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
  const todayEntries = allTodayEntries.slice(0, 3);
  const pendingIds = new Set(pendingEntryIds);
  const completeMealIds = new Set(completeMealEntryIds);
  const completeMedicationIds = new Set(completeMedicationEntryIds);
  const completedKinds = new Set(allTodayEntries.map((entry) => entry.kind));
  const completedItems = progressActions.filter((action) => {
    if (action.id === 'daily') return dailyCompleted || dailyReadyToSubmit;
    if (action.id === 'stool') return stoolCompleted;
    if (action.id === 'food') return foodCompleted;
    return completedKinds.has(actionEntryKinds[action.id]);
  }).length;
  const progress = Math.round((completedItems / Math.max(progressActions.length, 1)) * 100);

  const horizontalPadding = 20;
  const gridGap = 8;
  const actionCardWidth = (width - horizontalPadding * 2 - gridGap * 3) / 4;
  const displayName = profile.displayName?.trim() || t(locale, 'role.patient');
  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(now);
  function actionIsCompleted(action: QuickAction): boolean {
    if (action.id === 'daily') return dailyCompleted || dailyReadyToSubmit;
    if (action.id === 'food') return foodCompleted;
    if (action.id === 'symptoms') return symptomsCompleted;
    if (action.id === 'stool') return stoolCompleted;
    if (action.id === 'medication') return medicationCompleted;
    if (action.id === 'exercise') return exerciseCompleted;
    if (action.id === 'period') return periodCompleted;
    return completedKinds.has('note');
  }

  function actionIsRequired(action: QuickAction): boolean {
    if (action.id === 'exercise') return exerciseRequired;
    if (action.id === 'medication') return medicationRequired;
    if (action.id === 'period') return periodRequired;
    return action.id !== 'notes';
  }

  function actionPress(action: QuickAction): () => void {
    if (action.id === 'daily') return onOpenDaily;
    if (action.id === 'food') return onOpenFood;
    if (action.id === 'symptoms') return onOpenSymptoms;
    if (action.id === 'stool') return onOpenStool;
    if (action.id === 'medication') return onOpenMedication;
    if (action.id === 'exercise') return onOpenExercise;
    if (action.id === 'period') return onOpenPeriod;
    return onOpenNotes;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: horizontalPadding, paddingBottom: 120 },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: palette.background }}
      >
        {/* Welcome */}
        <View style={styles.greetingBlock}>
          <Text style={[styles.date, { color: palette.onSurfaceVariant }]}>{dateLabel}</Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.82}
            numberOfLines={2}
            style={[styles.greeting, { color: palette.onSurface }]}
          >
            {t(locale, greetingKey(now.getHours()))}, {displayName}
          </Text>
        </View>

        {offlineMode ? (
          <View
            style={[
              styles.offlineNotice,
              {
                backgroundColor: dark ? palette.errorContainer : 'rgba(255, 218, 214, 0.3)',
                borderColor: dark ? palette.outlineVariant : 'rgba(186, 26, 26, 0.1)',
              },
            ]}
          >
            <Text style={[styles.offlineIcon, { color: palette.error }]}>☁</Text>
            <Text style={[styles.offlineText, { color: palette.onErrorContainer }]}>
              {t(locale, 'home.offlineNotice')}
            </Text>
          </View>
        ) : null}

        {error ? (
          <StatusMessage
            message={error}
            style={[styles.errorText, { color: palette.error }]}
            tone="error"
          />
        ) : null}

        {/* Daily progress bubble */}
        <View
          style={[
            styles.progressCard,
            {
              backgroundColor: palette.surface,
              shadowColor: palette.shadow,
            },
          ]}
        >
          <CircularProgress
            progress={progress}
            progressColor={palette.primary}
            size={96}
            strokeWidth={10}
            trackColor={palette.surfaceContainer}
          >
            <Text style={[styles.progressValue, { color: palette.primary }]}>{progress}%</Text>
          </CircularProgress>
          <View style={styles.progressCopy}>
            <Text style={[styles.progressTitle, { color: palette.onSurface }]}>
              {t(locale, 'home.progress.title')}
            </Text>
            <Text style={[styles.progressDetail, { color: palette.onSurfaceVariant }]}>
              {t(locale, 'home.progress.items')
                .replace('{completed}', String(completedItems))
                .replace('{total}', String(progressActions.length))}
            </Text>
          </View>
        </View>

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.onSurfaceVariant }]}>
            {t(locale, 'home.quickActions')}
          </Text>
          <View style={[styles.actionGrid, { gap: gridGap }]}>
            {visibleQuickActions.map((action) => {
              const completed = actionIsCompleted(action);
              const required = actionIsRequired(action);
              const offlineDisabled = offlineMode && action.id !== 'notes';
              const actionLabel = t(locale, action.labelKey);
              // Stitch highlights incomplete required clinical tiles (e.g. Medication) as Pending.
              const isPending =
                !completed &&
                ((action.id === 'medication' && medicationRequired) ||
                  (action.id === 'exercise' && exerciseRequired) ||
                  (action.id === 'period' && periodRequired));

              let statusKey: TranslationKey = required
                ? 'home.action.required'
                : 'home.action.optional';

              if (completed) statusKey = 'home.action.completed';
              else if (isPending) statusKey = 'home.action.pending';
              if (action.id === 'food' && foodStarted && !foodCompleted) {
                statusKey = 'daily.statusDraft';
              }
              if (offlineDisabled) statusKey = 'offline.onlyNotes';

              const highlightPending = isPending;

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
                  onPress={actionPress(action)}
                  style={({ pressed }) => [
                    styles.actionCard,
                    {
                      width: actionCardWidth,
                      backgroundColor: palette.surface,
                      borderColor: highlightPending
                        ? dark
                          ? palette.primary
                          : 'rgba(166, 53, 83, 0.3)'
                        : 'transparent',
                      shadowColor: palette.shadow,
                    },
                    offlineDisabled && styles.disabled,
                    pressed && !offlineDisabled && styles.actionCardPressed,
                  ]}
                >
                  <View
                    style={[
                      styles.actionIconContainer,
                      {
                        backgroundColor: dark ? palette.surfaceContainer : action.iconBg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.actionIcon,
                        { color: dark ? palette.primary : action.iconColor },
                      ]}
                    >
                      {action.icon}
                    </Text>
                  </View>
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                    numberOfLines={2}
                    style={[styles.actionLabel, { color: palette.onSurface }]}
                  >
                    {actionLabel}
                  </Text>
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                    numberOfLines={1}
                    style={[
                      styles.actionStatus,
                      { color: palette.onSurfaceVariant },
                      completed && { color: palette.success },
                      highlightPending && { color: palette.primary },
                      action.id === 'food' &&
                        foodStarted &&
                        !foodCompleted && { color: palette.onSurfaceVariant },
                    ]}
                  >
                    {t(locale, statusKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Recent entries */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.onSurfaceVariant }]}>
              {t(locale, 'home.recentEntries')}
            </Text>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={onOpenTimeline}
              style={({ pressed }) => [styles.viewAllButton, pressed && styles.pressed]}
            >
              <Text style={[styles.viewAllLabel, { color: palette.primary }]}>
                {t(locale, 'home.viewAll')}
              </Text>
            </Pressable>
          </View>
          {loading ? (
            <ActivityIndicator color={palette.primary} size="small" />
          ) : todayEntries.length ? (
            <View style={styles.entryList}>
              {todayEntries.map((entry) => {
                const kindLabel = t(locale, ('entry.kind.' + entry.kind) as TranslationKey);
                const kindIconStyle = entryKindIconStyle(entry.kind);
                const dailyEntryReady = entry.kind === 'daily' && dailyReadyToSubmit;
                const entryPending = pendingIds.has(entry.id);
                const entryOfflineDisabled =
                  offlineMode && entry.kind !== 'note' && entry.kind !== 'text';
                const entryCompleted =
                  entry.kind === 'daily'
                    ? dailyCompleted
                    : entry.kind === 'meal'
                      ? completeMealIds.has(entry.id) && foodCompleted
                      : entry.kind === 'medication'
                        ? completeMedicationIds.has(entry.id)
                        : true;
                const statusKey: TranslationKey = entryPending
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
                    onPress={() => onOpenEntry(entry)}
                    style={({ pressed }) => [
                      styles.entryCard,
                      {
                        backgroundColor: palette.surface,
                        borderColor: entryPending
                          ? dark
                            ? palette.primary
                            : 'rgba(166, 53, 83, 0.05)'
                          : 'transparent',
                        shadowColor: palette.shadow,
                      },
                      entryOfflineDisabled && styles.disabled,
                      pressed && !entryPending && !entryOfflineDisabled && styles.pressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.entryIconContainer,
                        {
                          backgroundColor: dark
                            ? palette.surfaceContainer
                            : kindIconStyle.background,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.entryIcon,
                          {
                            color: dark ? palette.primary : kindIconStyle.color,
                          },
                        ]}
                      >
                        {entryKindIcon(entry.kind)}
                      </Text>
                    </View>
                    <View style={styles.entryCopy}>
                      <Text
                        numberOfLines={1}
                        style={[styles.entryTitle, { color: palette.onSurface }]}
                      >
                        {entry.text?.trim() || kindLabel}
                      </Text>
                      <Text style={[styles.entryTime, { color: palette.onSurfaceVariant }]}>
                        {formatEntryTime(entry.occurredAt, locale)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.entryStatusPill,
                        {
                          backgroundColor: entryPending
                            ? palette.secondaryContainer
                            : entryCompleted || dailyEntryReady
                              ? palette.successSoft
                              : palette.surfaceContainer,
                        },
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.entryStatusText,
                          {
                            color: entryPending
                              ? dark
                                ? palette.onSurface
                                : '#775e64'
                              : entryCompleted || dailyEntryReady
                                ? palette.success
                                : palette.onSurfaceVariant,
                          },
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
            <Text style={[styles.emptyEntries, { color: palette.onSurfaceVariant }]}>
              {t(locale, 'home.noEntriesToday')}
            </Text>
          )}
        </View>

        {/* Submit day CTA */}
        <View style={styles.submitBlock}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: submitDisabled || submitBusy }}
            disabled={submitDisabled || submitBusy}
            onPress={() => void onSubmitDay()}
            style={({ pressed }) => [
              styles.submitButton,
              {
                backgroundColor: palette.primary,
                shadowColor: palette.primary,
              },
              (submitDisabled || submitBusy) && styles.disabled,
              pressed && !submitDisabled && !submitBusy && styles.submitPressed,
            ]}
          >
            {submitBusy ? (
              <ActivityIndicator color={palette.onPrimary} />
            ) : (
              <Text style={[styles.submitLabel, { color: palette.onPrimary }]}>
                {t(locale, dailyCompleted ? 'home.submitCompleted' : 'home.submit')}
              </Text>
            )}
          </Pressable>
          <Text
            style={[
              styles.submitHelp,
              { color: palette.onSurfaceVariant },
              dailyCompleted && { color: palette.primary, fontWeight: '700' },
            ]}
          >
            {submitHelp}
          </Text>
        </View>
      </KeyboardAwareScrollView>

      <PatientBottomNav
        active="today"
        onProfile={onOpenBaseline}
        onSettings={onOpenSettings}
        onTimeline={onOpenTimeline}
        onToday={() => undefined}
        palette={{
          background: dark ? colors.surface : 'rgba(241, 236, 242, 0.92)',
          onPrimaryContainer: dark ? palette.onPrimaryContainer : stitch.onPrimaryContainer,
          onSurfaceVariant: palette.onSurfaceVariant,
          primaryContainer: dark ? palette.primaryContainer : stitch.primaryContainer,
          shadow: palette.shadow,
        }}
        profileDisabled={offlineMode}
        profileDisabledHint={t(locale, 'offline.actionsDisabled')}
      />
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
    gap: 24,
    paddingTop: 8,
  },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.5 },
  greetingBlock: { gap: 4 },
  date: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    textTransform: 'capitalize',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: -0.2,
  },
  offlineNotice: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  offlineIcon: {
    fontSize: 20,
    fontWeight: '700',
  },
  offlineText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  errorText: {
    fontSize: 15,
    lineHeight: 22,
  },
  progressCard: {
    alignItems: 'center',
    borderRadius: 32,
    elevation: 4,
    flexDirection: 'row',
    gap: 24,
    minHeight: 120,
    paddingHorizontal: 24,
    paddingVertical: 24,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 30,
  },
  progressValue: {
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  progressCopy: { flex: 1, gap: 4 },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  progressDetail: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  section: { gap: 16 },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  viewAllButton: {
    justifyContent: 'center',
    minHeight: 28,
    paddingHorizontal: 4,
  },
  viewAllLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  actionCard: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 2,
    elevation: 2,
    gap: 4,
    justifyContent: 'center',
    minHeight: 96,
    paddingHorizontal: 4,
    paddingVertical: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  actionCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  actionIconContainer: {
    alignItems: 'center',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    marginBottom: 4,
    width: 40,
  },
  actionIcon: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 13,
    minHeight: 26,
    textAlign: 'center',
  },
  actionStatus: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.2,
    lineHeight: 10,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  entryList: { gap: 12 },
  entryCard: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    gap: 16,
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
  },
  entryIconContainer: {
    alignItems: 'center',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  entryIcon: {
    fontSize: 18,
    fontWeight: '700',
  },
  entryCopy: { flex: 1, gap: 2, minWidth: 0 },
  entryTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  entryTime: {
    fontSize: 12,
    fontWeight: '400',
  },
  entryStatusPill: {
    borderRadius: 999,
    maxWidth: 96,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  entryStatusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  emptyEntries: {
    fontSize: 14,
    lineHeight: 20,
  },
  submitBlock: {
    gap: 16,
    marginTop: 8,
  },
  submitButton: {
    alignItems: 'center',
    borderRadius: 999,
    elevation: 6,
    height: 60,
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  submitPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
  submitLabel: {
    fontSize: 20,
    fontWeight: '700',
  },
  submitHelp: {
    alignSelf: 'center',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
    maxWidth: '100%',
    paddingHorizontal: 24,
    textAlign: 'center',
  },
});
