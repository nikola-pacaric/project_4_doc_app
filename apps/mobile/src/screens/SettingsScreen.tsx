import {
  getActiveLocale,
  t,
  type AppPreferences,
  type Locale,
  type ThemePreference,
  type VoiceLanguage,
} from '@project4/i18n';
import { darkTheme } from '@project4/ui-tokens';
import {
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { PatientBottomNav } from '../components/PatientBottomNav';
import { colors } from '../theme';

/**
 * Stitch "Settings - Patient Preferences" / Tactile Bloom tokens.
 * Scoped to the mobile settings surface so other screens stay unchanged.
 */
const stitch = {
  background: '#fdf8fd',
  surface: '#ffffff',
  surfaceContainer: '#f1ecf2',
  secondaryContainer: '#fcdae1',
  primary: '#a63553',
  primaryContainer: '#f4718f',
  primaryFixed: '#ffd9de',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#6b022a',
  onSurface: '#1c1b1f',
  onSurfaceVariant: '#564145',
  outline: '#897174',
  outlineVariant: '#dcbfc3',
  tertiary: '#7d5260',
  tertiaryFixedDim: '#eeb8c8',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  shadow: 'rgba(166, 53, 83, 0.08)',
} as const;

const APP_VERSION = '0.1.0';

interface SettingsScreenProps {
  preferences: AppPreferences;
  displayName?: string;
  onBack: () => void;
  onChange: (changes: Partial<AppPreferences>) => void;
  onSignOut: () => void | Promise<void>;
}

function isDarkThemeActive(): boolean {
  return colors.background === darkTheme.colors.background;
}

function initialsFromName(name: string | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'P';
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function SettingsScreen({
  preferences,
  displayName,
  onBack,
  onChange,
  onSignOut,
}: SettingsScreenProps) {
  const locale = getActiveLocale();
  const dark = isDarkThemeActive();
  const palette = dark
    ? {
        background: colors.background,
        surface: colors.surface,
        surfaceContainer: colors.surfaceAlt,
        secondaryContainer: colors.surfaceAlt,
        primary: colors.accentStrong,
        primaryContainer: colors.accent,
        primaryFixed: colors.surfaceAlt,
        onPrimary: colors.onAccent,
        onPrimaryContainer: colors.onAccent,
        onSurface: colors.text,
        onSurfaceVariant: colors.mutedText,
        outline: colors.mutedText,
        outlineVariant: colors.border,
        tertiary: colors.accentStrong,
        tertiaryFixedDim: colors.surfaceAlt,
        error: colors.danger,
        errorContainer: colors.surfaceAlt,
        shadow: '#000000',
      }
    : stitch;

  const initials = initialsFromName(displayName);
  const themeModeLabel =
    preferences.theme === 'dark'
      ? t(locale, 'settings.themeDarkMode')
      : t(locale, 'settings.themeLightMode');
  const themeCurrentLabel = t(locale, 'settings.themeCurrent').replace('{mode}', themeModeLabel);
  const voiceShortLabel =
    preferences.voiceLanguage === 'sr-RS'
      ? t(locale, 'settings.voiceSerbianShort')
      : t(locale, 'settings.voiceEnglishShort');
  const versionLabel = t(locale, 'settings.version').replace('{version}', APP_VERSION);

  function setLocale(next: Locale) {
    onChange({ locale: next });
  }

  function setTheme(next: ThemePreference) {
    onChange({ theme: next });
  }

  function cycleVoiceLanguage() {
    const next: VoiceLanguage = preferences.voiceLanguage === 'en-US' ? 'sr-RS' : 'en-US';
    onChange({ voiceLanguage: next });
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: palette.background }}
      >
        {/* Top app bar */}
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: palette.secondaryContainer,
                  borderColor: dark ? palette.outlineVariant : 'rgba(166, 53, 83, 0.1)',
                },
              ]}
            >
              <Text style={[styles.avatarText, { color: palette.primary }]}>{initials}</Text>
            </View>
            <Text style={[styles.brandTitle, { color: palette.primary }]}>
              {t(locale, 'app.brand')}
            </Text>
          </View>
          <Pressable
            accessibilityLabel={t(locale, 'common.back')}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onBack}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Text style={[styles.topIcon, { color: palette.primary }]}>⚙</Text>
          </Pressable>
        </View>

        {/* Header */}
        <View style={styles.headerBlock}>
          <Text style={[styles.pageTitle, { color: palette.onSurface }]}>
            {t(locale, 'settings.title')}
          </Text>
          <Text style={[styles.pageSubtitle, { color: palette.onSurfaceVariant }]}>
            {t(locale, 'settings.subtitleManage')}
          </Text>
        </View>

        {/* App Preferences */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.primary }]}>
            {t(locale, 'settings.appPreferences')}
          </Text>

          <View
            style={[
              styles.card,
              {
                backgroundColor: palette.surface,
                shadowColor: palette.shadow,
              },
            ]}
          >
            <View style={styles.cardLeft}>
              <View
                style={[styles.iconBubble, { backgroundColor: palette.secondaryContainer }]}
              >
                <Text style={[styles.iconGlyph, { color: palette.primary }]}>🌐</Text>
              </View>
              <View style={styles.cardCopy}>
                <Text style={[styles.cardTitle, { color: palette.onSurface }]}>
                  {t(locale, 'settings.language')}
                </Text>
                <Text style={[styles.cardSubtitle, { color: palette.onSurfaceVariant }]}>
                  {t(locale, 'settings.languageHelp')}
                </Text>
              </View>
            </View>
            <View style={[styles.segment, { backgroundColor: palette.surfaceContainer }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: preferences.locale === 'en' }}
                onPress={() => setLocale('en')}
                style={({ pressed }) => [
                  styles.segmentItem,
                  preferences.locale === 'en' && {
                    backgroundColor: palette.primaryContainer,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    {
                      color:
                        preferences.locale === 'en'
                          ? palette.onPrimaryContainer
                          : palette.onSurfaceVariant,
                      fontWeight: preferences.locale === 'en' ? '700' : '500',
                    },
                  ]}
                >
                  {t(locale, 'settings.languageEnglishShort')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: preferences.locale === 'sr' }}
                onPress={() => setLocale('sr')}
                style={({ pressed }) => [
                  styles.segmentItem,
                  preferences.locale === 'sr' && {
                    backgroundColor: palette.primaryContainer,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    {
                      color:
                        preferences.locale === 'sr'
                          ? palette.onPrimaryContainer
                          : palette.onSurfaceVariant,
                      fontWeight: preferences.locale === 'sr' ? '700' : '500',
                    },
                  ]}
                >
                  {t(locale, 'settings.languageSerbianShort')}
                </Text>
              </Pressable>
            </View>
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor: palette.surface,
                shadowColor: palette.shadow,
              },
            ]}
          >
            <View style={styles.cardLeft}>
              <View
                style={[styles.iconBubble, { backgroundColor: palette.secondaryContainer }]}
              >
                <Text style={[styles.iconGlyph, { color: palette.primary }]}>🎨</Text>
              </View>
              <View style={styles.cardCopy}>
                <Text style={[styles.cardTitle, { color: palette.onSurface }]}>
                  {t(locale, 'settings.theme')}
                </Text>
                <Text style={[styles.cardSubtitle, { color: palette.onSurfaceVariant }]}>
                  {themeCurrentLabel}
                </Text>
              </View>
            </View>
            <View style={[styles.segment, styles.themeSegment, { backgroundColor: palette.surfaceContainer }]}>
              <Pressable
                accessibilityLabel={t(locale, 'settings.light')}
                accessibilityRole="button"
                accessibilityState={{ selected: preferences.theme === 'light' }}
                onPress={() => setTheme('light')}
                style={({ pressed }) => [
                  styles.segmentItem,
                  styles.themeSegmentItem,
                  preferences.theme === 'light' && {
                    backgroundColor: palette.primaryContainer,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.themeIcon,
                    {
                      color:
                        preferences.theme === 'light'
                          ? palette.onPrimaryContainer
                          : palette.onSurfaceVariant,
                    },
                  ]}
                >
                  ☀
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel={t(locale, 'settings.dark')}
                accessibilityRole="button"
                accessibilityState={{ selected: preferences.theme === 'dark' }}
                onPress={() => setTheme('dark')}
                style={({ pressed }) => [
                  styles.segmentItem,
                  styles.themeSegmentItem,
                  preferences.theme === 'dark' && {
                    backgroundColor: palette.primaryContainer,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.themeIcon,
                    {
                      color:
                        preferences.theme === 'dark'
                          ? palette.onPrimaryContainer
                          : palette.onSurfaceVariant,
                    },
                  ]}
                >
                  ☾
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Voice Help */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.primary }]}>
            {t(locale, 'settings.voiceHelp')}
          </Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: palette.surface,
                shadowColor: palette.shadow,
              },
            ]}
          >
            <View style={styles.cardLeft}>
              <View
                style={[
                  styles.iconBubble,
                  {
                    backgroundColor: dark ? palette.surfaceContainer : stitch.tertiaryFixedDim,
                  },
                ]}
              >
                <Text style={[styles.iconGlyph, { color: palette.tertiary }]}>🎤</Text>
              </View>
              <View style={styles.cardCopy}>
                <Text style={[styles.cardTitle, { color: palette.onSurface }]}>
                  {t(locale, 'settings.voiceLanguage')}
                </Text>
                <Text style={[styles.cardSubtitle, { color: palette.onSurfaceVariant }]}>
                  {t(locale, 'settings.voiceHelpSubtitle')}
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityHint={t(locale, 'settings.voiceHelpSubtitle')}
              accessibilityLabel={t(locale, 'settings.voiceLanguage')}
              accessibilityRole="button"
              onPress={cycleVoiceLanguage}
              style={({ pressed }) => [
                styles.voiceChip,
                {
                  backgroundColor: dark
                    ? palette.surfaceContainer
                    : 'rgba(255, 217, 222, 0.35)',
                },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.voiceChipLabel, { color: palette.primary }]}>
                {voiceShortLabel}
              </Text>
              <Text style={[styles.voiceChipChevron, { color: palette.primary }]}>▾</Text>
            </Pressable>
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.primary }]}>
            {t(locale, 'settings.account')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void onSignOut()}
            style={({ pressed }) => [
              styles.card,
              styles.signOutCard,
              {
                backgroundColor: palette.surface,
                shadowColor: palette.shadow,
              },
              pressed && styles.cardPressed,
            ]}
          >
            <View style={styles.cardLeft}>
              <View
                style={[
                  styles.iconBubble,
                  {
                    backgroundColor: dark
                      ? palette.errorContainer
                      : 'rgba(255, 218, 214, 0.35)',
                  },
                ]}
              >
                <Text style={[styles.iconGlyph, { color: palette.error }]}>⎋</Text>
              </View>
              <View style={styles.cardCopy}>
                <Text style={[styles.cardTitle, { color: palette.onSurface }]}>
                  {t(locale, 'auth.signOut')}
                </Text>
                <Text style={[styles.cardSubtitle, { color: palette.onSurfaceVariant }]}>
                  {t(locale, 'settings.signOutHelp')}
                </Text>
              </View>
            </View>
            <Text style={[styles.chevron, { color: palette.outlineVariant }]}>›</Text>
          </Pressable>

          <Text style={[styles.versionText, { color: palette.outline }]}>{versionLabel}</Text>
        </View>
      </KeyboardAwareScrollView>

      <PatientBottomNav
        active="settings"
        onProfile={onBack}
        onSettings={() => undefined}
        onTimeline={onBack}
        onToday={onBack}
        palette={{
          background: dark ? colors.surface : 'rgba(241, 236, 242, 0.92)',
          onPrimaryContainer: dark ? palette.onPrimaryContainer : stitch.onPrimaryContainer,
          onSurfaceVariant: palette.onSurfaceVariant,
          primaryContainer: dark ? palette.primaryContainer : stitch.primaryContainer,
          shadow: palette.shadow,
        }}
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
    gap: 32,
    paddingBottom: 120,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  pressed: { opacity: 0.72 },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingVertical: 8,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: 12,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 2,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  topIcon: {
    fontSize: 22,
    fontWeight: '700',
  },
  headerBlock: {
    gap: 4,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  pageSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    lineHeight: 16,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
  },
  card: {
    alignItems: 'center',
    borderRadius: 16,
    elevation: 2,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 72,
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 24,
  },
  signOutCard: {
    minHeight: 80,
  },
  cardLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 14,
    minWidth: 0,
  },
  iconBubble: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  iconGlyph: {
    fontSize: 20,
  },
  cardCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  segment: {
    borderRadius: 999,
    flexDirection: 'row',
    overflow: 'hidden',
    padding: 4,
    width: 128,
  },
  themeSegment: {
    width: 104,
  },
  segmentItem: {
    alignItems: 'center',
    borderRadius: 999,
    flex: 1,
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  themeSegmentItem: {
    minHeight: 36,
  },
  segmentLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  themeIcon: {
    fontSize: 16,
    fontWeight: '700',
  },
  voiceChip: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  voiceChipLabel: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  voiceChipChevron: {
    fontSize: 12,
    fontWeight: '700',
  },
  chevron: {
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 28,
    marginLeft: 4,
  },
  versionText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
});
