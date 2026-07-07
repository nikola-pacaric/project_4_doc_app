import {
  medicationDraftDefaults,
  normalizeMedicationDateTime,
  type MedicationDraft,
} from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { spacing } from '@project4/ui-tokens';
import { useState } from 'react';
import { Image, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { FormField } from '../components/FormField';
import { OptionButtons } from '../components/OptionButtons';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { TimePickerField } from '../components/TimePickerField';
import { colors, sharedStyles } from '../theme';
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
  onSave,
}: MedicationFormScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [draft, setDraft] = useState<ClientMedicationDraft>(() => initialDraft ?? createInitialDraft());
  const [showErrors, setShowErrors] = useState(false);

  function update<K extends keyof ClientMedicationDraft>(field: K, value: ClientMedicationDraft[K]) {
    setShowErrors(false);
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateTime(value: string) {
    const date = draft.takenAt?.slice(0, 10) ?? toLocalDateInput(new Date());
    update('takenAt', `${date} ${value}`);
  }

  function handleAddPhoto() {
    if (onAddPhoto) {
      onAddPhoto(draft);
    }
  }

  function save() {
    if (!normalizeMedicationDateTime(draft.takenAt)) {
      setShowErrors(true);
      return;
    }
    void onSave(draft);
  }

  return (
    <SafeAreaView style={sharedStyles.formScreen}>
      <KeyboardAwareScrollView
        keyboardDismissMode="on-drag"
        contentContainerStyle={sharedStyles.formScrollContent}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader eyebrow={t(locale, 'role.patient')} title={t(locale, 'medication.title')} />
        <Text style={sharedStyles.body}>{t(locale, 'medication.subtitle')}</Text>

        <FormField
          autoCapitalize="words"
          enableVoice
          label={t(locale, 'medication.name')}
          onChangeText={(value) => update('name', value)}
          placeholder={t(locale, 'medication.namePlaceholder')}
          value={draft.name ?? ''}
        />
        <FormField
          enableVoice
          label={t(locale, 'medication.dose')}
          onChangeText={(value) => update('dose', value)}
          placeholder={t(locale, 'medication.dosePlaceholder')}
          value={draft.dose ?? ''}
        />
        <View style={styles.chronicTherapyField}>
          <OptionButtons
            label={t(locale, 'medication.chronicTherapy')}
            onChange={(value) => update('isChronicTherapy', value === 'yes')}
            options={[
              { value: 'yes', label: t(locale, 'common.yes') },
              { value: 'no', label: t(locale, 'common.no') },
            ]}
            value={
              draft.isChronicTherapy === undefined
                ? undefined
                : draft.isChronicTherapy
                  ? 'yes'
                  : 'no'
            }
          />
          <Text style={styles.chronicTherapyHelp}>
            {t(locale, 'medication.chronicTherapyHelp')}
          </Text>
        </View>
        <TimePickerField
          label={t(locale, 'medication.timeTaken')}
          onChange={updateTime}
          placeholder={t(locale, 'medication.timePlaceholder')}
          value={draft.takenAt?.slice(11, 16) ?? ''}
        />
        <FormField
          enableVoice
          label={t(locale, 'medication.reason')}
          multiline
          onChangeText={(value) => update('reason', value)}
          placeholder={t(locale, 'medication.reasonPlaceholder')}
          value={draft.reason ?? ''}
        />
        {draft.localPhoto ? (
          <View style={styles.photoPreviewContainer}>
            <Image source={{ uri: draft.localPhoto.photo.uri }} style={styles.photoPreview} />
            <PrimaryButton
              label={t(locale, 'common.remove')}
              onPress={() => update('localPhoto', null)}
              variant="danger"
            />
          </View>
        ) : onAddPhoto ? (
          <PrimaryButton
            label={t(locale, 'photo.add')}
            onPress={handleAddPhoto}
            variant="secondary"
          />
        ) : null}
        {existingPhotoUris.length ? (
          <View style={styles.savedPhotos}>
            <Text style={styles.savedPhotosTitle}>{t(locale, 'photo.savedPhotos')}</Text>
            <View style={styles.savedPhotoList}>
              {existingPhotoUris.map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.photoPreview} />
              ))}
            </View>
          </View>
        ) : null}

        {showErrors ? (
          <Text selectable style={sharedStyles.error}>
            {t(locale, 'medication.timeRequiredError')}
          </Text>
        ) : null}
        {error ? (
          <Text selectable style={sharedStyles.error}>
            {error}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <View style={styles.action}>
            <PrimaryButton
              label={t(locale, 'common.cancel')}
              onPress={onBack}
              variant="secondary"
            />
          </View>
          <View style={styles.action}>
            <PrimaryButton busy={busy} label={t(locale, 'common.save')} onPress={save} />
          </View>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 'auto',
    paddingTop: spacing.md,
  },
  action: { flex: 1 },
  chronicTherapyField: {
    gap: spacing.xs,
  },
  chronicTherapyHelp: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  photoPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  photoPreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  savedPhotos: {
    gap: spacing.sm,
  },
  savedPhotosTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  savedPhotoList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
