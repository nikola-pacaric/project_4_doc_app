import { DEFAULT_LOCALE, t } from '@project4/i18n';

import { ScreenHeader } from '../components/ScreenHeader';

interface DoctorPendingScreenProps {
  onSignOut: () => Promise<void>;
}

export function DoctorPendingScreen({ onSignOut }: DoctorPendingScreenProps) {
  const locale = DEFAULT_LOCALE;

  return (
    <main className="centered-layout">
      <section className="narrow-layout">
        <ScreenHeader
          eyebrow={t(locale, 'role.doctor')}
          title={t(locale, 'doctor.pendingTitle')}
          subtitle={t(locale, 'doctor.pendingBody')}
        />
        <button className="secondary-button" onClick={() => void onSignOut()} type="button">
          {t(locale, 'auth.signOut')}
        </button>
      </section>
    </main>
  );
}
