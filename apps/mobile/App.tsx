import type { UserProfile } from '@project4/contracts';
import {
  defaultAppPreferences,
  setActiveLocale,
  setActiveVoiceLanguage,
  t,
  type AppPreferences,
} from '@project4/i18n';
import { acceptCurrentConsent, getCurrentProfile, type Session } from '@project4/supabase-client';
import { spacing } from '@project4/ui-tokens';
import { StatusBar } from 'expo-status-bar';
import { registerRootComponent } from 'expo';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from './src/components/PrimaryButton';
import { isSupabaseConfigured, supabase } from './src/lib/supabase';
import { clearPatientOfflineData } from './src/offline/pendingEntries';
import { SymptomPreview } from './src/preview/SymptomPreview';
import { AuthScreen } from './src/screens/AuthScreen';
import { ConsentScreen } from './src/screens/ConsentScreen';
import { DoctorPendingScreen } from './src/screens/DoctorPendingScreen';
import { PatientHomeScreen, type PatientHomeTab } from './src/screens/PatientHomeScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { loadMobilePreferences, saveMobilePreferences } from './src/lib/preferences';
import { colors, setAppTheme, sharedStyles, createThemedStyles } from './src/theme';

function MainApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [preferences, setPreferences] = useState<AppPreferences>(defaultAppPreferences);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [patientLandingTab, setPatientLandingTab] = useState<PatientHomeTab>('today');
  const [profileError, setProfileError] = useState(false);
  const [profileReloadToken, setProfileReloadToken] = useState(0);

  function closeSettingsTo(tab: PatientHomeTab = 'today') {
    setPatientLandingTab(tab);
    setSettingsOpen(false);
  }

  useEffect(() => {
    void loadMobilePreferences()
      .then((loadedPreferences) => {
        setActiveLocale(loadedPreferences.locale);
        setActiveVoiceLanguage(loadedPreferences.voiceLanguage);
        setAppTheme(loadedPreferences.theme);
        setPreferences(loadedPreferences);
      })
      .finally(() => setPreferencesLoading(false));
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const client = supabase;

    void client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setProfile(null);
      setAuthLoading(false);
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setProfile(null);
      setProfileError(false);
      // Sign-in / sign-out should always land on the default surface, not a prior Settings view.
      setSettingsOpen(false);
      setPatientLandingTab('today');
    });

    const appStateListener = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        client.auth.startAutoRefresh();
      } else {
        client.auth.stopAutoRefresh();
      }
    });

    return () => {
      listener.subscription.unsubscribe();
      appStateListener.remove();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user.id) {
      return;
    }

    let active = true;

    void getCurrentProfile(supabase, session.user.id)
      .then((nextProfile) => {
        if (active) {
          setProfile(nextProfile);
          setProfileError(!nextProfile);
        }
      })
      .catch(() => {
        if (active) {
          setProfileError(true);
        }
      });

    return () => {
      active = false;
    };
  }, [profileReloadToken, session?.user.id]);

  async function signOut() {
    const patientId = profile?.role === 'patient' ? profile.id : session?.user.id;
    setSettingsOpen(false);
    setPatientLandingTab('today');
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } finally {
      if (patientId) {
        await clearPatientOfflineData(patientId);
      }
    }
  }

  async function acceptConsent() {
    if (!supabase || !profile) {
      return;
    }

    setProfile(await acceptCurrentConsent(supabase, profile.id));
  }

  function retryProfile() {
    setProfileError(false);
    setProfileReloadToken((current) => current + 1);
  }

  function updatePreferences(changes: Partial<AppPreferences>) {
    const nextPreferences = { ...preferences, ...changes };
    setActiveLocale(nextPreferences.locale);
    setActiveVoiceLanguage(nextPreferences.voiceLanguage);
    setAppTheme(nextPreferences.theme);
    setPreferences(nextPreferences);
    void saveMobilePreferences(nextPreferences);
  }

  const locale = preferences.locale;

  const profileLoading = Boolean(session && !profile && !profileError);
  let content;

  if (!isSupabaseConfigured || !supabase) {
    content = (
      <SafeAreaView style={sharedStyles.screen}>
        <View style={styles.centered}>
          <Text style={sharedStyles.heading}>{t(locale, 'app.configMissing')}</Text>
        </View>
      </SafeAreaView>
    );
  } else if (preferencesLoading || authLoading || profileLoading) {
    content = (
      <SafeAreaView style={sharedStyles.screen}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={sharedStyles.body}>{t(locale, 'app.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  } else if (!session) {
    content = (
      <AuthScreen
        client={supabase}
        locale={locale}
        onChangeLocale={(nextLocale) => updatePreferences({ locale: nextLocale })}
      />
    );
  } else if (profileError || !profile) {
    content = (
      <SafeAreaView style={sharedStyles.screen}>
        <View style={styles.centered}>
          <Text style={sharedStyles.error}>{t(locale, 'auth.unexpectedError')}</Text>
          <PrimaryButton label={t(locale, 'common.retry')} onPress={retryProfile} />
          <PrimaryButton
            label={t(locale, 'auth.signOut')}
            onPress={() => void signOut()}
            variant="secondary"
          />
        </View>
      </SafeAreaView>
    );
  } else if (settingsOpen) {
    content = (
      <SettingsScreen
        client={profile.role === 'patient' ? supabase : undefined}
        onBack={() => closeSettingsTo('today')}
        onChange={updatePreferences}
        onProfile={profile.role === 'patient' ? () => closeSettingsTo('profile') : undefined}
        onSignOut={signOut}
        onTimeline={profile.role === 'patient' ? () => closeSettingsTo('timeline') : undefined}
        onToday={profile.role === 'patient' ? () => closeSettingsTo('today') : undefined}
        patientId={profile.role === 'patient' ? profile.id : undefined}
        preferences={preferences}
      />
    );
  } else if (profile.role === 'doctor') {
    content = (
      <DoctorPendingScreen
        client={supabase}
        onOpenSettings={() => setSettingsOpen(true)}
        onSignOut={signOut}
        profile={profile}
      />
    );
  } else if (!profile.consentAcceptedAt) {
    content = (
      <ConsentScreen
        displayName={profile.displayName}
        onAccept={acceptConsent}
        onSignOut={signOut}
      />
    );
  } else {
    content = (
      <PatientHomeScreen
        client={supabase}
        initialTab={patientLandingTab}
        onOpenSettings={() => setSettingsOpen(true)}
        profile={profile}
      />
    );
  }

  return (
    <>
      <StatusBar style={preferences.theme === 'dark' ? 'light' : 'dark'} />
      {content}
    </>
  );
}

export default function App() {
  if (process.env.EXPO_PUBLIC_PREVIEW_SCREEN === 'symptom') {
    return <SymptomPreview />;
  }

  return <MainApp />;
}

const styles = createThemedStyles(() =>
  StyleSheet.create({
    centered: {
      flex: 1,
      justifyContent: 'center',
      gap: spacing.lg,
      padding: spacing.lg,
    },
  }),
);

registerRootComponent(App);
