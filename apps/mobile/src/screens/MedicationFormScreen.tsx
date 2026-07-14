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

export interface ClientMedicationDraft extends MedicationDraft {
  localPhoto?: PreparedPhoto | null;
}

interface MedicationFormScreenProps {
  busy?: boolean;
  error?: string | null;
  existingPhotoUris?: string[];
  initialDraft?: ClientMedicationDraft;
  onAddPhoto?: (draft: ClientMedicationDraft) => void;
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
  error,
  existingPhotoUris = [],
  initialDraft,
  onAddPhoto,
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
            draft.isChronicTherapy === undefined
              ? undefined
              : draft.isChronicTherapy
                ? 'yes'
                : 'no'
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

        {existingPhotoUris.length ? (
          <View style={styles.savedPhotos}>
            <Text style={[layout.helpText, { color: palette.onSurface, fontWeight: '700' }]}>
              {t(locale, 'photo.savedPhotos')}
            </Text>
            <View style={styles.photoList}>
              {existingPhotoUris.map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.photo} />
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
});
