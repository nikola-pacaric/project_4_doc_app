import { isNoStoolTodayEntry, type EntryKind, type PatientEntry } from '@project4/contracts';
import { DEFAULT_LOCALE, t, type TranslationKey } from '@project4/i18n';
import {
  createEntryPhotoSignedUrl,
  getDoctorLinkedPatientTimeline,
  listEntryPhotos,
  type AppSupabaseClient,
  type LinkedPatientSummary,
} from '@project4/supabase-client';
import { spacing } from '@project4/ui-tokens';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, sharedStyles } from '../theme';
import { formatEntryDate, formatEntryTime } from '../utils/dateTime';

interface DoctorLinkedPatientTimelineScreenProps {
  client: AppSupabaseClient;
  initialPatient: LinkedPatientSummary;
  onBack: () => void;
}

interface TimelineEntryPhoto {
  id: string;
  label: string;
  photoUrl: string;
  thumbnailUrl: string;
}

const entryIcons: Record<EntryKind, string> = {
  text: '📝',
  daily: '☀️',
  meal: '🍽️',
  fluid: '🥤',
  symptom: '⚠️',
  stool: '💩',
  medication: '💊',
  exercise: '🏃',
  menstruation: '🩸',
  note: '📝',
  custom: '📋',
};

function canHaveTimelinePhotos(entry: PatientEntry): boolean {
  return entry.kind === 'meal' || entry.kind === 'fluid' || entry.kind === 'medication';
}

function patientTitle(patient: LinkedPatientSummary): string {
  return patient.displayName?.trim() || patient.patientId.slice(0, 8).toUpperCase();
}

