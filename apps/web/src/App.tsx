import type { UserProfile } from '@project4/contracts';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { acceptCurrentConsent, getCurrentProfile, type Session } from '@project4/supabase-client';
import { useEffect, useState } from 'react';

import { PixelDeviceFrame } from './components/PixelDeviceFrame';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { AuthScreen } from './screens/AuthScreen';
import { ConsentScreen } from './screens/ConsentScreen';
import { DoctorPendingScreen } from './screens/DoctorPendingScreen';
import { TimelineScreen } from './screens/TimelineScreen';

export function App() {
  const locale = DEFAULT_LOCALE;
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [profileError, setProfileError] = useState(false);
  const [profileReloadToken, setProfileReloadToken] = useState(0);

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
    if (supabase) await supabase.auth.signOut();
  }

  async function acceptConsent() {
    if (supabase && profile) {
      setProfile(await acceptCurrentConsent(supabase, profile.id));
    }
  }

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
  } else if (profile.role === 'doctor') {
    content = <DoctorPendingScreen onSignOut={signOut} />;
  } else if (!profile.consentAcceptedAt) {
    content = (
      <ConsentScreen
        displayName={profile.displayName}
        onAccept={acceptConsent}
        onSignOut={signOut}
      />
    );
  } else {
    content = <TimelineScreen client={supabase} onSignOut={signOut} profile={profile} />;
  }

  return <PixelDeviceFrame>{content}</PixelDeviceFrame>;
}
