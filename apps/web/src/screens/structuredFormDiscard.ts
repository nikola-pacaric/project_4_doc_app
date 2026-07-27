import { t, type Locale } from '@project4/i18n';

interface ConfirmStructuredFormDiscardOptions {
  locale: Locale;
  onDiscard: () => void;
  confirm?: (message: string) => boolean;
}

export function confirmStructuredFormDiscard({
  locale,
  onDiscard,
  confirm = (message) => window.confirm(message),
}: ConfirmStructuredFormDiscardOptions): void {
  if (confirm(`${t(locale, 'form.discardTitle')}\n\n${t(locale, 'form.discardBody')}`)) {
    onDiscard();
  }
}
