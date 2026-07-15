import { getActiveLocale, t } from '@project4/i18n';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  failed: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  override state: AppErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('Unhandled application error', error, info.componentStack);
    }
  }

  override render() {
    if (!this.state.failed) return this.props.children;

    const locale = getActiveLocale();
    return (
      <main className="status-screen" role="alert">
        <h1>{t(locale, 'app.fatalErrorTitle')}</h1>
        <p>{t(locale, 'app.fatalErrorBody')}</p>
        <button className="primary-button" onClick={() => window.location.reload()} type="button">
          {t(locale, 'app.reload')}
        </button>
      </main>
    );
  }
}
