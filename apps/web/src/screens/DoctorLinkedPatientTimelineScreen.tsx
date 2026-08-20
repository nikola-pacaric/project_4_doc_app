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
  beginTimelinePhotoRecovery,
  completeTimelinePhotoRecovery,
  createTimelinePhotoRecoveryState,
  markTimelinePhotoRenderFailed,
  shouldShowTimelinePhotoRecovery,
  type TimelinePhotoRecoveryState,
} from '@project4/photo';
import {
  createDoctorPatientExportBundle,
  createEntryPhotoSignedUrl,
  getDoctorLinkedPatientTimeline,
  listEntryPhotos,
  type AppSupabaseClient,
  type DoctorCheckpointStatus,
  type DoctorDayStatus,
  type LinkedPatientSummary,
  type DoctorTimelineEntry,
} from '@project4/supabase-client';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  DoctorBaselineDetails,
  DoctorEntryMedicalDetails,
} from '../components/DoctorMedicalDetails';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatusMessage } from '../components/StatusMessage';
import {
  isFutureLocalDateInput,
  isFutureLocalMonthInput,
  isNormalizedLocalDateInput,
  isNormalizedLocalMonthInput,
  toLocalDateInput,
  toLocalMonthInput,
} from '../utils/localCalendarInput';

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

function formatEntryDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function zipBytesToBlob(bytes: Uint8Array): Blob {
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  return new Blob([buffer], { type: 'application/zip' });
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
  const [photoLoadState, setPhotoLoadState] = useState(() =>
    createTimelinePhotoRecoveryState(initialPatient.patientId),
  );
  const [photoLoadRetryKey, setPhotoLoadRetryKey] = useState(0);
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; label: string } | null>(null);
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
  const photoLoadStateRef = useRef(photoLoadState);
  const exportMaximumDate = toLocalDateInput(new Date());
  const exportMaximumMonth = toLocalMonthInput(new Date());
  const hasValidExportRange =
    exportRangeType === 'all_time' ||
    (exportRangeType === 'selected_day'
      ? isNormalizedLocalDateInput(exportDate) && !isFutureLocalDateInput(exportDate)
      : isNormalizedLocalMonthInput(exportMonth) && !isFutureLocalMonthInput(exportMonth));

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
    setLightboxPhoto(null);
    void fetchTimeline();
  }, [fetchTimeline]);

  const replacePhotoLoadState = useCallback((next: TimelinePhotoRecoveryState) => {
    photoLoadStateRef.current = next;
    setPhotoLoadState(next);
  }, []);

  const retryPhotos = useCallback(() => {
    setLightboxPhoto(null);
    replacePhotoLoadState({ ...photoLoadStateRef.current, hasRenderError: false });
    setPhotoLoadRetryKey((previous) => previous + 1);
  }, [replacePhotoLoadState]);

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

  async function handleDownloadExport() {
    if (!hasValidExportRange) {
      setExportStatus(null);
      setExportError(t(locale, 'doctor.exportError'));
      return;
    }

    setExporting(true);
    setExportError(null);
    setExportStatus(t(locale, 'doctor.exportPreparing'));

    try {
      const bundle = await createDoctorPatientExportBundle(client, {
        patientId: patient.patientId,
        mode: exportMode,
        range:
          exportRangeType === 'selected_day'
            ? { type: 'selected_day', date: exportDate }
            : exportRangeType === 'partial_month'
              ? { type: 'partial_month', month: `${exportMonth}-01` }
              : { type: 'all_time' },
      });

      downloadBlob(zipBytesToBlob(bundle.zipBytes), bundle.fileName);
      setExportStatus(t(locale, 'doctor.exportReady'));
    } catch {
      setExportStatus(null);
      setExportError(t(locale, 'doctor.exportError'));
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    let active = true;
    const photoEntries = entries.filter(canHaveTimelinePhotos);
    const loadingPhotoState = beginTimelinePhotoRecovery(
      photoLoadStateRef.current,
      initialPatient.patientId,
      photoEntries.length,
    );
    replacePhotoLoadState(loadingPhotoState);
    const request = loadingPhotoState.request;

    void (async () => {
      if (!photoEntries.length) {
        if (active) {
          setEntryPhotos({});
        }
        return;
      }

      setEntryPhotos({});

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

        if (active) {
          const nextPhotoState = completeTimelinePhotoRecovery(
            photoLoadStateRef.current,
            request,
            photoEntries.length,
          );
          if (nextPhotoState === photoLoadStateRef.current) return;
          setEntryPhotos(nextPhotos);
          replacePhotoLoadState(nextPhotoState);
        }
      } catch {
        if (active) {
          const nextPhotoState = completeTimelinePhotoRecovery(
            photoLoadStateRef.current,
            request,
            photoEntries.length,
            true,
          );
          if (nextPhotoState === photoLoadStateRef.current) return;
          setEntryPhotos({});
          replacePhotoLoadState(nextPhotoState);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [client, entries, initialPatient.patientId, locale, photoLoadRetryKey, replacePhotoLoadState]);

  return (
    <main className="baseline-layout structured-entry-layout web-timeline-view doctor-readonly-timeline">
      <div className="baseline-toolbar">
        <ScreenHeader
          eyebrow={t(locale, 'role.doctor')}
          title={patientTitle(patient)}
          subtitle={t(locale, 'doctor.timelineSubtitle')}
        />
        <div className="button-row">
          <button className="secondary-button" onClick={onBack} type="button">
            {t(locale, 'common.back')}
          </button>
          <button className="secondary-button" onClick={refreshTimeline} type="button">
            {t(locale, 'timeline.refresh')}
          </button>
        </div>
      </div>

      <p className="doctor-readonly-notice">{t(locale, 'doctor.readOnlyNotice')}</p>
      <section className="doctor-adherence-panel" aria-labelledby="doctor-adherence-title">
        <div className="web-section-heading">
          <h2 id="doctor-adherence-title">{t(locale, 'doctor.adherenceTitle')}</h2>
          <span className="doctor-count-pill">{submittedCount(patient, locale)}</span>
        </div>
        <div className="doctor-adherence-days">
          {patient.adherence.days.map((day) => (
            <article className={`doctor-adherence-day status-${day.status}`} key={day.date}>
              <div>
                <strong>{formatAdherenceDate(day.date, locale)}</strong>
                <span>{t(locale, dayStatusKey(day.status))}</span>
              </div>
              <small>
                {t(locale, 'doctor.symptomCheckpoint')}:{' '}
                {checkpointLabel(locale, day.symptomStatus, 'symptom')}
              </small>
              <small>
                {t(locale, 'doctor.stoolCheckpoint')}:{' '}
                {checkpointLabel(locale, day.stoolStatus, 'stool')}
              </small>
            </article>
          ))}
        </div>
      </section>
      <DoctorBaselineDetails baseline={baseline} locale={locale} />
      <section className="doctor-export-panel" aria-labelledby="doctor-export-title">
        <div>
          <h2 id="doctor-export-title">{t(locale, 'doctor.exportTitle')}</h2>
        </div>
        <div className="doctor-export-grid">
          <label>
            <span>{t(locale, 'doctor.exportMode')}</span>
            <select
              onChange={(event) => setExportMode(event.target.value as ExportMode)}
              value={exportMode}
            >
              <option value="all_data">{t(locale, 'doctor.exportAllData')}</option>
              <option value="all_data_with_images">
                {t(locale, 'doctor.exportAllDataWithImages')}
              </option>
              <option value="images_only_with_labels">
                {t(locale, 'doctor.exportImagesOnly')}
              </option>
            </select>
          </label>
          <label>
            <span>{t(locale, 'doctor.exportRange')}</span>
            <select
              onChange={(event) =>
                setExportRangeType(
                  event.target.value as 'selected_day' | 'partial_month' | 'all_time',
                )
              }
              value={exportRangeType}
            >
              <option value="selected_day">{t(locale, 'doctor.exportSelectedDay')}</option>
              <option value="partial_month">{t(locale, 'doctor.exportPartialMonth')}</option>
              <option value="all_time">{t(locale, 'doctor.exportAllTime')}</option>
            </select>
          </label>
          {exportRangeType === 'selected_day' ? (
            <label>
              <span>{t(locale, 'doctor.exportDate')}</span>
              <input
                max={exportMaximumDate}
                onChange={(event) => setExportDate(event.target.value)}
                type="date"
                value={exportDate}
              />
            </label>
          ) : exportRangeType === 'partial_month' ? (
            <label>
              <span>{t(locale, 'doctor.exportMonth')}</span>
              <input
                max={exportMaximumMonth}
                onChange={(event) => setExportMonth(event.target.value)}
                type="month"
                value={exportMonth}
              />
            </label>
          ) : (
            <p className="doctor-export-help">{t(locale, 'doctor.exportAllTimeHelp')}</p>
          )}
        </div>
        <div className="doctor-export-actions">
          <button
            className="primary-button"
            disabled={exporting || !hasValidExportRange}
            onClick={() => void handleDownloadExport()}
            type="button"
          >
            {exporting ? t(locale, 'doctor.exportPreparing') : t(locale, 'doctor.exportDownload')}
          </button>
          {exportStatus ? <StatusMessage tone="success">{exportStatus}</StatusMessage> : null}
          {exportError ? <StatusMessage tone="error">{exportError}</StatusMessage> : null}
        </div>
      </section>
      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
      {loading ? <p className="empty-state">{t(locale, 'app.loading')}</p> : null}
      {!loading && entries.length === 0 && !error ? (
        <p className="empty-state">{t(locale, 'doctor.timelineEmpty')}</p>
      ) : null}
      {photoLoadState.status === 'loading' ? (
        <p aria-live="polite" className="empty-state" role="status">
          {t(locale, 'app.loading')}
        </p>
      ) : null}
      {shouldShowTimelinePhotoRecovery(photoLoadState) ? (
        <div className="doctor-timeline-photo-recovery">
          <StatusMessage tone="error">{t(locale, 'photo.loadError')}</StatusMessage>
          <button className="secondary-button" onClick={retryPhotos} type="button">
            {t(locale, 'common.retry')}
          </button>
        </div>
      ) : null}

      <div className="web-recent-list web-timeline-list">
        {entries.map((entry) => {
          const kindLabel = t(locale, `entry.kind.${entry.kind}` as TranslationKey);
          const title = isNoStoolTodayEntry(entry)
            ? t(locale, 'stool.noStoolToday')
            : medicalEntryTitle(locale, entry, kindLabel);
          const photos = entryPhotos[entry.id] ?? [];

          return (
            <article className="web-recent-entry doctor-readonly-entry" key={entry.id}>
              <div className="web-recent-entry-content">
                <span
                  className="web-entry-icon"
                  style={{
                    background: entryKindIconStyle(entry.kind).background,
                    color: entryKindIconStyle(entry.kind).color,
                  }}
                >
                  {entryKindIcon(entry.kind)}
                </span>
                <span>
                  <strong>{title}</strong>
                  <small>{formatEntryDate(entry.occurredAt, locale)}</small>
                </span>
                <span className="web-entry-trailing">
                  <small className="web-entry-status complete">{kindLabel}</small>
                </span>
              </div>
              <DoctorEntryMedicalDetails entry={entry} locale={locale} />
              {photos.length ? (
                <div className="timeline-entry-photos">
                  {photos.map((photo) => (
                    <button
                      aria-label={photo.label}
                      className="timeline-entry-photo-button"
                      key={photo.id}
                      onClick={() => setLightboxPhoto({ url: photo.photoUrl, label: photo.label })}
                      type="button"
                    >
                      <img
                        alt={photo.label}
                        className="timeline-entry-photo-thumb"
                        onError={() =>
                          replacePhotoLoadState(
                            markTimelinePhotoRenderFailed(photoLoadStateRef.current),
                          )
                        }
                        src={photo.thumbnailUrl}
                      />
                    </button>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {lightboxPhoto ? (
        <div className="photo-lightbox" onClick={() => setLightboxPhoto(null)}>
          <div className="photo-lightbox-content" onClick={(event) => event.stopPropagation()}>
            <button
              className="photo-lightbox-close"
              onClick={() => setLightboxPhoto(null)}
              type="button"
            >
              &times;
            </button>
            <img
              alt={lightboxPhoto.label}
              className="photo-lightbox-img"
              onError={() => {
                setLightboxPhoto(null);
                replacePhotoLoadState(markTimelinePhotoRenderFailed(photoLoadStateRef.current));
              }}
              src={lightboxPhoto.url}
            />
            <p className="photo-lightbox-label">{lightboxPhoto.label}</p>
          </div>
        </div>
      ) : null}
    </main>
  );
}
