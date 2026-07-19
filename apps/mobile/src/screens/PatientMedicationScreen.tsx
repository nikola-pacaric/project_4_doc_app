import type { MedicationRecord, UserProfile } from '@project4/contracts';
import { getActiveLocale, t } from '@project4/i18n';
import {
  createEntryPhotoSignedUrl,
  createPatientMedication,
  getPatientMedication,
  listEntryPhotos,
  uploadPreparedEntryPhoto,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { PHOTO_MIME_TYPE } from '@project4/photo';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { cleanupPreparedPhoto } from '../lib/preparedPhotos';
import { colors, sharedStyles } from '../theme';
import { toLocalDateInput, toLocalTimeInput } from '../utils/dateTime';
import { MedicationFormScreen, type ClientMedicationDraft } from './MedicationFormScreen';
import { PhotoUploadScreen, type PreparedPhoto } from './PhotoUploadScreen';

interface PatientMedicationScreenProps {
  client: AppSupabaseClient;
  entryToEdit?: { id: string; occurredAt: string } | null;
  onBack: () => void;
  onCancelProfile?: () => void;
  onCancelTimeline?: () => void;
  onSaved: () => void;
  profile: UserProfile;
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
  onCancelProfile,
  onCancelTimeline,
  onSaved,
  profile,
}: PatientMedicationScreenProps) {
  const locale = getActiveLocale();
  const [initialDraft, setInitialDraft] = useState<ClientMedicationDraft | null>(null);
  const [loading, setLoading] = useState(Boolean(entryToEdit));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingPhotoUris, setExistingPhotoUris] = useState<string[]>([]);
  const [photoTarget, setPhotoTarget] = useState<ClientMedicationDraft | null>(null);
  const savedEntryIdRef = useRef<string | null>(entryToEdit?.id ?? null);
  const preparedPhotoRef = useRef<PreparedPhoto | null>(null);
  const uploadedPhotoIdsRef = useRef(new Set<string>());

  useEffect(
    () => () => {
      void cleanupPreparedPhoto(preparedPhotoRef.current);
      preparedPhotoRef.current = null;
    },
    [],
  );

  useEffect(() => {
    savedEntryIdRef.current = entryToEdit?.id ?? null;
  }, [entryToEdit?.id]);

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
      const activeDraft = {
        ...draft,
        entryId: draft.entryId ?? savedEntryIdRef.current ?? undefined,
      };
      const savedRecord = await createPatientMedication(client, profile.id, activeDraft);
      savedEntryIdRef.current = savedRecord.entryId;

      const localPhoto = activeDraft.localPhoto;
      if (localPhoto && savedRecord.entryId && !uploadedPhotoIdsRef.current.has(localPhoto.uploadId)) {
        await uploadPreparedEntryPhoto(client, {
          contextLabel: activeDraft.name?.trim() || undefined,
          contextType: 'medication',
          entryId: savedRecord.entryId,
          patientId: profile.id,
          photoId: localPhoto.uploadId,
          photoBody: localPhoto.photoBytes,
          thumbnailBody: localPhoto.thumbnailBytes,
          metadata: {
            originalFilename: localPhoto.originalFilename,
            mimeType: PHOTO_MIME_TYPE,
            widthPx: localPhoto.photo.width,
            heightPx: localPhoto.photo.height,
            sizeBytes: localPhoto.photoBytes.byteLength,
            thumbnail: {
              widthPx: localPhoto.thumbnail.width,
              heightPx: localPhoto.thumbnail.height,
              sizeBytes: localPhoto.thumbnailBytes.byteLength,
            },
          },
        });
        uploadedPhotoIdsRef.current.add(localPhoto.uploadId);
      }
      if (localPhoto) {
        if (preparedPhotoRef.current?.uploadId === localPhoto.uploadId) {
          preparedPhotoRef.current = null;
        }
        await cleanupPreparedPhoto(localPhoto);
      }
      onSaved();
    } catch {
      setError(t(locale, 'medication.saveError'));
    } finally {
      setSaving(false);
    }
  }

  async function handleAddPhoto(draft: ClientMedicationDraft) {
    const retainedPhoto = preparedPhotoRef.current;
    if (retainedPhoto && retainedPhoto.uploadId !== draft.localPhoto?.uploadId) {
      preparedPhotoRef.current = null;
      await cleanupPreparedPhoto(retainedPhoto);
    }
    setPhotoTarget(draft);
  }

  async function leaveForm(callback: (() => void) | undefined) {
    const retainedPhoto = preparedPhotoRef.current;
    preparedPhotoRef.current = null;
    await cleanupPreparedPhoto(retainedPhoto);
    callback?.();
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
        onPhotoPrepared={async (preparedPhoto) => {
          const previousPhoto = preparedPhotoRef.current;
          preparedPhotoRef.current = preparedPhoto;
          setInitialDraft({
            ...photoTarget,
            localPhoto: preparedPhoto,
          });
          setPhotoTarget(null);
          if (previousPhoto?.uploadId !== preparedPhoto.uploadId) {
            await cleanupPreparedPhoto(previousPhoto);
          }
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
      onBack={() => void leaveForm(onBack)}
      onCancelProfile={
        onCancelProfile ? () => void leaveForm(onCancelProfile) : undefined
      }
      onCancelTimeline={
        onCancelTimeline ? () => void leaveForm(onCancelTimeline) : undefined
      }
      onSave={save}
    />
  );
}
