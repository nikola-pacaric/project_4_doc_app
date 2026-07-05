import type { MedicationRecord, UserProfile } from '@project4/contracts';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import {
  createEntryPhotoSignedUrl,
  createPatientMedication,
  getPatientMedication,
  listEntryPhotos,
  uploadPreparedEntryPhoto,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { PHOTO_MIME_TYPE } from '@project4/photo';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { colors, sharedStyles } from '../theme';
import { toLocalDateInput, toLocalTimeInput } from '../utils/dateTime';
import { MedicationFormScreen, type ClientMedicationDraft } from './MedicationFormScreen';
import { PhotoUploadScreen, type PreparedPhoto } from './PhotoUploadScreen';

interface PatientMedicationScreenProps {
  client: AppSupabaseClient;
  entryToEdit?: { id: string; occurredAt: string } | null;
  onBack: () => void;
  onSaved: () => void;
  profile: UserProfile;
}

function createPhotoId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toDraft(record: MedicationRecord): ClientMedicationDraft {
  const occurredAt = new Date(record.occurredAt);
  return {
    entryId: record.entryId,
    name: record.name ?? '',
    dose: record.dose ?? '',
    takenAt: `${toLocalDateInput(occurredAt)} ${toLocalTimeInput(occurredAt)}`,
    reason: record.reason ?? '',
    isChronicTherapy: record.isChronicTherapy ?? undefined,
  };
}

export function PatientMedicationScreen({
  client,
  entryToEdit,
  onBack,
  onSaved,
  profile,
}: PatientMedicationScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [initialDraft, setInitialDraft] = useState<ClientMedicationDraft | null>(null);
  const [loading, setLoading] = useState(Boolean(entryToEdit));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingPhotoUris, setExistingPhotoUris] = useState<string[]>([]);
  const [photoTarget, setPhotoTarget] = useState<ClientMedicationDraft | null>(null);

  useEffect(() => {
    if (!entryToEdit) {
      setInitialDraft(null);
      setExistingPhotoUris([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
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
        setInitialDraft(toDraft(record));
        const photoUris = await Promise.all(
          photos.map((photo) => createEntryPhotoSignedUrl(client, photo.thumbnailPath)),
        );
        if (active) setExistingPhotoUris(photoUris);
      })
      .catch(() => {
        if (active) setError(t(locale, 'medication.loadError'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [client, entryToEdit, locale]);

  async function save(draft: ClientMedicationDraft) {
    setSaving(true);
    setError(null);
    try {
      const activeDraft = { ...draft };
      const savedRecord = await createPatientMedication(client, profile.id, activeDraft);

      if (activeDraft.localPhoto && savedRecord.entryId) {
        const photoId = createPhotoId();
        await uploadPreparedEntryPhoto(client, {
          contextLabel: activeDraft.name?.trim() || undefined,
          contextType: 'medication',
          entryId: savedRecord.entryId,
          patientId: profile.id,
          photoId,
          photoBody: activeDraft.localPhoto.photoBytes,
          thumbnailBody: activeDraft.localPhoto.thumbnailBytes,
          metadata: {
            originalFilename: activeDraft.localPhoto.originalFilename,
            mimeType: PHOTO_MIME_TYPE,
            widthPx: activeDraft.localPhoto.photo.width,
            heightPx: activeDraft.localPhoto.photo.height,
            sizeBytes: activeDraft.localPhoto.photoBytes.byteLength,
            thumbnail: {
              widthPx: activeDraft.localPhoto.thumbnail.width,
              heightPx: activeDraft.localPhoto.thumbnail.height,
              sizeBytes: activeDraft.localPhoto.thumbnailBytes.byteLength,
            },
          },
        });
      }
      onSaved();
    } catch {
      setError(t(locale, 'medication.saveError'));
    } finally {
      setSaving(false);
    }
  }

  async function handleAddPhoto(draft: ClientMedicationDraft) {
    setPhotoTarget(draft);
  }

  if (loading) {
    return (
      <View style={[sharedStyles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (photoTarget) {
    return (
      <PhotoUploadScreen
        client={client}
        contextLabel={photoTarget.name?.trim() || ''}
        contextType="medication"
        onBack={() => setPhotoTarget(null)}
        onPhotoPrepared={(preparedPhoto) => {
          setInitialDraft({
            ...photoTarget,
            localPhoto: preparedPhoto,
          });
          setPhotoTarget(null);
        }}
        profile={profile}
      />
    );
  }

  return (
    <MedicationFormScreen
      busy={saving}
      error={error}
      existingPhotoUris={existingPhotoUris}
      initialDraft={initialDraft ?? undefined}
      onAddPhoto={handleAddPhoto}
      onBack={onBack}
      onSave={save}
    />
  );
}
