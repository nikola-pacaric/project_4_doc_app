import {
  entryKindIcon,
  entryKindIconStyle,
  isNoStoolTodayEntry,
  type ExportMode,
  type PatientBaselineProfile,
  type PatientEntry,
} from '@project4/contracts';
import { getActiveLocale, t, type TranslationKey } from '@project4/i18n';
import {
  createDoctorPatientExportBundle,
  createEntryPhotoSignedUrl,
  getDoctorLinkedPatientTimeline,
  listEntryPhotos,
  type AppSupabaseClient,
  type DoctorCheckpointStatus,
  type DoctorDayStatus,
  type DoctorTimelineEntry,
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
import { DatePickerField } from '../components/DatePickerField';
import {
  DoctorBaselineDetails,
  DoctorEntryMedicalDetails,
} from '../components/DoctorMedicalDetails';
import { MonthPickerField } from '../components/MonthPickerField';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { SelectField } from '../components/SelectField';
import { StatusMessage } from '../components/StatusMessage';
import { downloadDoctorExportImageBytes, shareDoctorExportBundle } from '../lib/doctorExport';
import { colors, sharedStyles, createThemedStyles } from '../theme';
import {
  formatEntryDate,
  formatEntryTime,
  toLocalDateInput,
  toLocalMonthInput,
} from '../utils/dateTime';

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

const exportModeOptions: { labelKey: TranslationKey; value: ExportMode }[] = [
  { labelKey: 'doctor.exportAllData', value: 'all_data' },
  { labelKey: 'doctor.exportAllDataWithImages', value: 'all_data_with_images' },
  { labelKey: 'doctor.exportImagesOnly', value: 'images_only_with_labels' },
];

const exportRangeOptions: {
  labelKey: TranslationKey;
  value: 'selected_day' | 'partial_month' | 'all_time';
}[] = [
  { labelKey: 'doctor.exportSelectedDay', value: 'selected_day' },
  { labelKey: 'doctor.exportPartialMonth', value: 'partial_month' },
  { labelKey: 'doctor.exportAllTime', value: 'all_time' },
];

function canHaveTimelinePhotos(entry: PatientEntry): boolean {
  return entry.kind === 'meal' || entry.kind === 'fluid' || entry.kind === 'medication';
}

function patientTitle(patient: LinkedPatientSummary): string {
  return patient.displayName?.trim() || patient.patientId.slice(0, 8).toUpperCase();
}

function dayStatusKey(status: DoctorDayStatus): TranslationKey {
  const keys: Record<DoctorDayStatus, TranslationKey> = {
    submitted: 'doctor.dayStatus.submitted',
    in_progress: 'doctor.dayStatus.inProgress',
    day_ended_incomplete: 'doctor.dayStatus.endedIncomplete',
    no_activity: 'doctor.dayStatus.noActivity',
  };
  return keys[status];
}

function checkpointLabel(
  locale: ReturnType<typeof getActiveLocale>,
  status: DoctorCheckpointStatus,
  type: 'symptom' | 'stool',
): string {
  if (status === 'recorded') return t(locale, 'doctor.checkpoint.recorded');
  if (status === 'missing') return t(locale, 'doctor.checkpoint.missing');
  return t(
    locale,
    type === 'symptom' ? 'doctor.checkpoint.noneSymptoms' : 'doctor.checkpoint.noneStool',
  );
}

function formatAdherenceDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    weekday: 'short',
  }).format(new Date(`${date}T12:00:00.000Z`));
}

function submittedCount(patient: LinkedPatientSummary, locale: ReturnType<typeof getActiveLocale>) {
  return t(locale, 'doctor.adherenceSubmittedCount')
    .replace('{submitted}', String(patient.adherence.submittedDays))
    .replace('{total}', String(patient.adherence.totalDays));
}

function medicalEntryTitle(
  locale: ReturnType<typeof getActiveLocale>,
  entry: DoctorTimelineEntry,
  fallback: string,
): string {
  const details = entry.medicalDetails;
  if (details.meal?.name) return details.meal.name;
  if (details.fluid?.name) return details.fluid.name;
  if (details.medication?.name) return details.medication.name;
  if (details.exercise?.activity) return details.exercise.activity;
  if (details.symptom) {
    return details.symptom.type === 'other' && details.symptom.customType
      ? details.symptom.customType
      : t(locale, `symptom.type.${details.symptom.type}` as TranslationKey);
  }
  return entry.text?.trim() || fallback;
}

