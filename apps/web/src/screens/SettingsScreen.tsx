import {
  getActiveLocale,
  t,
  type AppPreferences,
  type Locale,
  type ThemePreference,
  type VoiceLanguage,
} from '@project4/i18n';

import { ScreenHeader } from '../components/ScreenHeader';

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
    <fieldset className="settings-group">
      <legend>{label}</legend>
      <div className="settings-options">
        {options.map((option) => (
          <label className="settings-option" key={option.value}>
            <input
              checked={option.value === value}
              name={label}
              onChange={() => onChange(option.value)}
              type="radio"
              value={option.value}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
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
    <main className="settings-layout">
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
      <p className="notice success">{t(locale, 'settings.saved')}</p>
      <button className="secondary-button" onClick={onBack} type="button">
        {t(locale, 'common.back')}
      </button>
    </main>
  );
}
