import { baselineProfileDefaults } from '@project4/forms';
import { t } from '@project4/i18n';
import { describe, expect, it, vi } from 'vitest';

import {
  confirmBaselineDiscard,
  hasUnsavedBaselineChanges,
  type BaselineEditorState,
} from './baselineDiscard';

function emptyEditorState(): BaselineEditorState {
  return {
    draft: { ...baselineProfileDefaults },
    hasChronicDiseases: undefined,
    hasChronicTherapy: undefined,
    chronicDiseaseNames: [''],
    chronicTherapies: [{ name: '', dose: '' }],
  };
}

describe('web baseline discard protection', () => {
  it('treats the initial empty editor as unchanged', () => {
    const initial = emptyEditorState();
    expect(hasUnsavedBaselineChanges(initial, initial)).toBe(false);
  });

  it('detects scalar and repeatable-row changes', () => {
    const initial = emptyEditorState();

    expect(
      hasUnsavedBaselineChanges(
        { ...initial, draft: { ...baselineProfileDefaults, occupation: 'Researcher' } },
        initial,
      ),
    ).toBe(true);
    expect(
      hasUnsavedBaselineChanges({ ...initial, chronicDiseaseNames: ['', ''] }, initial),
    ).toBe(true);
  });

  it('leaves without prompting when the editor is unchanged', () => {
    const confirm = vi.fn(() => false);
    const onDiscard = vi.fn();

    confirmBaselineDiscard({
      hasUnsavedChanges: false,
      saving: false,
      locale: 'en',
      onDiscard,
      confirm,
    });

    expect(confirm).not.toHaveBeenCalled();
    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it('keeps dirty Serbian input when discard is rejected', () => {
    const confirm = vi.fn(() => false);
    const onDiscard = vi.fn();

    confirmBaselineDiscard({
      hasUnsavedChanges: true,
      saving: false,
      locale: 'sr',
      onDiscard,
      confirm,
    });

    expect(confirm).toHaveBeenCalledWith(
      `${t('sr', 'form.discardTitle')}\n\n${t('sr', 'form.discardBody')}`,
    );
    expect(onDiscard).not.toHaveBeenCalled();
  });

  it('leaves dirty input after discard is confirmed', () => {
    const onDiscard = vi.fn();

    confirmBaselineDiscard({
      hasUnsavedChanges: true,
      saving: false,
      locale: 'en',
      onDiscard,
      confirm: () => true,
    });

    expect(onDiscard).toHaveBeenCalledOnce();
  });
});
