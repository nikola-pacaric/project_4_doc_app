import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { useState } from 'react';

import { ScreenHeader } from '../components/ScreenHeader';

interface ConsentScreenProps {
  displayName: string | null;
  onAccept: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

export function ConsentScreen({ displayName, onAccept, onSignOut }: ConsentScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function continueToApp() {
    if (!accepted) {
      setError(t(locale, 'consent.required'));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await onAccept();
    } catch {
      setError(t(locale, 'auth.unexpectedError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="centered-layout">
      <section className="narrow-layout">
        <ScreenHeader
          eyebrow={displayName ?? t(locale, 'role.patient')}
          title={t(locale, 'consent.title')}
        />
        <p className="consent-copy">{t(locale, 'consent.body')}</p>
        <label className="checkbox-row">
          <input
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            type="checkbox"
          />
          <span>{t(locale, 'consent.accept')}</span>
        </label>
        {error ? <p className="notice error">{error}</p> : null}
        <div className="button-row">
          <button
            className="primary-button"
            disabled={busy}
            onClick={() => void continueToApp()}
            type="button"
          >
            {t(locale, 'common.save')}
          </button>
          <button className="secondary-button" onClick={() => void onSignOut()} type="button">
            {t(locale, 'auth.signOut')}
          </button>
        </div>
      </section>
    </main>
  );
}
