import type { UserProfile } from '@project4/contracts';
import { setActiveLocale, setActiveVoiceLanguage, t, type AppPreferences } from '@project4/i18n';
import { acceptCurrentConsent, getCurrentProfile, type Session } from '@project4/supabase-client';
import { useEffect, useState } from 'react';

import { isSupabaseConfigured, supabase } from './lib/supabase';
import { loadWebPreferences, saveWebPreferences } from './lib/preferences';
import { clearPatientOfflineData } from './offline/pendingEntries';
import { AuthScreen } from './screens/AuthScreen';
import { ConsentScreen } from './screens/ConsentScreen';
import { DoctorPendingScreen } from './screens/DoctorPendingScreen';
import { TimelineScreen } from './screens/TimelineScreen';
import { SettingsScreen } from './screens/SettingsScreen';

export function App() {
  const [preferences, setPreferences] = useState<AppPreferences>(() => {
    const loadedPreferences = loadWebPreferences();
    setActiveLocale(loadedPreferences.locale);
    setActiveVoiceLanguage(loadedPreferences.voiceLanguage);
    return loadedPreferences;
  });
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [profileError, setProfileError] = useState(false);
  const [profileReloadToken, setProfileReloadToken] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!supabase) return;
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
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user.id) return;
    let active = true;

    void getCurrentProfile(supabase, session.user.id)
      .then((nextProfile) => {
        if (active) {
          setProfile(nextProfile);
          setProfileError(!nextProfile);
        }
      })
      .catch(() => {
        if (active) setProfileError(true);
      });

    return () => {
      active = false;
    };
  }, [profileReloadToken, session?.user.id]);

  async function signOut() {
    const patientId = profile?.role === 'patient' ? profile.id : session?.user.id;
    setSettingsOpen(false);
    try {
      if (supabase) await supabase.auth.signOut();
    } finally {
      if (patientId) clearPatientOfflineData(patientId);
    }
  }

  async function acceptConsent() {
    if (supabase && profile) {
      setProfile(await acceptCurrentConsent(supabase, profile.id));
    }
  }

  function updatePreferences(changes: Partial<AppPreferences>) {
    const nextPreferences = { ...preferences, ...changes };
    setActiveLocale(nextPreferences.locale);
    setActiveVoiceLanguage(nextPreferences.voiceLanguage);
    setPreferences(nextPreferences);
    saveWebPreferences(nextPreferences);
  }

  const locale = preferences.locale;

  let content;

  if (!isSupabaseConfigured || !supabase) {
    content = <main className="status-screen">{t(locale, 'app.configMissing')}</main>;
  } else if (authLoading || (session && !profile && !profileError)) {
    content = <main className="status-screen">{t(locale, 'app.loading')}</main>;
  } else if (!session) {
    content = <AuthScreen client={supabase} />;
  } else if (profileError || !profile) {
    content = (
      <main className="status-screen">
        <p className="notice error">{t(locale, 'auth.unexpectedError')}</p>
        <button
          className="primary-button"
          onClick={() => {
            setProfileError(false);
            setProfileReloadToken((current) => current + 1);
          }}
          type="button"
        >
          {t(locale, 'common.retry')}
        </button>
        <button className="secondary-button" onClick={() => void signOut()} type="button">
          {t(locale, 'auth.signOut')}
        </button>
      </main>
    );
  } else if (settingsOpen) {
    content = (
      <SettingsScreen
        client={profile.role === 'patient' ? supabase : undefined}
        onBack={() => setSettingsOpen(false)}
        onChange={updatePreferences}
        onSignOut={signOut}
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
      <TimelineScreen
        client={supabase}
        onOpenSettings={() => setSettingsOpen(true)}
        onSignOut={signOut}
        profile={profile}
      />
    );
  }

  return (
    <div className="web-app-shell" data-theme={preferences.theme}>
      <header className="web-topbar">
        <div className="web-topbar-inner">
          <div className="web-brand">
            <span aria-hidden="true" className="web-brand-mark">
              M
            </span>
            <div>
              <strong>{t(locale, 'web.portalTitle')}</strong>
              <span>{t(locale, 'web.portalSubtitle')}</span>
            </div>
          </div>
          <span className="web-security-chip">{t(locale, 'web.secureConnection')}</span>
        </div>
      </header>
      <div className="web-app-content">{content}</div>
    </div>
  );
}
