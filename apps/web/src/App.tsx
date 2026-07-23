import type { UserProfile } from '@project4/contracts';
import { setActiveLocale, setActiveVoiceLanguage, t, type AppPreferences } from '@project4/i18n';
import { acceptCurrentConsent, getCurrentProfile, type Session } from '@project4/supabase-client';
import { createAuthSessionTransitionTracker } from '@project4/sync';
import { useEffect, useState } from 'react';

import { isSupabaseConfigured, supabase } from './lib/supabase';
import { loadWebPreferences, saveWebPreferences } from './lib/preferences';
import { clearAllPatientOfflineData } from './offline/pendingEntries';
import { StatusMessage } from './components/StatusMessage';
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

    let active = true;
    let authEventReceived = false;
    const authTransitionTracker = createAuthSessionTransitionTracker();
    let medicalCacheClearPending = false;
    let transitionVersion = 0;

    function applyAuthSession(nextSession: Session | null) {
      if (!active) return;
      const version = ++transitionVersion;
      const nextUserId = nextSession?.user.id ?? null;
      const transition = authTransitionTracker.next(nextUserId);
      const shouldClearCache = medicalCacheClearPending || transition.shouldClearMedicalCache;
      medicalCacheClearPending ||= shouldClearCache;

      if (transition.shouldResetUserState) {
        setProfile(null);
        setProfileError(false);
        setSettingsOpen(false);
      }
      if (!nextSession) {
        setSession(null);
      }

      void (async () => {
        if (shouldClearCache) {
          clearAllPatientOfflineData();
        }
      })()
        .then(() => {
          if (!active || version !== transitionVersion) return;
          medicalCacheClearPending = false;
          setSession(nextSession);
          setAuthLoading(false);
        })
        .catch(() => {
          if (version === transitionVersion) {
            setSession(null);
            setAuthLoading(false);
          }
        });
    }

    void client.auth
      .getSession()
      .then(({ data }) => {
        if (!authEventReceived) {
          applyAuthSession(data.session);
        }
      })
      .catch(() => {
        if (!authEventReceived) {
          applyAuthSession(null);
        }
      });

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      authEventReceived = true;
      applyAuthSession(nextSession);
    });

    return () => {
      active = false;
      transitionVersion += 1;
      listener.subscription.unsubscribe();
    };
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
    setSettingsOpen(false);
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } finally {
      clearAllPatientOfflineData();
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

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  let content;

  if (!isSupabaseConfigured || !supabase) {
    content = (
      <main className="status-screen">
        <StatusMessage tone="error">{t(locale, 'app.configMissing')}</StatusMessage>
      </main>
    );
  } else if (authLoading || (session && !profile && !profileError)) {
    content = (
      <main aria-busy="true" aria-live="polite" className="status-screen" role="status">
        {t(locale, 'app.loading')}
      </main>
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
      <main className="status-screen">
        <StatusMessage tone="error">{t(locale, 'auth.unexpectedError')}</StatusMessage>
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
              P
            </span>
            <div>
              <strong>{t(locale, 'web.portalTitle')}</strong>
              <span>{t(locale, 'web.portalSubtitle')}</span>
            </div>
          </div>
          <span className="web-security-chip">{t(locale, 'web.privateWorkspace')}</span>
        </div>
      </header>
      <div className="web-app-content">{content}</div>
    </div>
  );
}
