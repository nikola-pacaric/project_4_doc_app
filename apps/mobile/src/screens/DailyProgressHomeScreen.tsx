import type { UserProfile } from '@project4/contracts';
import { DEFAULT_LOCALE, t, type TranslationKey } from '@project4/i18n';
import { spacing } from '@project4/ui-tokens';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { colors, sharedStyles } from '../theme';

interface DailyProgressHomeScreenProps {
  onBack: () => void;
  onOpenDaily: () => void;
  onOpenFood: () => void;
  profile: UserProfile;
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

function greetingKey(hour: number): TranslationKey {
  if (hour < 12) return 'home.greeting.morning';
  if (hour < 18) return 'home.greeting.afternoon';
  return 'home.greeting.evening';
}

export function DailyProgressHomeScreen({
  onBack,
  onOpenDaily,
  onOpenFood,
  profile,
}: DailyProgressHomeScreenProps) {
  const locale = DEFAULT_LOCALE;
  const { width } = useWindowDimensions();
  const now = new Date();
  const progress = 0;
  const completedItems = 0;
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
        <Pressable
          accessibilityLabel={t(locale, 'common.back')}
          accessibilityRole="button"
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Text style={styles.backIcon}>{'‹'}</Text>
        </Pressable>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{displayName.slice(0, 2).toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.greetingBlock}>
        <Text style={styles.date}>{dateLabel}</Text>
        <Text style={styles.greeting}>
          {t(locale, greetingKey(now.getHours()))}, {displayName}
        </Text>
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressCircle}>
          <Text style={styles.progressValue}>{progress}%</Text>
        </View>
        <View style={styles.progressCopy}>
          <Text style={styles.progressTitle}>{t(locale, 'home.progress.title')}</Text>
          <Text style={styles.progressDetail}>
            {t(locale, 'home.progress.items')
              .replace('{completed}', String(completedItems))
              .replace('{total}', String(quickActions.length))}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t(locale, 'home.quickActions')}</Text>
        <View style={styles.actionGrid}>
          {quickActions.map((action) => {
            const enabled = action.id === 'daily' || action.id === 'food';
            const onPress = action.id === 'daily' ? onOpenDaily : onOpenFood;

            return (
              <Pressable
                accessibilityHint={enabled ? undefined : t(locale, 'home.action.previewHint')}
                accessibilityLabel={t(locale, action.labelKey)}
                accessibilityRole="button"
                accessibilityState={{ disabled: !enabled }}
                disabled={!enabled}
                key={action.id}
                onPress={enabled ? onPress : undefined}
                style={({ pressed }) => [
                  styles.actionCard,
                  enabled && styles.actionCardEnabled,
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
              </Pressable>
            );
          })}
        </View>
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
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  backIcon: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 36,
    marginTop: -3,
  },
  pressed: { opacity: 0.7 },
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
  submitBlock: { gap: spacing.sm, marginTop: 'auto' },
  submitHelp: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
