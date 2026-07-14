import {
  getActiveLocale,
  t,
  type AppPreferences,
  type Locale,
  type ThemePreference,
  type VoiceLanguage,
} from '@project4/i18n';
import {
  getPatientDoctorLink,
  redeemDoctorInviteCode,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { useCallback, useEffect, useState } from 'react';

import { ScreenHeader } from '../components/ScreenHeader';

interface SettingsScreenProps {
  preferences: AppPreferences;
  onBack: () => void;
  onChange: (changes: Partial<AppPreferences>) => void;
  /** When set, shows patient doctor-link controls under voice settings. */
  client?: AppSupabaseClient;
  patientId?: string;
  onSignOut?: () => void | Promise<void>;
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

export function SettingsScreen({
  preferences,
  onBack,
  onChange,
  client,
  patientId,
  onSignOut,
}: SettingsScreenProps) {
  const locale = getActiveLocale();
  const showDoctorLink = Boolean(client && patientId);
  const [hasLinkedDoctor, setHasLinkedDoctor] = useState(false);
  const [doctorInviteCode, setDoctorInviteCode] = useState('');
  const [doctorInviteMessage, setDoctorInviteMessage] = useState<string | null>(null);
  const [doctorInviteRedeeming, setDoctorInviteRedeeming] = useState(false);
  const [doctorLinkOffline, setDoctorLinkOffline] = useState(false);

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

  const loadDoctorLink = useCallback(async () => {
    if (!client || !patientId) return;
    try {
      const link = await getPatientDoctorLink(client, patientId);
      setHasLinkedDoctor(Boolean(link));
      setDoctorLinkOffline(false);
    } catch {
      setDoctorLinkOffline(true);
    }
  }, [client, patientId]);

  useEffect(() => {
    void loadDoctorLink();
  }, [loadDoctorLink]);

  async function redeemInviteCode() {
    if (
      !client ||
      !patientId ||
      !doctorInviteCode.trim() ||
      doctorInviteRedeeming ||
      hasLinkedDoctor ||
      doctorLinkOffline
    ) {
      return;
    }

    setDoctorInviteRedeeming(true);
    setDoctorInviteMessage(null);
    try {
      await redeemDoctorInviteCode(client, doctorInviteCode);
      setDoctorInviteCode('');
      setHasLinkedDoctor(true);
      setDoctorInviteMessage(t(locale, 'patientInvite.success'));
      await loadDoctorLink();
    } catch {
      setDoctorInviteMessage(t(locale, 'patientInvite.error'));
    } finally {
      setDoctorInviteRedeeming(false);
    }
  }

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

      {showDoctorLink ? (
        <section className="settings-group settings-doctor-link">
          {hasLinkedDoctor ? (
            <>
              <h2 className="settings-doctor-title">{t(locale, 'patientInvite.linkedTitle')}</h2>
              <p>{t(locale, 'patientInvite.linkedHelp')}</p>
              <p className="notice success">{t(locale, 'patientInvite.linkedNotice')}</p>
            </>
          ) : (
            <>
              <h2 className="settings-doctor-title">{t(locale, 'patientInvite.title')}</h2>
              <p>{t(locale, 'patientInvite.help')}</p>
              <form
                className="web-invite-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void redeemInviteCode();
                }}
              >
                <label>
                  {t(locale, 'patientInvite.code')}
                  <input
                    autoCapitalize="characters"
                    disabled={doctorLinkOffline || doctorInviteRedeeming}
                    onChange={(event) => {
                      setDoctorInviteCode(event.target.value.toUpperCase());
                      setDoctorInviteMessage(null);
                    }}
                    placeholder={t(locale, 'patientInvite.placeholder')}
                    value={doctorInviteCode}
                  />
                </label>
                <button
                  className="secondary-button"
                  disabled={
                    doctorLinkOffline || doctorInviteRedeeming || !doctorInviteCode.trim()
                  }
                  type="submit"
                >
                  {doctorInviteRedeeming
                    ? t(locale, 'app.loading')
                    : t(locale, 'patientInvite.redeem')}
                </button>
              </form>
              {doctorLinkOffline ? (
                <p className="notice error">{t(locale, 'patientInvite.offline')}</p>
              ) : null}
              {doctorInviteMessage ? (
                <p
                  className={`notice ${
                    doctorInviteMessage === t(locale, 'patientInvite.success')
                      ? 'success'
                      : 'error'
                  }`}
                >
                  {doctorInviteMessage}
                </p>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      <div className="settings-actions">
        <button className="secondary-button" onClick={onBack} type="button">
          {t(locale, 'common.back')}
        </button>
        {onSignOut ? (
          <button className="secondary-button" onClick={() => void onSignOut()} type="button">
            {t(locale, 'auth.signOut')}
          </button>
        ) : null}
      </div>
    </main>
  );
}
