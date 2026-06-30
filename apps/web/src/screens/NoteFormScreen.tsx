import type { UserProfile } from '@project4/contracts';
import { noteDraftDefaults, validateNote, type NoteDraft } from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { createPatientNote, type AppSupabaseClient } from '@project4/supabase-client';
import { useState, type FormEvent } from 'react';

import { ScreenHeader } from '../components/ScreenHeader';

interface NoteFormScreenProps {
  client: AppSupabaseClient;
  onBack: () => void;
  onSaved: () => void;
  profile: UserProfile;
}

function toDatetimeLocal(value: Date): string {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

export function NoteFormScreen({ client, onBack, onSaved, profile }: NoteFormScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [draft, setDraft] = useState<NoteDraft>({
    ...noteDraftDefaults,
    occurredAt: toDatetimeLocal(new Date()),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof NoteDraft>(field: K, value: NoteDraft[K]) {
    setError(null);
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!validateNote(draft).valid) {
      setError(t(locale, 'note.requiredError'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createPatientNote(client, profile.id, draft);
      onSaved();
    } catch {
      setError(t(locale, 'note.saveError'));
    } finally {
      setSaving(false);
    }
  }

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
        <label>
          <span>{t(locale, 'note.text')}</span>
          <textarea
            autoFocus
            onChange={(event) => update('text', event.target.value)}
            placeholder={t(locale, 'note.textPlaceholder')}
            required
            rows={7}
            value={draft.text ?? ''}
          />
        </label>
        <label>
          <span>{t(locale, 'note.dateTime')}</span>
          <input
            onChange={(event) => update('occurredAt', event.target.value)}
            required
            type="datetime-local"
            value={draft.occurredAt ?? ''}
          />
        </label>

        {error ? <p className="notice error">{error}</p> : null}
        <div className="button-row form-actions-row">
          <button className="secondary-button" onClick={onBack} type="button">
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
