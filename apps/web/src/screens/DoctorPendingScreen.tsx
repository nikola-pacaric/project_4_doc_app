import type { UserProfile } from '@project4/contracts';
import { formatShortDateTime, getActiveLocale, t, type TranslationKey } from '@project4/i18n';
import {
  createDoctorInviteCode,
  listDoctorInviteCodes,
  listLinkedPatients,
  revokeDoctorInviteCode,
  type AppSupabaseClient,
  type DoctorCheckpointStatus,
  type DoctorDayStatus,
  type DoctorInviteCode,
  type LinkedPatientSummary,
} from '@project4/supabase-client';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ScreenHeader } from '../components/ScreenHeader';
import { StatusMessage } from '../components/StatusMessage';
import { clearStaleLinkedPatients, type DoctorDashboardData } from '../lib/doctorDashboardState';
import { DoctorLinkedPatientTimelineScreen } from './DoctorLinkedPatientTimelineScreen';

interface DoctorPendingScreenProps {
  client: AppSupabaseClient;
  onOpenSettings: () => void;
  onSignOut: () => Promise<void>;
  profile: UserProfile;
}

type InviteStatus = 'active' | 'redeemed' | 'revoked' | 'expired';

function maskPatientId(patientId: string): string {
  return patientId.slice(0, 8).toUpperCase();
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

function submittedCount(patient: LinkedPatientSummary, locale: ReturnType<typeof getActiveLocale>) {
  return t(locale, 'doctor.adherenceSubmittedCount')
    .replace('{submitted}', String(patient.adherence.submittedDays))
    .replace('{total}', String(patient.adherence.totalDays));
}

function getInviteStatus(invite: DoctorInviteCode): InviteStatus {
  if (invite.redeemedAt) return 'redeemed';
  if (invite.revokedAt) return 'revoked';
  if (new Date(invite.expiresAt).getTime() <= Date.now()) return 'expired';
  return 'active';
}

export function DoctorPendingScreen({
  client,
  onOpenSettings,
  onSignOut,
  profile,
}: DoctorPendingScreenProps) {
  const locale = getActiveLocale();
  const [{ invites, patients }, setDashboardData] = useState<DoctorDashboardData>({
    invites: [],
    patients: [],
  });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<LinkedPatientSummary | null>(null);

  const activeInvite = useMemo(
    () => invites.find((invite) => getInviteStatus(invite) === 'active') ?? null,
    [invites],
  );

  const loadDashboard = useCallback(async () => {
    setDashboardData(clearStaleLinkedPatients);
    setLoading(true);
    setError(null);

    try {
      const [nextInvites, nextPatients] = await Promise.all([
        listDoctorInviteCodes(client),
        listLinkedPatients(client),
      ]);
      setDashboardData({ invites: nextInvites, patients: nextPatients });
    } catch {
      setError(t(locale, 'doctor.loadError'));
      setDashboardData(clearStaleLinkedPatients);
    } finally {
      setLoading(false);
    }
  }, [client, locale]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  async function createInvite() {
    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const invite = await createDoctorInviteCode(client);
      setDashboardData((current) => ({
        ...current,
        invites: [invite, ...current.invites],
      }));
      setSuccess(t(locale, 'doctor.inviteCreated'));
    } catch {
      setError(t(locale, 'doctor.inviteCreateError'));
    } finally {
      setCreating(false);
    }
  }

  async function revokeInvite(inviteId: string) {
    setRevokingId(inviteId);
    setError(null);
    setSuccess(null);

    try {
      const revoked = await revokeDoctorInviteCode(client, inviteId);
      if (!revoked) {
        setError(t(locale, 'doctor.inviteRevokeUnavailable'));
        return;
      }
      setSuccess(t(locale, 'doctor.inviteRevoked'));
      await loadDashboard();
    } catch {
      setError(t(locale, 'doctor.inviteRevokeError'));
    } finally {
      setRevokingId(null);
    }
  }

  const activeInviteHelp = activeInvite
    ? t(locale, 'doctor.activeInviteHelp').replace(
        '{date}',
        formatShortDateTime(activeInvite.expiresAt, locale),
      )
    : t(locale, 'doctor.noActiveInvite');

  if (selectedPatient) {
    return (
      <DoctorLinkedPatientTimelineScreen
        client={client}
        initialPatient={selectedPatient}
        onBack={() => setSelectedPatient(null)}
      />
    );
  }

  return (
    <main className="doctor-dashboard-layout">
      <section className="doctor-dashboard-header">
        <ScreenHeader
          eyebrow={t(locale, 'role.doctor')}
          title={t(locale, 'doctor.dashboardTitle')}
          subtitle={t(locale, 'doctor.dashboardSubtitle')}
        />
        <div className="doctor-dashboard-actions">
          <button
            className="secondary-button"
            disabled={loading}
            onClick={() => void loadDashboard()}
            type="button"
          >
            {t(locale, 'timeline.refresh')}
          </button>
          <button className="secondary-button" onClick={onOpenSettings} type="button">
            {t(locale, 'settings.title')}
          </button>
          <button className="secondary-button" onClick={() => void onSignOut()} type="button">
            {t(locale, 'auth.signOut')}
          </button>
        </div>
      </section>

      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
      {success ? <StatusMessage tone="success">{success}</StatusMessage> : null}

      <section className="doctor-dashboard-grid">
        <article className="doctor-panel">
          <div className="web-section-heading">
            <h2>{t(locale, 'doctor.profileTitle')}</h2>
            <span className="doctor-status-pill">{t(locale, 'doctor.accountReady')}</span>
          </div>
          <dl className="doctor-profile-list">
            <div>
              <dt>{t(locale, 'auth.displayName')}</dt>
              <dd>{profile.displayName || t(locale, 'role.doctor')}</dd>
            </div>
            <div>
              <dt>{t(locale, 'doctor.accessStatus')}</dt>
              <dd>{t(locale, 'doctor.patientAccessReady')}</dd>
            </div>
          </dl>
        </article>

        <article className="doctor-panel doctor-invite-panel">
          <div className="web-section-heading">
            <div>
              <h2>{t(locale, 'doctor.inviteTitle')}</h2>
              <p className="doctor-panel-meta">{activeInviteHelp}</p>
            </div>
          </div>

          {activeInvite ? (
            <div className="doctor-active-invite">
              <span>{t(locale, 'doctor.inviteStatus.active')}</span>
              <strong>{activeInvite.code}</strong>
              <small>
                {t(locale, 'doctor.inviteExpires').replace(
                  '{date}',
                  formatShortDateTime(activeInvite.expiresAt, locale),
                )}
              </small>
            </div>
          ) : null}

          <button
            className="primary-button"
            disabled={loading || creating}
            onClick={() => void createInvite()}
            type="button"
          >
            {creating ? t(locale, 'app.loading') : t(locale, 'doctor.createInvite')}
          </button>

          <div className="doctor-invite-history">
            <h3>{t(locale, 'doctor.recentInvites')}</h3>
            {loading ? <p className="summary">{t(locale, 'app.loading')}</p> : null}
            {!loading && invites.length ? (
              <div className="doctor-invite-list">
                {invites.map((invite) => {
                  const status = getInviteStatus(invite);
                  const canRevoke = status === 'active';

                  return (
                    <div className="doctor-invite-row" key={invite.id}>
                      <div>
                        <strong>{invite.code}</strong>
                        <span className={`doctor-invite-status ${status}`}>
                          {t(locale, `doctor.inviteStatus.${status}`)}
                        </span>
                      </div>
                      {canRevoke ? (
                        <button
                          className="secondary-button"
                          disabled={revokingId === invite.id}
                          onClick={() => void revokeInvite(invite.id)}
                          type="button"
                        >
                          {revokingId === invite.id
                            ? t(locale, 'app.loading')
                            : t(locale, 'doctor.revokeInvite')}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
            {!loading && !invites.length ? (
              <p className="summary">{t(locale, 'doctor.noInvites')}</p>
            ) : null}
          </div>
        </article>

        <article className="doctor-panel">
          <div className="web-section-heading">
            <h2>{t(locale, 'doctor.linkedPatients')}</h2>
            <span className="doctor-count-pill">
              {t(locale, 'doctor.patientCount').replace('{count}', String(patients.length))}
            </span>
          </div>

          {loading ? <p className="summary">{t(locale, 'app.loading')}</p> : null}

          {!loading && !error && patients.length ? (
            <div className="doctor-patient-list">
              {patients.map((patient) => (
                <button
                  className="doctor-patient-row"
                  key={patient.accessId}
                  onClick={() => setSelectedPatient(patient)}
                  type="button"
                >
                  <div>
                    <strong>{patient.displayName || t(locale, 'doctor.unnamedPatient')}</strong>
                    <span>
                      {t(locale, 'doctor.patientCode').replace(
                        '{code}',
                        maskPatientId(patient.patientId),
                      )}
                    </span>
                  </div>
                  <small>
                    {t(locale, 'doctor.linkedAt').replace(
                      '{date}',
                      formatShortDateTime(patient.linkedAt, locale),
                    )}
                  </small>
                  <span className="doctor-open-patient">{t(locale, 'doctor.openPatient')}</span>
                  {patient.adherence.days[0] ? (
                    <div className="doctor-patient-adherence">
                      <strong>{t(locale, dayStatusKey(patient.adherence.days[0].status))}</strong>
                      <span>{submittedCount(patient, locale)}</span>
                      <small>
                        {t(locale, 'doctor.symptomCheckpoint')}:{' '}
                        {checkpointLabel(
                          locale,
                          patient.adherence.days[0].symptomStatus,
                          'symptom',
                        )}
                      </small>
                      <small>
                        {t(locale, 'doctor.stoolCheckpoint')}:{' '}
                        {checkpointLabel(locale, patient.adherence.days[0].stoolStatus, 'stool')}
                      </small>
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}

          {!loading && !error && !patients.length ? (
            <div className="doctor-empty-state">
              <strong>{t(locale, 'doctor.noLinkedPatients')}</strong>
              <p>{t(locale, 'doctor.noLinkedPatientsHelp')}</p>
            </div>
          ) : null}
        </article>
      </section>
    </main>
  );
}
