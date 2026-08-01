import { t, type Locale } from '@project4/i18n';

interface ConfirmStructuredFormDiscardOptions {
  locale: Locale;
  onDiscard: () => void;
  confirm?: (message: string) => boolean;
  reason?: StructuredFormExitReason;
}

export type StructuredFormExitReason = 'discard' | 'load-failed';

export function confirmStructuredFormDiscard({
  locale,
  onDiscard,
  confirm = (message) => window.confirm(message),
  reason = 'discard',
}: ConfirmStructuredFormDiscardOptions): void {
  if (reason === 'load-failed') {
    onDiscard();
    return;
  }

  if (confirm(`${t(locale, 'form.discardTitle')}\n\n${t(locale, 'form.discardBody')}`)) {
    onDiscard();
  }
}
