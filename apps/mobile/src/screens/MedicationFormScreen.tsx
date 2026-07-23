import {
  medicationDraftDefaults,
  normalizeMedicationDateTime,
  type MedicationDraft,
} from '@project4/forms';
import { getActiveLocale, t } from '@project4/i18n';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { FormField } from '../components/FormField';
import { TactileChoiceRow } from '../components/TactileChoiceRow';
import { TactileFormShell, useTactileFormPalette } from '../components/TactileFormShell';
import { TactileSectionCard } from '../components/TactileSectionCard';
import { TimePickerField } from '../components/TimePickerField';
import {
  tactileFieldLabelStyle,
  tactileFormLayout as layout,
  tactileMultilineInputStyle,
  tactilePillInputStyle,
} from '../theme/tactileForm';
import { toLocalDateInput, toLocalTimeInput } from '../utils/dateTime';
import { type PreparedPhoto } from './PhotoUploadScreen';
import { type PersistedEntryPhoto } from '../lib/persistedPhotos';

export interface ClientMedicationDraft extends MedicationDraft {
  localPhoto?: PreparedPhoto | null;
}

interface MedicationFormScreenProps {
  busy?: boolean;
  deletingPhotoIds?: ReadonlySet<string>;
  error?: string | null;
  existingPhotos?: PersistedEntryPhoto[];
  initialDraft?: ClientMedicationDraft;
  onAddPhoto?: (draft: ClientMedicationDraft) => void;
  onDeletePhoto?: (photo: PersistedEntryPhoto) => void;
  onBack: () => void;
  onCancelProfile?: () => void;
  onCancelTimeline?: () => void;
  onSave: (draft: ClientMedicationDraft) => void | Promise<void>;
}

function createInitialDraft(): ClientMedicationDraft {
  const now = new Date();
  return {
    ...medicationDraftDefaults,
    takenAt: `${toLocalDateInput(now)} ${toLocalTimeInput(now)}`,
  };
}

