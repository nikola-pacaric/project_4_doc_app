import type { PatientEntry, UserProfile } from '@project4/contracts';
import {
  normalizeNoteDateTime,
  noteDraftDefaults,
  validateNote,
  type NoteDraft,
} from '@project4/forms';
import { getActiveLocale, t } from '@project4/i18n';
import {
  createPendingNoteUpdate,
  createPendingTextEntry,
  type LocalPendingEntry,
} from '@project4/sync';
import {
  createPatientNote,
  isTransientSupabaseError,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { useState, type FormEvent } from 'react';

import { ScreenHeader } from '../components/ScreenHeader';
import { StatusMessage } from '../components/StatusMessage';
import { VoiceTextField } from '../components/VoiceTextField';

interface NoteFormScreenProps {
  client: AppSupabaseClient;
  entryToEdit?: PatientEntry | null;
  onBack: () => void;
  onPendingSaved: (entry: LocalPendingEntry) => void;
  onSaved: (pending?: boolean) => void;
  profile: UserProfile;
}

function toDatetimeLocal(value: Date): string {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

function createInitialDraft(entryToEdit?: PatientEntry | null): NoteDraft {
  if (entryToEdit) {
    return {
      entryId: entryToEdit.id,
      text: entryToEdit.text ?? '',
      occurredAt: toDatetimeLocal(new Date(entryToEdit.occurredAt)),
    };
  }

  return {
    ...noteDraftDefaults,
    occurredAt: toDatetimeLocal(new Date()),
  };
}

export function NoteFormScreen({
  client,
  entryToEdit,
  onBack,
  onPendingSaved,
  onSaved,
  profile,
}: NoteFormScreenProps) {
  const locale = getActiveLocale();
  const [draft, setDraft] = useState<NoteDraft>(() => createInitialDraft(entryToEdit));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof NoteDraft>(field: K, value: NoteDraft[K]) {
    setError(null);
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateDateTime(date: string, time: string) {
    update('occurredAt', `${date} ${time}`);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!validateNote(draft).valid) {
      setError(t(locale, 'note.requiredError'));
      return;
    }

    setSaving(true);
    setError(null);
    const occurredAt = normalizeNoteDateTime(draft.occurredAt);
    const text = draft.text?.trim();
    const pendingCreate =
      !entryToEdit && occurredAt && text
        ? createPendingTextEntry({ patientId: profile.id, text, occurredAt })
        : null;
    try {
      await createPatientNote(client, profile.id, draft, {
        clientEntryId: pendingCreate?.id,
      });
      onSaved(false);
    } catch (saveError) {
      if (isTransientSupabaseError(saveError) && entryToEdit && occurredAt && text) {
        onPendingSaved(
          createPendingNoteUpdate({
            entryId: entryToEdit.id,
            occurredAt,
            text,
          }),
        );
        onSaved(true);
        return;
      }
      if (isTransientSupabaseError(saveError) && pendingCreate) {
        onPendingSaved(pendingCreate);
        onSaved(true);
        return;
      }
      setError(t(locale, 'note.saveError'));
    } finally {
      setSaving(false);
    }
  }

  const date = draft.occurredAt?.slice(0, 10) ?? '';
  const time = draft.occurredAt?.slice(11, 16) ?? '';

  return (
    <main className="baseline-layout structured-entry-layout">
      <div className="baseline-toolbar">
        <ScreenHeader
          eyebrow={t(locale, 'role.patient')}
          subtitle={t(locale, 'note.subtitle')}
          title={t(locale, 'note.title')}
        />
      </div>

      <form className="structured-entry-form" onSubmit={(event) => void submit(event)}>
        <fieldset className="structured-fieldset">
          <VoiceTextField
            label={t(locale, 'note.text')}
            onChange={(val) => update('text', val)}
            placeholder={t(locale, 'note.textPlaceholder')}
            required
            rows={7}
            value={draft.text ?? ''}
          />
        </fieldset>
        <div className="exercise-field-grid">
          <fieldset className="structured-fieldset">
            <legend>{t(locale, 'note.date')}</legend>
            <input aria-label={t(locale, 'note.date')} readOnly required value={date} />
          </fieldset>
          <fieldset className="structured-fieldset">
            <legend>{t(locale, 'note.time')}</legend>
            <input
              aria-label={t(locale, 'note.time')}
              onChange={(event) => updateDateTime(date, event.target.value)}
              placeholder={t(locale, 'note.timePlaceholder')}
              required
              type="time"
              value={time}
            />
          </fieldset>
        </div>

        {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
        <div className="button-row form-actions-row">
          <button className="secondary-button" disabled={saving} onClick={onBack} type="button">
            {t(locale, 'common.cancel')}
          </button>
          <button className="primary-button" disabled={saving} type="submit">
            {t(locale, 'note.save')}
          </button>
        </div>
      </form>
    </main>
  );
}
