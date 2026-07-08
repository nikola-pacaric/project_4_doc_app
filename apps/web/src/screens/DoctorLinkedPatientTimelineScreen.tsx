import { isNoStoolTodayEntry, type EntryKind, type PatientEntry } from '@project4/contracts';
import { DEFAULT_LOCALE, t, type TranslationKey } from '@project4/i18n';
import {
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

function formatEntryDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value));
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
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; label: string } | null>(null);
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
                <span className="web-entry-icon">{entryIcons[entry.kind]}</span>
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
