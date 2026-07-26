import type { BaselineProfileDraft } from '@project4/forms';
import { t, type Locale } from '@project4/i18n';

export interface ChronicTherapyInput {
  name: string;
  dose: string;
}

export interface BaselineEditorState {
  draft: BaselineProfileDraft;
  hasChronicDiseases: boolean | undefined;
  hasChronicTherapy: boolean | undefined;
  chronicDiseaseNames: string[];
  chronicTherapies: ChronicTherapyInput[];
}

export function hasUnsavedBaselineChanges(
  editorState: BaselineEditorState,
  savedState: BaselineEditorState,
): boolean {
  return JSON.stringify(editorState) !== JSON.stringify(savedState);
}

interface ConfirmBaselineDiscardOptions {
  hasUnsavedChanges: boolean;
  saving: boolean;
  locale: Locale;
  onDiscard: () => void;
  confirm?: (message: string) => boolean;
}

export function confirmBaselineDiscard({
  hasUnsavedChanges,
  saving,
  locale,
  onDiscard,
  confirm = (message) => window.confirm(message),
}: ConfirmBaselineDiscardOptions): void {
  if (
    !hasUnsavedChanges ||
    saving ||
    confirm(`${t(locale, 'form.discardTitle')}\n\n${t(locale, 'form.discardBody')}`)
  ) {
    onDiscard();
  }
}
