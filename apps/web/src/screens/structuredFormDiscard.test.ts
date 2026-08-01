import { t } from '@project4/i18n';
import { describe, expect, it, vi } from 'vitest';

import { confirmStructuredFormDiscard } from './structuredFormDiscard';

describe('web structured-form discard protection', () => {
  it('keeps the form open when discard is rejected', () => {
    const confirm = vi.fn(() => false);
    const onDiscard = vi.fn();

    confirmStructuredFormDiscard({ locale: 'sr', onDiscard, confirm });

    expect(confirm).toHaveBeenCalledWith(
      `${t('sr', 'form.discardTitle')}\n\n${t('sr', 'form.discardBody')}`,
    );
    expect(onDiscard).not.toHaveBeenCalled();
  });

  it('leaves the form when discard is confirmed', () => {
    const confirm = vi.fn(() => true);
    const onDiscard = vi.fn();

    confirmStructuredFormDiscard({ locale: 'en', onDiscard, confirm });

    expect(confirm).toHaveBeenCalledWith(
      `${t('en', 'form.discardTitle')}\n\n${t('en', 'form.discardBody')}`,
    );
    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it('leaves immediately after an initial load failure', () => {
    const confirm = vi.fn(() => false);
    const onDiscard = vi.fn();

    confirmStructuredFormDiscard({
      locale: 'en',
      onDiscard,
      confirm,
      reason: 'load-failed',
    });

    expect(confirm).not.toHaveBeenCalled();
    expect(onDiscard).toHaveBeenCalledOnce();
  });
});