export function DoctorLinkedPatientTimelineScreen({
  client,
  initialPatient,
  onBack,
}: DoctorLinkedPatientTimelineScreenProps) {
  const locale = getActiveLocale();
  const [patient, setPatient] = useState(initialPatient);
  const [baseline, setBaseline] = useState<PatientBaselineProfile | null>(null);
  const [entries, setEntries] = useState<DoctorTimelineEntry[]>([]);
  const [entryPhotos, setEntryPhotos] = useState<Record<string, TimelineEntryPhoto[]>>({});
  const [selectedPhoto, setSelectedPhoto] = useState<TimelineEntryPhoto | null>(null);
  const [exportMode, setExportMode] = useState<ExportMode>('all_data_with_images');
  const [exportRangeType, setExportRangeType] = useState<
    'selected_day' | 'partial_month' | 'all_time'
  >('selected_day');
  const [exportDate, setExportDate] = useState(() => toLocalDateInput(new Date()));
  const [exportMonth, setExportMonth] = useState(() => toLocalMonthInput(new Date()));
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestTimeline = useCallback(
    () => getDoctorLinkedPatientTimeline(client, initialPatient.patientId),
    [client, initialPatient.patientId],
  );

  const fetchTimeline = useCallback(async () => {
    try {
      const timeline = await requestTimeline();
      setPatient(timeline.patient);
      setBaseline(timeline.baseline);
      setEntries(timeline.entries);
    } catch {
      setError(t(locale, 'doctor.timelineLoadError'));
      setBaseline(null);
      setEntries([]);
      setEntryPhotos({});
    } finally {
      setLoading(false);
    }
  }, [locale, requestTimeline]);

  const refreshTimeline = useCallback(() => {
    setLoading(true);
    setError(null);
    setSelectedPhoto(null);
    void fetchTimeline();
  }, [fetchTimeline]);

  useEffect(() => {
    let active = true;
    void requestTimeline()
      .then((timeline) => {
        if (!active) return;
        setPatient(timeline.patient);
        setBaseline(timeline.baseline);
        setEntries(timeline.entries);
      })
      .catch(() => {
        if (!active) return;
        setError(t(locale, 'doctor.timelineLoadError'));
        setBaseline(null);
        setEntries([]);
        setEntryPhotos({});
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [locale, requestTimeline]);

  async function handleExport() {
    let exportStage: 'preparing' | 'sharing' = 'preparing';
    setExporting(true);
    setExportStatus(null);
    setExportError(null);

    try {
      const bundle = await createDoctorPatientExportBundle(client, {
        patientId: patient.patientId,
        mode: exportMode,
        imageBytesLoader: (storagePath) => downloadDoctorExportImageBytes(client, storagePath),
        range:
          exportRangeType === 'selected_day'
            ? { type: 'selected_day', date: exportDate }
            : exportRangeType === 'partial_month'
              ? { type: 'partial_month', month: `${exportMonth}-01` }
              : { type: 'all_time' },
      });

      exportStage = 'sharing';
      setExportStatus(t(locale, 'doctor.exportOpeningShare'));
      await shareDoctorExportBundle(bundle);
      setExportStatus(t(locale, 'doctor.exportShared'));
    } catch {
      setExportError(
        t(locale, exportStage === 'sharing' ? 'doctor.exportShareError' : 'doctor.exportError'),
      );
    } finally {
      setExporting(false);
    }
  }

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
              onPress={refreshTimeline}
              variant="secondary"
            />
          </View>
        </View>

        <Text style={styles.readOnly}>{t(locale, 'doctor.readOnlyNotice')}</Text>
        <View style={styles.adherencePanel}>
          <View style={styles.adherenceHeader}>
            <Text style={styles.adherenceTitle}>{t(locale, 'doctor.adherenceTitle')}</Text>
            <Text style={styles.adherenceCount}>{submittedCount(patient, locale)}</Text>
          </View>
          {patient.adherence.days.map((day) => (
            <View key={day.date} style={styles.adherenceDay}>
              <View style={styles.adherenceDayHeader}>
                <Text style={styles.adherenceDate}>{formatAdherenceDate(day.date, locale)}</Text>
                <Text style={styles.adherenceStatus}>{t(locale, dayStatusKey(day.status))}</Text>
              </View>
              <Text style={styles.adherenceCheckpoint}>
                {t(locale, 'doctor.symptomCheckpoint')}:{' '}
                {checkpointLabel(locale, day.symptomStatus, 'symptom')}
              </Text>
              <Text style={styles.adherenceCheckpoint}>
                {t(locale, 'doctor.stoolCheckpoint')}:{' '}
                {checkpointLabel(locale, day.stoolStatus, 'stool')}
              </Text>
            </View>
          ))}
        </View>
        <DoctorBaselineDetails baseline={baseline} locale={locale} />
        <View style={styles.exportPanel}>
          <Text style={styles.exportTitle}>{t(locale, 'doctor.exportTitle')}</Text>
          <SelectField
            label={t(locale, 'doctor.exportMode')}
            onChange={(value) => setExportMode(value as ExportMode)}
            options={exportModeOptions.map((option) => ({
              label: t(locale, option.labelKey),
              value: option.value,
            }))}
            placeholder={t(locale, 'doctor.exportMode')}
            value={exportMode}
          />
          <SelectField
            label={t(locale, 'doctor.exportRange')}
            onChange={(value) =>
              setExportRangeType(value as 'selected_day' | 'partial_month' | 'all_time')
            }
            options={exportRangeOptions.map((option) => ({
              label: t(locale, option.labelKey),
              value: option.value,
            }))}
            placeholder={t(locale, 'doctor.exportRange')}
            value={exportRangeType}
          />
          {exportRangeType === 'selected_day' ? (
            <DatePickerField
              label={t(locale, 'doctor.exportDate')}
              maximumDate={new Date()}
              onChange={setExportDate}
              value={exportDate}
            />
          ) : exportRangeType === 'partial_month' ? (
            <MonthPickerField
              label={t(locale, 'doctor.exportMonth')}
              maximumDate={new Date()}
              onChange={setExportMonth}
              value={exportMonth}
            />
          ) : (
            <Text style={styles.exportHelp}>{t(locale, 'doctor.exportAllTimeHelp')}</Text>
          )}
          <PrimaryButton
            busy={exporting}
            label={t(locale, 'doctor.exportShare')}
            onPress={() => void handleExport()}
          />
          {exportStatus ? (
            <StatusMessage message={exportStatus} style={sharedStyles.success} tone="success" />
          ) : null}
          {exportError ? (
            <StatusMessage message={exportError} style={sharedStyles.error} tone="error" />
          ) : null}
        </View>
        {error ? <StatusMessage message={error} style={sharedStyles.error} tone="error" /> : null}
        {loading ? <ActivityIndicator color={colors.accent} size="large" /> : null}
        {!loading && !entries.length && !error ? (
          <Text style={styles.empty}>{t(locale, 'doctor.timelineEmpty')}</Text>
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
              : medicalEntryTitle(locale, entry, kindLabel);
            const photos = entryPhotos[entry.id] ?? [];

            return (
              <View key={entry.id} style={styles.card}>
                <View style={styles.entryRow}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: entryKindIconStyle(entry.kind).background },
                    ]}
                  >
                    <Text style={[styles.icon, { color: entryKindIconStyle(entry.kind).color }]}>
                      {entryKindIcon(entry.kind)}
                    </Text>
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
                <DoctorEntryMedicalDetails entry={entry} locale={locale} />
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

const styles = createThemedStyles(() =>
  StyleSheet.create({
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
    adherencePanel: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.md,
    },
    adherenceHeader: { gap: spacing.xs },
    adherenceTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
    adherenceCount: { color: colors.accent, fontSize: 14, fontWeight: '800' },
    adherenceDay: {
      borderTopColor: colors.border,
      borderTopWidth: 1,
      gap: 3,
      paddingTop: spacing.sm,
    },
    adherenceDayHeader: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'space-between',
    },
    adherenceDate: { color: colors.text, fontSize: 14, fontWeight: '800' },
    adherenceStatus: {
      color: colors.accent,
      flex: 1,
      fontSize: 13,
      fontWeight: '800',
      textAlign: 'right',
    },
    adherenceCheckpoint: { color: colors.mutedText, fontSize: 13, lineHeight: 18 },
    exportPanel: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      gap: spacing.md,
      padding: spacing.md,
    },
    exportTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
    exportHelp: { color: colors.mutedText, fontSize: 15, lineHeight: 22 },
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
  }),
);
