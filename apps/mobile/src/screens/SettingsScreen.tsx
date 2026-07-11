import {
  getActiveLocale,
  t,
  type AppPreferences,
  type Locale,
  type ThemePreference,
  type VoiceLanguage,
} from '@project4/i18n';
import { spacing } from '@project4/ui-tokens';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, sharedStyles, createThemedStyles } from '../theme';

interface SettingsScreenProps {
  preferences: AppPreferences;
  onBack: () => void;
  onChange: (changes: Partial<AppPreferences>) => void;
}

interface SettingChoice<T extends string> {
  value: T;
  label: string;
}

function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: SettingChoice<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.options}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={option.value}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && styles.optionPressed,
              ]}
            >
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
              <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function SettingsScreen({ preferences, onBack, onChange }: SettingsScreenProps) {
  const locale = getActiveLocale();

  const languageOptions: SettingChoice<Locale>[] = [
    { value: 'en', label: t(locale, 'settings.languageEnglish') },
    { value: 'sr', label: t(locale, 'settings.languageSerbian') },
  ];
  const voiceOptions: SettingChoice<VoiceLanguage>[] = [
    { value: 'en-US', label: t(locale, 'settings.voiceEnglish') },
    { value: 'sr-RS', label: t(locale, 'settings.voiceSerbian') },
  ];
  const themeOptions: SettingChoice<ThemePreference>[] = [
    { value: 'light', label: t(locale, 'settings.light') },
    { value: 'dark', label: t(locale, 'settings.dark') },
  ];

  return (
    <SafeAreaView style={sharedStyles.formScreen}>
      <KeyboardAwareScrollView contentContainerStyle={sharedStyles.formScrollContent}>
        <ScreenHeader
          eyebrow={t(locale, 'settings.appearance')}
          title={t(locale, 'settings.title')}
          subtitle={t(locale, 'settings.subtitle')}
        />

        <ChoiceGroup
          label={t(locale, 'settings.appLanguage')}
          onChange={(nextLocale) => onChange({ locale: nextLocale })}
          options={languageOptions}
          value={preferences.locale}
        />
        <ChoiceGroup
          label={t(locale, 'settings.voiceLanguage')}
          onChange={(voiceLanguage) => onChange({ voiceLanguage })}
          options={voiceOptions}
          value={preferences.voiceLanguage}
        />
        <ChoiceGroup
          label={t(locale, 'settings.theme')}
          onChange={(theme) => onChange({ theme })}
          options={themeOptions}
          value={preferences.theme}
        />

        <Text style={sharedStyles.success}>{t(locale, 'settings.saved')}</Text>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonLabel}>{t(locale, 'common.back')}</Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = createThemedStyles(() => StyleSheet.create({
  group: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  groupLabel: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  options: {
    gap: spacing.sm,
  },
  option: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  optionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.background,
  },
  optionPressed: {
    opacity: 0.78,
  },
  optionLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  optionLabelSelected: {
    color: colors.accent,
  },
  radio: {
    alignItems: 'center',
    borderColor: colors.mutedText,
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  radioSelected: {
    borderColor: colors.accent,
  },
  radioDot: {
    backgroundColor: colors.accent,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  backButton: {
    alignItems: 'center',
    borderColor: colors.accent,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  backButtonLabel: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '800',
  },
}));
