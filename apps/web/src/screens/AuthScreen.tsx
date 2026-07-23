import type { UserRole } from '@project4/contracts';
import { t, type Locale } from '@project4/i18n';
import { signInForRole, signUpPatient, type AppSupabaseClient } from '@project4/supabase-client';
import { useState, type FormEvent } from 'react';

import { ScreenHeader } from '../components/ScreenHeader';
import { PasswordField } from '../components/PasswordField';
import { StatusMessage } from '../components/StatusMessage';

type AuthMode = 'patient-login' | 'patient-signup' | 'doctor-login';

interface AuthScreenProps {
  client: AppSupabaseClient;
  locale: Locale;
  onChangeLocale: (locale: Locale) => void;
}

function expectedRole(mode: AuthMode): UserRole {
  return mode === 'doctor-login' ? 'doctor' : 'patient';
}

export function AuthScreen({ client, locale, onChangeLocale }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('patient-login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordHidden, setPasswordHidden] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'patient-signup') {
        const result = await signUpPatient(client, { email, password, displayName });
        if (result.error) throw result.error;
        if (!result.data.session) setMessage(t(locale, 'auth.checkEmail'));
      } else {
        const result = await signInForRole(client, email, password, expectedRole(mode));
        if (result.error) throw result.error;
      }
    } catch (caught) {
      const caughtMessage = caught instanceof Error ? caught.message : '';
      setError(
        caughtMessage === 'AUTH_ROLE_MISMATCH'
          ? t(locale, 'auth.roleMismatch')
          : /invalid login credentials/i.test(caughtMessage)
            ? t(locale, 'auth.invalidCredentials')
            : t(locale, 'auth.unexpectedError'),
      );
    } finally {
      setBusy(false);
    }
  }

  const modes: Array<{ value: AuthMode; label: string }> = [
    { value: 'patient-login', label: t(locale, 'auth.patientLogin') },
    { value: 'patient-signup', label: t(locale, 'auth.patientSignup') },
    { value: 'doctor-login', label: t(locale, 'auth.doctorLogin') },
  ];

  return (
    <main className="centered-layout">
      <section className="auth-layout">
        <ScreenHeader
          eyebrow={t(locale, 'phase.patientSlice')}
          title={t(locale, mode === 'patient-signup' ? 'auth.patientSignup' : 'auth.signIn')}
          subtitle={t(locale, 'app.subtitle')}
        />
        <div
          aria-label={t(locale, 'settings.language')}
          className="segmented-control"
          role="group"
          style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
        >
          <button
            aria-pressed={locale === 'en'}
            className={locale === 'en' ? 'selected' : ''}
            lang="en"
            onClick={() => onChangeLocale('en')}
            type="button"
          >
            EN
          </button>
          <button
            aria-pressed={locale === 'sr'}
            className={locale === 'sr' ? 'selected' : ''}
            lang="sr"
            onClick={() => onChangeLocale('sr')}
            type="button"
          >
            SR
          </button>
        </div>
        <div aria-label={t(locale, 'auth.signIn')} className="segmented-control" role="tablist">
          {modes.map((item) => (
            <button
              aria-selected={mode === item.value}
              className={mode === item.value ? 'selected' : ''}
              key={item.value}
              onClick={() => {
                setMode(item.value);
                setPasswordHidden(true);
              }}
              role="tab"
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
        <form className="form-stack" onSubmit={(event) => void submit(event)}>
          {mode === 'patient-signup' ? (
            <label>
              <span>{t(locale, 'auth.displayName')}</span>
              <input
                autoComplete="name"
                onChange={(event) => setDisplayName(event.target.value)}
                required
                value={displayName}
              />
            </label>
          ) : null}
          <label>
            <span>{t(locale, 'auth.email')}</span>
            <input
              autoComplete="email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <PasswordField
            autoComplete={mode === 'patient-signup' ? 'new-password' : 'current-password'}
            hidden={passwordHidden}
            label={t(locale, 'auth.password')}
            onChange={setPassword}
            onToggleVisibility={() => setPasswordHidden((current) => !current)}
            toggleLabel={t(locale, passwordHidden ? 'auth.showPassword' : 'auth.hidePassword')}
            value={password}
          />
          {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
          {message ? <StatusMessage tone="success">{message}</StatusMessage> : null}
          <button className="primary-button" disabled={busy} type="submit">
            {t(locale, mode === 'patient-signup' ? 'auth.signUp' : 'auth.signIn')}
          </button>
        </form>
      </section>
    </main>
  );
}
