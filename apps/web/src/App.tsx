import { APP_NAME, type UserRole } from '@project4/contracts';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { darkTheme, lightTheme, spacing } from '@project4/ui-tokens';

const previewRoles: UserRole[] = ['patient', 'doctor'];

export function App() {
  const theme = lightTheme;

  return (
    <main className="app-shell" style={{ background: theme.colors.background }}>
      <section className="intro-panel" aria-labelledby="app-title">
        <p className="eyebrow" style={{ color: theme.colors.mutedText }}>
          {t(DEFAULT_LOCALE, 'phase.foundation')}
        </p>
        <h1 id="app-title" style={{ color: theme.colors.text }}>
          {APP_NAME}
        </h1>
        <p className="summary" style={{ color: theme.colors.mutedText }}>
          {t(DEFAULT_LOCALE, 'app.subtitle')}
        </p>
        <div className="actions" style={{ gap: spacing.md }}>
          <button type="button">{t(DEFAULT_LOCALE, 'auth.patientSignup')}</button>
          <button type="button">{t(DEFAULT_LOCALE, 'auth.patientLogin')}</button>
          <button type="button">{t(DEFAULT_LOCALE, 'auth.doctorLogin')}</button>
        </div>
        <div className="status-line" style={{ color: darkTheme.colors.accent }}>
          {previewRoles.map((role) => t(DEFAULT_LOCALE, `role.${role}`)).join(' / ')}
        </div>
      </section>
    </main>
  );
}
