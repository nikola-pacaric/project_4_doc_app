import { PHOTO_JPEG_QUALITY, PHOTO_MAX_WIDTH_PX, PHOTO_MIME_TYPE } from '@project4/photo';
import { type UserProfile } from '@project4/contracts';
import { getActiveLocale, t, type TranslationKey } from '@project4/i18n';
import { uploadPreparedEntryPhoto, type AppSupabaseClient } from '@project4/supabase-client';
import { spacing } from '@project4/ui-tokens';
import { manipulateAsync, SaveFormat, type ImageResult } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Image, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, sharedStyles, createThemedStyles } from '../theme';

export interface PhotoUploadScreenProps {
  client: AppSupabaseClient;
  contextLabel: string;
  contextType: 'meal' | 'fluid' | 'medication';
  entryId?: string | null;
  onBack: () => void;
  onUploaded?: () => void | Promise<void>;
  onPhotoPrepared?: (photo: PreparedPhoto) => void | Promise<void>;
  profile: UserProfile;
}

export interface PreparedPhoto {
  originalFilename?: string;
  photo: ImageResult;
  photoBytes: Uint8Array;
  thumbnail: ImageResult;
  thumbnailBytes: Uint8Array;
}

type ManipulatedImageResult = ImageResult & { base64?: string };

function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/\s/g, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const byteLength = Math.floor((clean.length * 3) / 4) - padding;
  const bytes = new Uint8Array(byteLength);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup: Record<string, number> = {};

  for (let index = 0; index < chars.length; index += 1) {
    lookup[chars.charAt(index)] = index;
  }

  function decode(char: string | undefined): number {
    if (!char || lookup[char] === undefined) {
      throw new Error('Prepared image bytes were not valid base64.');
    }
    return lookup[char];
  }

  let byteIndex = 0;
  for (let index = 0; index < clean.length; index += 4) {
    const first = decode(clean[index]);
    const second = decode(clean[index + 1]);
    const third = clean[index + 2] === '=' ? 0 : decode(clean[index + 2]);
    const fourth = clean[index + 3] === '=' ? 0 : decode(clean[index + 3]);

    const triplet = (first << 18) | (second << 12) | (third << 6) | fourth;
    if (byteIndex < byteLength) bytes[byteIndex++] = (triplet >> 16) & 0xff;
    if (byteIndex < byteLength) bytes[byteIndex++] = (triplet >> 8) & 0xff;
    if (byteIndex < byteLength) bytes[byteIndex++] = triplet & 0xff;
  }

  return bytes;
}

function imageResultBytes(image: ManipulatedImageResult): Uint8Array {
  if (!image.base64) {
    throw new Error('Prepared image did not include JPEG bytes.');
  }

  return base64ToBytes(image.base64);
}

function createPhotoId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function resizeActions(width: number | undefined, targetWidth: number) {
  if (!width || width <= targetWidth) return [];
  return [{ resize: { width: targetWidth } }];
}

