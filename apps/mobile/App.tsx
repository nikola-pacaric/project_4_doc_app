import type { UserProfile } from '@project4/contracts';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { acceptCurrentConsent, getCurrentProfile, type Session } from '@project4/supabase-client';
import { spacing } from '@project4/ui-tokens';
import { StatusBar } from 'expo-status-bar';
import { registerRootComponent } from 'expo';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from './src/components/PrimaryButton';
import { isSupabaseConfigured, supabase } from './src/lib/supabase';
import { SymptomPreview } from './src/preview/SymptomPreview';
import { AuthScreen } from './src/screens/AuthScreen';
import { ConsentScreen } from './src/screens/ConsentScreen';
import { DoctorPendingScreen } from './src/screens/DoctorPendingScreen';
import { PatientHomeScreen } from './src/screens/PatientHomeScreen';
import { colors, sharedStyles } from './src/theme';

function MainApp() {
  const locale = DEFAULT_LOCALE;
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [profileError, setProfileError] = useState(false);
  const [profileReloadToken, setProfileReloadToken] = useState(0);

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
    if (supabase) {
      await supabase.auth.signOut();
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
  } else if (authLoading || profileLoading) {
    content = (
      <SafeAreaView style={sharedStyles.screen}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={sharedStyles.body}>{t(locale, 'app.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  } else if (!session) {
    content = <AuthScreen client={supabase} />;
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
  } else if (profile.role === 'doctor') {
    content = <DoctorPendingScreen client={supabase} onSignOut={signOut} />;
  } else if (!profile.consentAcceptedAt) {
    content = (
      <ConsentScreen
        displayName={profile.displayName}
        onAccept={acceptConsent}
        onSignOut={signOut}
      />
    );
  } else {
    content = <PatientHomeScreen client={supabase} onSignOut={signOut} profile={profile} />;
  }

  return (
    <>
      <StatusBar style="dark" />
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

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
  },
});

registerRootComponent(App);
