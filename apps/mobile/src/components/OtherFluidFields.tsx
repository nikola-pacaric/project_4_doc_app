import { isOtherFluidDraftStarted, type OtherFluidDraft } from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { spacing } from '@project4/ui-tokens';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';
import { toLocalDateInput } from '../utils/dateTime';
import { FormField } from './FormField';
import { PrimaryButton } from './PrimaryButton';
import { TimePickerField } from './TimePickerField';
import { type PreparedPhoto } from '../screens/PhotoUploadScreen';

export interface ClientOtherFluidDraft extends OtherFluidDraft {
  existingPhotoUris?: string[];
  localPhoto?: PreparedPhoto | null;
}

interface OtherFluidFieldsProps {
  createFluid: () => ClientOtherFluidDraft;
  fluids: ClientOtherFluidDraft[];
  onAddPhoto?: (fluid: ClientOtherFluidDraft, index: number) => void;
  onChange: (fluids: ClientOtherFluidDraft[]) => void;
}

export function OtherFluidFields({
  createFluid,
  fluids,
  onAddPhoto,
  onChange,
}: OtherFluidFieldsProps) {
  const locale = DEFAULT_LOCALE;

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
      <Text style={styles.title}>{t(locale, 'fluid.sectionTitle')}</Text>
      <Text style={styles.help}>{t(locale, 'fluid.sectionHelp')}</Text>
      {fluids.map((fluid, index) => (
        <View style={styles.card} key={index}>
          <TimePickerField
            label={t(locale, 'fluid.time')}
            onChange={(value) => updateFluidTime(index, value)}
            placeholder={t(locale, 'fluid.timePlaceholder')}
            value={fluid.occurredAt?.slice(11, 16) ?? ''}
          />
          <FormField
            enableVoice
            label={t(locale, 'fluid.name')}
            onChangeText={(value) => updateFluid(index, { name: value })}
            value={fluid.name ?? ''}
          />
          {fluid.localPhoto ? (
            <View style={styles.photoPreviewContainer}>
              <Image source={{ uri: fluid.localPhoto.photo.uri }} style={styles.photoPreview} />
              <PrimaryButton
                label={t(locale, 'common.remove')}
                onPress={() => updateFluid(index, { localPhoto: null })}
                variant="danger"
              />
            </View>
          ) : onAddPhoto ? (
            <View style={styles.photoAction}>
              <PrimaryButton
                label={t(locale, 'photo.add')}
                onPress={() => onAddPhoto(fluid, index)}
                variant="secondary"
              />
            </View>
          ) : null}
          {fluid.existingPhotoUris?.length ? (
            <View style={styles.existingPhotos}>
              {fluid.existingPhotoUris.map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.photoPreview} />
              ))}
            </View>
          ) : null}
          {fluids.length > 1 || isOtherFluidDraftStarted(fluid) ? (
            <PrimaryButton
              label={t(locale, 'fluid.remove')}
              onPress={() => removeFluid(index)}
              variant="danger"
            />
          ) : null}
        </View>
      ))}
      <PrimaryButton
        label={`+ ${t(locale, 'fluid.add')}`}
        onPress={() => onChange([...fluids, createFluid()])}
        variant="secondary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: '#fffafb',
    padding: spacing.md,
  },
  title: { color: colors.text, fontSize: 19, fontWeight: '800' },
  help: { color: colors.mutedText, fontSize: 15, lineHeight: 22 },
  card: { gap: spacing.sm },
  photoAction: { marginTop: spacing.xs },
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
  existingPhotos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