export function PhotoUploadScreen({
  client,
  contextLabel,
  contextType,
  entryId,
  onBack,
  onUploaded,
  onPhotoPrepared,
  profile,
}: PhotoUploadScreenProps) {
  const locale = getActiveLocale();
  const [preparedPhoto, setPreparedPhoto] = useState<PreparedPhoto | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function prepareAsset(asset: ImagePicker.ImagePickerAsset) {
    const photo = (await manipulateAsync(
      asset.uri,
      resizeActions(asset.width, PHOTO_MAX_WIDTH_PX),
      { base64: true, compress: PHOTO_JPEG_QUALITY, format: SaveFormat.JPEG },
    )) as ManipulatedImageResult;
    const thumbnail = (await manipulateAsync(photo.uri, resizeActions(photo.width, 320), {
      base64: true,
      compress: 0.72,
      format: SaveFormat.JPEG,
    })) as ManipulatedImageResult;
    const photoBytes = imageResultBytes(photo);
    const thumbnailBytes = imageResultBytes(thumbnail);

    setPreparedPhoto({
      originalFilename: asset.fileName ?? undefined,
      photo,
      photoBytes,
      thumbnail,
      thumbnailBytes,
    });
  }

  async function pickPhoto() {
    setPreparing(true);
    setError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(false);
      if (!permission.granted) {
        setError(t(locale, 'photo.permissionDenied'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        base64: false,
        exif: false,
        mediaTypes: ['images'],
        quality: 1,
        selectionLimit: 1,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      await prepareAsset(result.assets[0]);
    } catch {
      setError(t(locale, 'photo.prepareError'));
    } finally {
      setPreparing(false);
    }
  }

  async function takePhoto() {
    setPreparing(true);
    setError(null);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError(t(locale, 'photo.cameraPermissionDenied'));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        base64: false,
        exif: false,
        mediaTypes: ['images'],
        quality: 1,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      await prepareAsset(result.assets[0]);
    } catch {
      setError(t(locale, 'photo.prepareError'));
    } finally {
      setPreparing(false);
    }
  }

  async function handleFinalAction() {
    if (!preparedPhoto) return;

    if (onPhotoPrepared) {
      setSaving(true);
      try {
        await onPhotoPrepared(preparedPhoto);
      } catch {
        setError(t(locale, 'photo.prepareError'));
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!entryId) {
      setError(t(locale, 'photo.uploadError'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await uploadPreparedEntryPhoto(client, {
        contextLabel,
        contextType,
        entryId,
        patientId: profile.id,
        photoId: createPhotoId(),
        photoBody: preparedPhoto.photoBytes,
        thumbnailBody: preparedPhoto.thumbnailBytes,
        metadata: {
          originalFilename: preparedPhoto.originalFilename,
          mimeType: PHOTO_MIME_TYPE,
          widthPx: preparedPhoto.photo.width,
          heightPx: preparedPhoto.photo.height,
          sizeBytes: preparedPhoto.photoBytes.byteLength,
          thumbnail: {
            widthPx: preparedPhoto.thumbnail.width,
            heightPx: preparedPhoto.thumbnail.height,
            sizeBytes: preparedPhoto.thumbnailBytes.byteLength,
          },
        },
      });
      if (onUploaded) {
        await onUploaded();
      }
    } catch {
      setError(t(locale, 'photo.uploadError'));
    } finally {
      setSaving(false);
    }
  }

  const busy = preparing || saving;

  return (
    <SafeAreaView style={sharedStyles.formScreen}>
      <KeyboardAwareScrollView
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={sharedStyles.formScrollContent}
        contentInsetAdjustmentBehavior="automatic"
      >
        <ScreenHeader eyebrow={t(locale, 'photo.eyebrow')} title={t(locale, 'photo.title')} />

        <View style={styles.entrySummary}>
          <Text style={styles.entryTitle}>{contextLabel || t(locale, 'photo.entryFallback')}</Text>
          <Text style={styles.entryMeta}>
            {t(locale, `photo.context.${contextType}` as TranslationKey)}
          </Text>
        </View>

        <Text style={styles.warning}>{t(locale, 'photo.storageWarning')}</Text>

        {preparedPhoto ? (
          <View style={styles.previewBlock}>
            <Image
              accessibilityLabel={t(locale, 'photo.preview')}
              source={{ uri: preparedPhoto.photo.uri }}
              style={styles.preview}
            />
            <Text style={styles.meta}>
              {t(locale, 'photo.sizeSummary')
                .replace('{width}', String(preparedPhoto.photo.width))
                .replace('{height}', String(preparedPhoto.photo.height))
                .replace('{kilobytes}', String(Math.round(preparedPhoto.photoBytes.byteLength / 1024)))}
            </Text>
          </View>
        ) : (
          <View style={styles.emptyPreview}>
            {preparing ? <ActivityIndicator color={colors.accent} /> : null}
            <Text style={styles.emptyText}>{t(locale, 'photo.pickHelp')}</Text>
          </View>
        )}

        {error ? <Text style={sharedStyles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <PrimaryButton label={t(locale, 'common.back')} onPress={onBack} variant="secondary" />
          <PrimaryButton
            busy={preparing}
            disabled={saving}
            label={t(locale, preparedPhoto ? 'photo.replace' : 'photo.pick')}
            onPress={() => void pickPhoto()}
            variant="secondary"
          />
          <PrimaryButton
            busy={preparing}
            disabled={saving}
            label={t(locale, 'photo.take')}
            onPress={() => void takePhoto()}
            variant="secondary"
          />
          <PrimaryButton
            busy={saving}
            disabled={!preparedPhoto || busy}
            label={t(locale, onPhotoPrepared ? 'common.save' : 'photo.upload')}
            onPress={() => void handleFinalAction()}
          />
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = createThemedStyles(() => StyleSheet.create({
  entrySummary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  entryTitle: { color: colors.text, fontSize: 16, fontWeight: '800', lineHeight: 22 },
  entryMeta: { color: colors.mutedText, fontSize: 13, fontWeight: '700' },
  warning: { color: colors.mutedText, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  previewBlock: { gap: spacing.sm },
  preview: {
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    width: '100%',
  },
  meta: { color: colors.mutedText, fontSize: 13, fontWeight: '700', lineHeight: 19 },
  emptyPreview: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: spacing.sm,
    minHeight: 180,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emptyText: { color: colors.mutedText, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  actions: { gap: spacing.sm },
}));
