import { isOtherFluidDraftStarted, type OtherFluidDraft } from '@project4/forms';
import { getActiveLocale, t } from '@project4/i18n';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { toLocalDateInput } from '../utils/dateTime';
import {
  getTactilePalette,
  tactileFieldLabelStyle,
  tactileFormLayout as layout,
  tactilePillInputStyle,
} from '../theme/tactileForm';
import { FormField } from './FormField';
import { TimePickerField } from './TimePickerField';
import { type PreparedPhoto } from '../screens/PhotoUploadScreen';
import { type PersistedEntryPhoto } from '../lib/persistedPhotos';

export interface ClientOtherFluidDraft extends OtherFluidDraft {
  existingPhotos?: PersistedEntryPhoto[];
  localPhoto?: PreparedPhoto | null;
}

interface OtherFluidFieldsProps {
  createFluid: () => ClientOtherFluidDraft;
  deletingPhotoIds?: ReadonlySet<string>;
  fluids: ClientOtherFluidDraft[];
  onAddPhoto?: (fluid: ClientOtherFluidDraft, index: number) => void;
  onChange: (fluids: ClientOtherFluidDraft[]) => void;
  onDeletePhoto?: (photo: PersistedEntryPhoto, index: number) => void;
}

export function OtherFluidFields({
  createFluid,
  deletingPhotoIds = new Set<string>(),
  fluids,
  onAddPhoto,
  onChange,
  onDeletePhoto,
}: OtherFluidFieldsProps) {
  const locale = getActiveLocale();
  const palette = getTactilePalette();
  // White controls on the soft fluid card so fields stay visible.
  const pill = {
    ...tactilePillInputStyle(palette),
    backgroundColor: palette.surface,
    borderColor: palette.outlineVariant,
    borderWidth: 1,
  };
  const label = tactileFieldLabelStyle(palette);

  function updateFluid(index: number, update: Partial<ClientOtherFluidDraft>) {
    onChange(
      fluids.map((fluid, fluidIndex) => (fluidIndex === index ? { ...fluid, ...update } : fluid)),
    );
  }

  function removeFluid(index: number) {
    const remainingFluids = fluids.filter((_, fluidIndex) => fluidIndex !== index);
    onChange(remainingFluids);
  }

  function updateFluidTime(index: number, value: string) {
    const current = fluids[index];
    const date = current?.occurredAt?.slice(0, 10) ?? toLocalDateInput(new Date());
    updateFluid(index, { occurredAt: `${date} ${value}` });
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: palette.onSurface }]}>
        {t(locale, 'fluid.sectionTitle')}
      </Text>
      <Text style={[styles.help, { color: palette.onSurfaceVariant }]}>
        {t(locale, 'fluid.sectionHelp')}
      </Text>

      {fluids.map((fluid, index) => (
        <View
          key={fluid.entryId ?? `fluid-${index}`}
          style={[
            styles.fluidCard,
            {
              backgroundColor: palette.surfaceContainerLow,
              borderColor: palette.outlineVariant,
            },
          ]}
        >
          <TimePickerField
            label={t(locale, 'fluid.time')}
            labelStyle={label}
            onChange={(value) => updateFluidTime(index, value)}
            placeholder={t(locale, 'fluid.timePlaceholder')}
            style={pill}
            value={fluid.occurredAt?.slice(11, 16) ?? ''}
            valueStyle={{ color: palette.onSurface }}
          />
          <FormField
            enableVoice
            label={t(locale, 'fluid.name')}
            labelStyle={label}
            onChangeText={(value) => updateFluid(index, { name: value })}
            style={pill}
            value={fluid.name ?? ''}
          />

          {fluid.localPhoto ? (
            <View style={styles.photoRow}>
              <Image source={{ uri: fluid.localPhoto.photo.uri }} style={styles.photo} />
              <Pressable
                accessibilityRole="button"
                onPress={() => updateFluid(index, { localPhoto: null })}
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
              onPress={() => onAddPhoto(fluid, index)}
              style={({ pressed }) => [
                layout.dashedAdd,
                { borderColor: 'rgba(166, 53, 83, 0.25)' },
                pressed && layout.pressed,
              ]}
            >
              <Text style={{ color: palette.primary, fontSize: 14, fontWeight: '600' }}>
                {t(locale, 'photo.add')}
              </Text>
            </Pressable>
          ) : null}

          {fluid.existingPhotos?.length ? (
            <View style={styles.savedPhotos}>
              <Text style={[layout.helpText, { color: palette.onSurface, fontWeight: '700' }]}>
                {t(locale, 'photo.savedPhotos')}
              </Text>
              <View style={styles.photoList}>
                {fluid.existingPhotos.map((photo) => (
                  <View key={photo.id} style={styles.savedPhoto}>
                    <Image source={{ uri: photo.uri }} style={styles.photo} />
                    {onDeletePhoto ? (
                      <Pressable
                        accessibilityRole="button"
                        disabled={deletingPhotoIds.has(photo.id)}
                        onPress={() => onDeletePhoto(photo, index)}
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

          {fluids.length > 1 || isOtherFluidDraftStarted(fluid) ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => removeFluid(index)}
              style={({ pressed }) => [
                layout.primaryButton,
                {
                  backgroundColor: palette.primary,
                  shadowColor: palette.primary,
                },
                pressed && layout.pressed,
              ]}
            >
              <Text style={[layout.buttonLabel, { color: palette.onPrimary }]}>
                {t(locale, 'fluid.remove')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      <Pressable
        accessibilityRole="button"
        onPress={() => onChange([...fluids, createFluid()])}
        style={({ pressed }) => [
          layout.secondaryButton,
          { borderColor: palette.primary },
          pressed && layout.pressed,
        ]}
      >
        <Text style={[layout.buttonLabel, { color: palette.primary }]}>
          ＋ {t(locale, 'fluid.add')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  help: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: -8,
  },
  fluidCard: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
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
    gap: 8,
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