export function MedicationFormScreen({
  busy = false,
  deletingPhotoIds = new Set<string>(),
  error,
  existingPhotos = [],
  initialDraft,
  onAddPhoto,
  onDeletePhoto,
  onBack,
  onCancelProfile,
  onCancelTimeline,
  onSave,
}: MedicationFormScreenProps) {
  const locale = getActiveLocale();
  const palette = useTactileFormPalette();
  const [draft, setDraft] = useState<ClientMedicationDraft>(
    () => initialDraft ?? createInitialDraft(),
  );
  const [showErrors, setShowErrors] = useState(false);
  const pill = tactilePillInputStyle(palette);
  const multi = tactileMultilineInputStyle(palette);
  const label = tactileFieldLabelStyle(palette);

  function update<K extends keyof ClientMedicationDraft>(
    field: K,
    value: ClientMedicationDraft[K],
  ) {
    setShowErrors(false);
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateTime(value: string) {
    const date = draft.takenAt?.slice(0, 10) ?? toLocalDateInput(new Date());
    update('takenAt', `${date} ${value}`);
  }

  function handleAddPhoto() {
    onAddPhoto?.(draft);
  }

  function save() {
    if (!normalizeMedicationDateTime(draft.takenAt)) {
      setShowErrors(true);
      return;
    }
    void onSave(draft);
  }

  return (
    <TactileFormShell
      error={showErrors ? t(locale, 'medication.timeRequiredError') : error}
      onCancelProfile={onCancelProfile}
      onCancelTimeline={onCancelTimeline}
      onCancelToday={onBack}
      onSave={save}
      saveBusy={busy}
      subtitle={t(locale, 'medication.subtitle')}
      title={t(locale, 'medication.title')}
    >
      <TactileSectionCard icon="💊" palette={palette} title={t(locale, 'medication.title')}>
        <FormField
          autoCapitalize="words"
          enableVoice
          label={t(locale, 'medication.name')}
          labelStyle={label}
          onChangeText={(value) => update('name', value)}
          placeholder={t(locale, 'medication.namePlaceholder')}
          style={pill}
          value={draft.name ?? ''}
        />
        <FormField
          enableVoice
          label={t(locale, 'medication.dose')}
          labelStyle={label}
          onChangeText={(value) => update('dose', value)}
          placeholder={t(locale, 'medication.dosePlaceholder')}
          style={pill}
          value={draft.dose ?? ''}
        />
        <TactileChoiceRow
          label={t(locale, 'medication.chronicTherapy')}
          mode="segmented"
          onChange={(value) => update('isChronicTherapy', value === 'yes')}
          options={[
            { value: 'yes', label: t(locale, 'common.yes') },
            { value: 'no', label: t(locale, 'common.no') },
          ]}
          palette={palette}
          value={
            draft.isChronicTherapy === undefined ? undefined : draft.isChronicTherapy ? 'yes' : 'no'
          }
        />
        <Text style={[layout.helpText, { color: palette.onSurfaceVariant }]}>
          {t(locale, 'medication.chronicTherapyHelp')}
        </Text>
        <TimePickerField
          label={t(locale, 'medication.timeTaken')}
          labelStyle={label}
          onChange={updateTime}
          placeholder={t(locale, 'medication.timePlaceholder')}
          style={pill}
          value={draft.takenAt?.slice(11, 16) ?? ''}
          valueStyle={{ color: palette.onSurface }}
        />
        <FormField
          enableVoice
          label={t(locale, 'medication.reason')}
          labelStyle={label}
          multiline
          onChangeText={(value) => update('reason', value)}
          placeholder={t(locale, 'medication.reasonPlaceholder')}
          style={multi}
          value={draft.reason ?? ''}
        />

        {draft.localPhoto ? (
          <View style={styles.photoRow}>
            <Image source={{ uri: draft.localPhoto.photo.uri }} style={styles.photo} />
            <Pressable
              accessibilityRole="button"
              onPress={() => update('localPhoto', null)}
              style={({ pressed }) => [
                layout.secondaryButton,
                { borderColor: palette.error, flex: 1 },
                pressed && layout.pressed,
              ]}
            >
              <Text style={[layout.buttonLabel, { color: palette.error }]}>
                {t(locale, 'common.remove')}
              </Text>
            </Pressable>
          </View>
        ) : onAddPhoto ? (
          <Pressable
            accessibilityRole="button"
            onPress={handleAddPhoto}
            style={({ pressed }) => [
              layout.dashedAdd,
              { borderColor: 'rgba(166, 53, 83, 0.25)' },
              pressed && layout.pressed,
            ]}
          >
            <Text style={{ color: palette.primary, fontSize: 14, fontWeight: '600' }}>
              + {t(locale, 'photo.add')}
            </Text>
          </Pressable>
        ) : null}

        {existingPhotos.length ? (
          <View style={styles.savedPhotos}>
            <Text style={[layout.helpText, { color: palette.onSurface, fontWeight: '700' }]}>
              {t(locale, 'photo.savedPhotos')}
            </Text>
            <View style={styles.photoList}>
              {existingPhotos.map((photo) => (
                <View key={photo.id} style={styles.savedPhoto}>
                  <Image source={{ uri: photo.uri }} style={styles.photo} />
                  {onDeletePhoto ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={deletingPhotoIds.has(photo.id)}
                      onPress={() => onDeletePhoto(photo)}
                      style={({ pressed }) => [
                        styles.deletePhotoButton,
                        { borderColor: palette.error },
                        pressed && layout.pressed,
                      ]}
                    >
                      <Text style={[styles.deletePhotoLabel, { color: palette.error }]}>
                        {t(
                          locale,
                          deletingPhotoIds.has(photo.id) ? 'photo.deleting' : 'common.delete',
                        )}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </TactileSectionCard>
    </TactileFormShell>
  );
}

const styles = StyleSheet.create({
  photoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  photo: {
    backgroundColor: '#f1ecf2',
    borderRadius: 12,
    height: 64,
    width: 64,
  },
  savedPhotos: { gap: 10 },
  photoList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  savedPhoto: {
    alignItems: 'center',
    gap: 6,
  },
  deletePhotoButton: {
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deletePhotoLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
});
