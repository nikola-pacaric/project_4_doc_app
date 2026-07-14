import {
  entryKindIcon,
  entryKindIconStyle,
  isNoStoolTodayEntry,
  type ExportMode,
  type PatientEntry,
} from '@project4/contracts';
import { getActiveLocale, t, type TranslationKey } from '@project4/i18n';
import {
  createDoctorPatientExportBundle,
  createEntryPhotoSignedUrl,
  getDoctorLinkedPatientTimeline,
  listEntryPhotos,
  type AppSupabaseClient,
  type LinkedPatientSummary,
} from '@project4/supabase-client';
import { useCallback, useEffect, useState } from 'react';

import { ScreenHeader } from '../components/ScreenHeader';

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

function formatEntryDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentMonthInputValue(): string {
  return new Date().toISOString().slice(0, 7);
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
  const [entries, setEntries] = useState<PatientEntry[]>([]);
  const [entryPhotos, setEntryPhotos] = useState<Record<string, TimelineEntryPhoto[]>>({});
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; label: string } | null>(null);
  const [exportMode, setExportMode] = useState<ExportMode>('all_data_with_images');
  const [exportRangeType, setExportRangeType] = useState<
    'selected_day' | 'partial_month' | 'all_time'
  >('selected_day');
  const [exportDate, setExportDate] = useState(todayInputValue);
  const [exportMonth, setExportMonth] = useState(currentMonthInputValue);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTimeline = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLightboxPhoto(null);

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

  async function handleDownloadExport() {
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
          <button className="secondary-button" onClick={() => void loadTimeline()} type="button">
            {t(locale, 'timeline.refresh')}
          </button>
        </div>
      </div>

      <p className="doctor-readonly-notice">{t(locale, 'doctor.readOnlyNotice')}</p>
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
                onChange={(event) => setExportDate(event.target.value)}
                type="date"
                value={exportDate}
              />
            </label>
          ) : exportRangeType === 'partial_month' ? (
            <label>
              <span>{t(locale, 'doctor.exportMonth')}</span>
              <input
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
            disabled={exporting}
            onClick={() => void handleDownloadExport()}
            type="button"
          >
            {exporting ? t(locale, 'doctor.exportPreparing') : t(locale, 'doctor.exportDownload')}
          </button>
          {exportStatus ? <p className="notice success">{exportStatus}</p> : null}
          {exportError ? <p className="notice error">{exportError}</p> : null}
        </div>
      </section>
      {error ? <p className="notice error">{error}</p> : null}
      {loading ? <p className="empty-state">{t(locale, 'app.loading')}</p> : null}
      {!loading && entries.length === 0 && !error ? (
        <p className="empty-state">{t(locale, 'entry.empty')}</p>
      ) : null}

      <div className="web-recent-list web-timeline-list">
        {entries.map((entry) => {
          const kindLabel = t(locale, `entry.kind.${entry.kind}` as TranslationKey);
          const title = isNoStoolTodayEntry(entry)
            ? t(locale, 'stool.noStoolToday')
            : entry.text?.trim() || kindLabel;
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
            <img src={lightboxPhoto.url} alt={lightboxPhoto.label} className="photo-lightbox-img" />
            <p className="photo-lightbox-label">{lightboxPhoto.label}</p>
          </div>
        </div>
      ) : null}
    </main>
  );
}
