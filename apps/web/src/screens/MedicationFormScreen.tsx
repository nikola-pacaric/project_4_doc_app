import type { MedicationRecord, UserProfile } from '@project4/contracts';
import {
  medicationDraftDefaults,
  normalizeMedicationDateTime,
  type MedicationDraft,
} from '@project4/forms';
import { getActiveLocale, t } from '@project4/i18n';
import {
  createPatientMedication,
  getPatientMedication,
  listEntryPhotos,
  createEntryPhotoSignedUrl,
  uploadPreparedEntryPhoto,
  deleteEntryPhotos,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { useEffect, useState, type FormEvent } from 'react';

import { ScreenHeader } from '../components/ScreenHeader';
import { PhotoUploader, type ExistingWebPhoto } from '../components/PhotoUploader';
import { StatusMessage } from '../components/StatusMessage';
import { VoiceTextField } from '../components/VoiceTextField';
import { type WebPreparedPhoto } from '../utils/photoHelper';

interface MedicationFormScreenProps {
  client: AppSupabaseClient;
  entryToEdit?: { id: string; occurredAt: string } | null;
  onBack: () => void;
  onSaved: () => void;
  profile: UserProfile;
}

export interface ClientMedicationDraft extends MedicationDraft {
  existingPhotos?: ExistingWebPhoto[];
  localPhoto?: WebPreparedPhoto | null;
}

function toLocalDateTime(value: Date): string {
  const offset = value.getTimezoneOffset() * 60_000;
  const localValue = new Date(value.getTime() - offset).toISOString();
  return `${localValue.slice(0, 10)} ${localValue.slice(11, 16)}`;
}

function createInitialDraft(): ClientMedicationDraft {
  return {
    ...medicationDraftDefaults,
    takenAt: toLocalDateTime(new Date()),
  };
}

function toDraft(record: MedicationRecord): ClientMedicationDraft {
  return {
    entryId: record.entryId,
    name: record.name ?? '',
    dose: record.dose ?? '',
    takenAt: toLocalDateTime(new Date(record.occurredAt)),
    reason: record.reason ?? '',
    isChronicTherapy: record.isChronicTherapy ?? undefined,
  };
}

export function MedicationFormScreen({
  client,
  entryToEdit,
  onBack,
  onSaved,
  profile,
}: MedicationFormScreenProps) {
  const locale = getActiveLocale();
  const [draft, setDraft] = useState<ClientMedicationDraft>(createInitialDraft);
  const [loading, setLoading] = useState(Boolean(entryToEdit));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entryToEdit) {
      setTimeout(() => {
        setDraft(createInitialDraft());
        setLoading(false);
      }, 0);
      return;
    }

    let active = true;
    const loadingTimer = window.setTimeout(() => {
      if (!active) return;
      setLoading(true);
      setError(null);
    }, 0);
    void Promise.all([
      getPatientMedication(client, entryToEdit.id, entryToEdit.occurredAt),
      listEntryPhotos(client, entryToEdit.id),
    ])
      .then(async ([record, photos]) => {
        if (!active) return;
        if (!record) {
          setError(t(locale, 'medication.loadError'));
          return;
        }

        const draftData = toDraft(record);
        const existingPhotos: ExistingWebPhoto[] = await Promise.all(
          photos
            .filter((photo) => photo.contextType === 'medication' || photo.contextType === null)
            .map(async (photo) => ({
              id: photo.id,
              photoPath: photo.photoPath,
              thumbnailPath: photo.thumbnailPath,
              uri: await createEntryPhotoSignedUrl(client, photo.thumbnailPath),
            })),
        );

        setDraft({ ...draftData, existingPhotos });
      })
      .catch(() => {
        if (active) setError(t(locale, 'medication.loadError'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      window.clearTimeout(loadingTimer);
    };
  }, [client, entryToEdit, locale]);

  function update<K extends keyof ClientMedicationDraft>(
    field: K,
    value: ClientMedicationDraft[K],
  ) {
    setError(null);
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateTime(value: string) {
    const date = draft.takenAt?.slice(0, 10) ?? toLocalDateTime(new Date()).slice(0, 10);
    update('takenAt', `${date} ${value}`);
  }

  async function deleteSavedPhoto(photo: ExistingWebPhoto) {
    await deleteEntryPhotos(client, [photo]);
    setDraft((current) => ({
      ...current,
      existingPhotos: current.existingPhotos?.filter((candidate) => candidate.id !== photo.id),
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!normalizeMedicationDateTime(draft.takenAt)) {
      setError(t(locale, 'medication.timeRequiredError'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const saved = await createPatientMedication(client, profile.id, draft);
      setDraft((current) => ({ ...current, entryId: saved.entryId }));
      if (draft.localPhoto) {
        const photoId = draft.localPhoto.uploadId;
        await uploadPreparedEntryPhoto(client, {
          contextLabel: saved.name || undefined,
          contextType: 'medication',
          entryId: saved.entryId,
          patientId: profile.id,
          photoId,
          photoBody: draft.localPhoto.photoBody,
          thumbnailBody: draft.localPhoto.thumbnailBody,
          metadata: draft.localPhoto.metadata,
        });
      }
      onSaved();
    } catch {
      setError(t(locale, 'medication.saveError'));
    } finally {
      setSaving(false);
    }
  }

  const time = draft.takenAt?.slice(11, 16) ?? '';

  return (
    <main className="baseline-layout structured-entry-layout">
      <div className="baseline-toolbar">
        <ScreenHeader
          eyebrow={t(locale, 'role.patient')}
          subtitle={t(locale, 'medication.subtitle')}
          title={t(locale, 'medication.title')}
        />
      </div>

      {loading ? <p className="empty-state">{t(locale, 'app.loading')}</p> : null}
      {!loading ? (
        <form className="structured-entry-form" onSubmit={(event) => void submit(event)}>
          <fieldset className="structured-fieldset">
            <VoiceTextField
              label={t(locale, 'medication.name')}
              onChange={(value) => update('name', value)}
              placeholder={t(locale, 'medication.namePlaceholder')}
              type="text"
              value={draft.name ?? ''}
            />
          </fieldset>
          <fieldset className="structured-fieldset">
            <VoiceTextField
              label={t(locale, 'medication.dose')}
              onChange={(value) => update('dose', value)}
              placeholder={t(locale, 'medication.dosePlaceholder')}
              type="text"
              value={draft.dose ?? ''}
            />
          </fieldset>
          <fieldset className="structured-fieldset conditional-question">
            <legend>{t(locale, 'medication.chronicTherapy')}</legend>
            <p className="field-help">{t(locale, 'medication.chronicTherapyHelp')}</p>
            <div className="choice-row" role="radiogroup">
              {[
                { value: true, label: t(locale, 'common.yes') },
                { value: false, label: t(locale, 'common.no') },
              ].map((option) => (
                <button
                  aria-checked={draft.isChronicTherapy === option.value}
                  className={draft.isChronicTherapy === option.value ? 'selected' : ''}
                  key={String(option.value)}
                  onClick={() => update('isChronicTherapy', option.value)}
                  role="radio"
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="structured-fieldset">
            <legend>{t(locale, 'medication.timeTaken')}</legend>
            <input
              aria-label={t(locale, 'medication.timeTaken')}
              onChange={(event) => updateTime(event.target.value)}
              placeholder={t(locale, 'medication.timePlaceholder')}
              type="time"
              value={time}
            />
          </fieldset>
          <fieldset className="structured-fieldset">
            <VoiceTextField
              label={t(locale, 'medication.reason')}
              onChange={(value) => update('reason', value)}
              placeholder={t(locale, 'medication.reasonPlaceholder')}
              rows={4}
              type="textarea"
              value={draft.reason ?? ''}
            />
          </fieldset>

          <fieldset className="structured-fieldset">
            <legend>{t(locale, 'photo.title')}</legend>
            <PhotoUploader
              existingPhotos={draft.existingPhotos}
              localPhoto={draft.localPhoto}
              onPhotoSelected={(photo) => update('localPhoto', photo)}
              onDeleteExistingPhoto={deleteSavedPhoto}
            />
          </fieldset>

          {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
          <div className="button-row form-actions-row">
            <button className="secondary-button" onClick={onBack} type="button">
              {t(locale, 'common.cancel')}
            </button>
            <button className="primary-button" disabled={saving} type="submit">
              {t(locale, 'medication.save')}
            </button>
          </div>
        </form>
      ) : null}
    </main>
  );
}