export function DoctorLinkedPatientTimelineScreen({
  client,
  initialPatient,
  onBack,
}: DoctorLinkedPatientTimelineScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [patient, setPatient] = useState(initialPatient);
  const [entries, setEntries] = useState<PatientEntry[]>([]);
  const [entryPhotos, setEntryPhotos] = useState<Record<string, TimelineEntryPhoto[]>>({});
  const [selectedPhoto, setSelectedPhoto] = useState<TimelineEntryPhoto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTimeline = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelectedPhoto(null);

    try {
      const timeline = await getDoctorLinkedPatientTimeline(client, initialPatient.patientId);
      setPatient(timeline.patient);
      setEntries(timeline.entries);
    } catch {
      setError(t(locale, 'doctor.timelineLoadError'));
      setEntries([]);
      setEntryPhotos({});
    } finally {
      setLoading(false);
    }
  }, [client, initialPatient.patientId, locale]);

  useEffect(() => {
    void loadTimeline();
  }, [loadTimeline]);

  useEffect(() => {
    let active = true;
    const photoEntries = entries.filter(canHaveTimelinePhotos);

    void (async () => {
      if (!photoEntries.length) {
        if (active) setEntryPhotos({});
        return;
      }

      try {
        const nextPhotos: Record<string, TimelineEntryPhoto[]> = {};
        await Promise.all(
          photoEntries.map(async (entry) => {
            const photos = (await listEntryPhotos(client, entry.id)).filter(
              (photo) => photo.contextType === entry.kind || photo.contextType === null,
            );
            const signedPhotos = await Promise.all(
              photos.map(async (photo) => ({
                id: photo.id,
                label:
                  photo.contextLabel?.trim() ||
                  t(locale, `entry.kind.${entry.kind}` as TranslationKey),
                photoUrl: await createEntryPhotoSignedUrl(client, photo.photoPath),
                thumbnailUrl: await createEntryPhotoSignedUrl(client, photo.thumbnailPath),
              })),
            );

            if (signedPhotos.length) nextPhotos[entry.id] = signedPhotos;
          }),
        );

        if (active) setEntryPhotos(nextPhotos);
      } catch {
        if (active) setEntryPhotos({});
      }
    })();

    return () => {
      active = false;
    };
  }, [client, entries, locale]);

  return (
    <SafeAreaView style={sharedStyles.formScreen}>
      <KeyboardAwareScrollView
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={sharedStyles.formScrollContent}
        contentInsetAdjustmentBehavior="automatic"
      >
        <ScreenHeader
          eyebrow={t(locale, 'role.doctor')}
          title={patientTitle(patient)}
          subtitle={t(locale, 'doctor.timelineSubtitle')}
        />

        <View style={styles.actions}>
          <View style={styles.action}>
            <PrimaryButton label={t(locale, 'common.back')} onPress={onBack} variant="secondary" />
          </View>
          <View style={styles.action}>
            <PrimaryButton
              label={t(locale, 'timeline.refresh')}
              onPress={() => void loadTimeline()}
              variant="secondary"
            />
          </View>
        </View>

        <Text style={styles.readOnly}>{t(locale, 'doctor.readOnlyNotice')}</Text>
        {error ? <Text style={sharedStyles.error}>{error}</Text> : null}
        {loading ? <ActivityIndicator color={colors.accent} size="large" /> : null}
        {!loading && !entries.length && !error ? (
          <Text style={styles.empty}>{t(locale, 'entry.empty')}</Text>
        ) : null}

        {selectedPhoto ? (
          <View style={styles.selectedPhotoPanel}>
            <Image source={{ uri: selectedPhoto.photoUrl }} style={styles.selectedPhoto} />
            <Text style={styles.photoLabel}>{selectedPhoto.label}</Text>
            <PrimaryButton
              label={t(locale, 'common.close')}
              onPress={() => setSelectedPhoto(null)}
              variant="secondary"
            />
          </View>
        ) : null}

        <View style={styles.list}>
          {entries.map((entry) => {
            const kindLabel = t(locale, `entry.kind.${entry.kind}` as TranslationKey);
            const title = isNoStoolTodayEntry(entry)
              ? t(locale, 'stool.noStoolToday')
              : entry.text?.trim() || kindLabel;
            const photos = entryPhotos[entry.id] ?? [];

            return (
              <View key={entry.id} style={styles.card}>
                <View style={styles.entryRow}>
                  <View style={styles.iconContainer}>
                    <Text style={styles.icon}>{entryIcons[entry.kind]}</Text>
                  </View>
                  <View style={styles.copy}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.meta}>
                      {formatEntryDate(entry.occurredAt, locale)} -{' '}
                      {formatEntryTime(entry.occurredAt, locale)}
                    </Text>
                    {entry.text && !isNoStoolTodayEntry(entry) ? (
                      <Text style={styles.kind}>{kindLabel}</Text>
                    ) : null}
                  </View>
                </View>
                {photos.length ? (
                  <View style={styles.photos}>
                    {photos.map((photo) => (
                      <Pressable
                        accessibilityRole="button"
                        key={photo.id}
                        onPress={() => setSelectedPhoto(photo)}
                        style={styles.photoButton}
                      >
                        <Image source={{ uri: photo.thumbnailUrl }} style={styles.thumbnail} />
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: { flex: 1 },
  readOnly: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.mutedText,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    padding: spacing.md,
  },
  empty: { color: colors.mutedText, fontSize: 15, lineHeight: 22 },
  list: { gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  entryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  icon: { fontSize: 21 },
  copy: { flex: 1, gap: 3 },
  title: { color: colors.text, fontSize: 16, fontWeight: '800', lineHeight: 22 },
  meta: { color: colors.mutedText, fontSize: 13, fontWeight: '600' },
  kind: { color: colors.accent, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  photos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingLeft: 48,
  },
  photoButton: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  thumbnail: {
    height: 72,
    width: 72,
  },
  selectedPhotoPanel: {
    alignItems: 'center',
    gap: spacing.sm,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.md,
  },
  selectedPhoto: {
    aspectRatio: 1,
    borderRadius: 8,
    maxHeight: 320,
    width: '100%',
  },
  photoLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
});
