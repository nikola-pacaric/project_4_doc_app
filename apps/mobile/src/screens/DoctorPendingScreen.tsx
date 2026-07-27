import type { UserProfile } from '@project4/contracts';
import { getActiveLocale, t, type TranslationKey } from '@project4/i18n';
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
import { spacing } from '@project4/ui-tokens';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DoctorBottomNav, type DoctorNavTab } from '../components/DoctorBottomNav';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatusMessage } from '../components/StatusMessage';
import { clearStaleLinkedPatients, type DoctorDashboardData } from '../lib/doctorDashboardState';
import { colors, sharedStyles, createThemedStyles } from '../theme';
import { DoctorLinkedPatientTimelineScreen } from './DoctorLinkedPatientTimelineScreen';

export type DoctorLandingTab = Exclude<DoctorNavTab, 'settings'>;

interface DoctorPendingScreenProps {
  client: AppSupabaseClient;
  initialTab?: DoctorLandingTab;
  onOpenSettings: () => void;
  onTabChange?: (tab: DoctorLandingTab) => void;
  profile: UserProfile;
}

type InviteStatus = 'active' | 'redeemed' | 'revoked' | 'expired';

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getInviteStatus(invite: DoctorInviteCode): InviteStatus {
  if (invite.redeemedAt) return 'redeemed';
  if (invite.revokedAt) return 'revoked';
  if (new Date(invite.expiresAt).getTime() <= Date.now()) return 'expired';
  return 'active';
}

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

export function DoctorPendingScreen({
  client,
  initialTab = 'dashboard',
  onOpenSettings,
  onTabChange,
  profile,
}: DoctorPendingScreenProps) {
  const locale = getActiveLocale();
  const [{ invites, patients }, setDashboardData] = useState<DoctorDashboardData>({
    invites: [],
    patients: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<LinkedPatientSummary | null>(null);
  const [activeTab, setActiveTab] = useState<DoctorLandingTab>(initialTab);

  const activeInvite = useMemo(
    () => invites.find((invite) => getInviteStatus(invite) === 'active') ?? null,
    [invites],
  );

  const loadDashboard = useCallback(
    async (showRefresh = false) => {
      setDashboardData(clearStaleLinkedPatients);
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const [nextInvites, nextPatients] = await Promise.all([
          listDoctorInviteCodes(client),
          listLinkedPatients(client),
        ]);
        setDashboardData({ invites: nextInvites, patients: nextPatients });
      } catch {
        setDashboardData(clearStaleLinkedPatients);
        setError(t(locale, 'doctor.loadError'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [client, locale],
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!selectedPatient) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectedPatient(null);
      return true;
    });

    return () => subscription.remove();
  }, [selectedPatient]);

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
      await loadDashboard(true);
    } catch {
      setError(t(locale, 'doctor.inviteRevokeError'));
    } finally {
      setRevokingId(null);
    }
  }

  const activeInviteHelp = activeInvite
    ? t(locale, 'doctor.activeInviteHelp').replace(
        '{date}',
        formatShortDate(activeInvite.expiresAt),
      )
    : t(locale, 'doctor.noActiveInvite');

  function selectTab(tab: DoctorLandingTab) {
    setSelectedPatient(null);
    setActiveTab(tab);
    onTabChange?.(tab);
  }

  const headerTitle =
    activeTab === 'dashboard'
      ? t(locale, 'doctor.dashboardTitle')
      : activeTab === 'patients'
        ? t(locale, 'doctor.nav.patientsExports')
        : t(locale, 'doctor.nav.generateCode');
  const headerSubtitle =
    activeTab === 'dashboard'
      ? t(locale, 'doctor.dashboardSubtitle')
      : activeTab === 'patients'
        ? t(locale, 'doctor.patientsExportsSubtitle')
        : t(locale, 'doctor.generateCodeSubtitle');

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
    <SafeAreaView style={sharedStyles.formScreen}>
      <KeyboardAwareScrollView
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[sharedStyles.formScrollContent, styles.scrollContent]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.accent}
            onRefresh={() => void loadDashboard(true)}
          />
        }
      >
        <ScreenHeader
          eyebrow={t(locale, 'role.doctor')}
          title={headerTitle}
          subtitle={headerSubtitle}
        />

        {activeTab === 'dashboard' ? (
          <View style={styles.profileCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t(locale, 'doctor.profileTitle')}</Text>
              <Text style={styles.statusPill}>{t(locale, 'doctor.accountReady')}</Text>
            </View>
            <View style={styles.profileRows}>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>{t(locale, 'auth.displayName')}</Text>
                <Text style={styles.profileValue}>
                  {profile.displayName || t(locale, 'role.doctor')}
                </Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>{t(locale, 'doctor.accessStatus')}</Text>
                <Text style={styles.profileValue}>{t(locale, 'doctor.patientAccessReady')}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingPanel}>
            <ActivityIndicator color={colors.accent} />
            <Text style={sharedStyles.body}>{t(locale, 'app.loading')}</Text>
          </View>
        ) : (
          <>
            {activeTab === 'invite' ? (
              <>
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t(locale, 'doctor.inviteTitle')}</Text>
                    <Text style={styles.sectionMeta}>{activeInviteHelp}</Text>
                  </View>

                  {activeInvite ? (
                    <View style={styles.inviteCodeBox}>
                      <Text selectable style={styles.inviteCode}>
                        {activeInvite.code}
                      </Text>
                      <Text style={styles.inviteMeta}>
                        {t(locale, 'doctor.inviteExpires').replace(
                          '{date}',
                          formatShortDate(activeInvite.expiresAt),
                        )}
                      </Text>
                    </View>
                  ) : null}

                  <PrimaryButton
                    busy={creating}
                    label={t(locale, 'doctor.createInvite')}
                    onPress={() => void createInvite()}
                  />
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t(locale, 'doctor.recentInvites')}</Text>
                  {invites.length ? (
                    invites.map((invite) => {
                      const status = getInviteStatus(invite);
                      const canRevoke = status === 'active';
                      return (
                        <View key={invite.id} style={styles.row}>
                          <View style={styles.rowText}>
                            <Text selectable style={styles.rowTitle}>
                              {invite.code}
                            </Text>
                            <Text style={styles.rowMeta}>
                              {t(locale, `doctor.inviteStatus.${status}`)}
                            </Text>
                          </View>
                          {canRevoke ? (
                            <PrimaryButton
                              busy={revokingId === invite.id}
                              label={t(locale, 'doctor.revokeInvite')}
                              onPress={() => void revokeInvite(invite.id)}
                              variant="danger"
                            />
                          ) : null}
                        </View>
                      );
                    })
                  ) : (
                    <Text style={sharedStyles.body}>{t(locale, 'doctor.noInvites')}</Text>
                  )}
                </View>
              </>
            ) : null}

            {activeTab !== 'invite' ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t(locale, 'doctor.linkedPatients')}</Text>
                  <Text style={styles.sectionMeta}>
                    {t(locale, 'doctor.patientCount').replace('{count}', String(patients.length))}
                  </Text>
                </View>
                {patients.length ? (
                  patients.map((patient) => (
                    <Pressable
                      accessibilityRole="button"
                      key={patient.accessId}
                      onPress={() => setSelectedPatient(patient)}
                      style={({ pressed }) => [styles.patientRow, pressed && styles.pressedRow]}
                    >
                      <Text style={styles.rowTitle}>
                        {patient.displayName || t(locale, 'doctor.unnamedPatient')}
                      </Text>
                      <Text style={styles.rowMeta}>
                        {t(locale, 'doctor.patientCode').replace(
                          '{code}',
                          maskPatientId(patient.patientId),
                        )}
                      </Text>
                      <Text style={styles.rowMeta}>
                        {t(locale, 'doctor.linkedAt').replace(
                          '{date}',
                          formatShortDate(patient.linkedAt),
                        )}
                      </Text>
                      {patient.adherence.days[0] ? (
                        <View style={styles.adherenceSummary}>
                          <Text style={styles.dayStatus}>
                            {t(locale, dayStatusKey(patient.adherence.days[0].status))}
                          </Text>
                          <Text style={styles.rowMeta}>{submittedCount(patient, locale)}</Text>
                          <View style={styles.checkpointRow}>
                            <Text style={styles.checkpointText}>
                              {t(locale, 'doctor.symptomCheckpoint')}:{' '}
                              {checkpointLabel(
                                locale,
                                patient.adherence.days[0].symptomStatus,
                                'symptom',
                              )}
                            </Text>
                            <Text style={styles.checkpointText}>
                              {t(locale, 'doctor.stoolCheckpoint')}:{' '}
                              {checkpointLabel(
                                locale,
                                patient.adherence.days[0].stoolStatus,
                                'stool',
                              )}
                            </Text>
                          </View>
                        </View>
                      ) : null}
                      <Text style={styles.openPatient}>{t(locale, 'doctor.openPatient')}</Text>
                    </Pressable>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.rowTitle}>{t(locale, 'doctor.noLinkedPatients')}</Text>
                    <Text style={sharedStyles.body}>
                      {t(locale, 'doctor.noLinkedPatientsHelp')}
                    </Text>
                  </View>
                )}
              </View>
            ) : null}
          </>
        )}

        {error ? <StatusMessage message={error} style={sharedStyles.error} tone="error" /> : null}
        {success ? (
          <StatusMessage message={success} style={sharedStyles.success} tone="success" />
        ) : null}

        <PrimaryButton
          label={t(locale, 'timeline.refresh')}
          onPress={() => void loadDashboard(true)}
          variant="secondary"
        />
      </KeyboardAwareScrollView>
      <DoctorBottomNav
        active={activeTab}
        onDashboard={() => selectTab('dashboard')}
        onGenerateCode={() => selectTab('invite')}
        onPatients={() => selectTab('patients')}
        onSettings={onOpenSettings}
        palette={{
          background: colors.surface,
          onPrimaryContainer: colors.onAccent,
          onSurfaceVariant: colors.mutedText,
          primaryContainer: colors.accent,
          shadow: colors.border,
        }}
      />
    </SafeAreaView>
  );
}

const styles = createThemedStyles(() =>
  StyleSheet.create({
    scrollContent: {
      paddingBottom: 140,
    },
    loadingPanel: {
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xl,
    },
    profileCard: {
      gap: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.surface,
      padding: spacing.md,
    },
    section: {
      gap: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.surface,
      padding: spacing.md,
    },
    sectionHeader: {
      gap: spacing.xs,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 19,
      fontWeight: '800',
    },
    sectionMeta: {
      color: colors.mutedText,
      fontSize: 14,
      lineHeight: 20,
    },
    statusPill: {
      alignSelf: 'flex-start',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: 999,
      color: colors.accent,
      fontSize: 13,
      fontWeight: '800',
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
    },
    profileRows: {
      gap: spacing.sm,
    },
    profileRow: {
      gap: spacing.xs,
    },
    profileLabel: {
      color: colors.mutedText,
      fontSize: 13,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    profileValue: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '800',
    },
    inviteCodeBox: {
      gap: spacing.xs,
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: 8,
      padding: spacing.md,
    },
    inviteCode: {
      color: colors.text,
      fontSize: 28,
      fontWeight: '900',
      letterSpacing: 0,
      textAlign: 'center',
    },
    inviteMeta: {
      color: colors.mutedText,
      fontSize: 14,
      textAlign: 'center',
    },
    row: {
      gap: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: spacing.md,
    },
    rowText: {
      gap: spacing.xs,
    },
    rowTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '800',
    },
    rowMeta: {
      color: colors.mutedText,
      fontSize: 14,
      lineHeight: 20,
    },
    patientRow: {
      gap: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: spacing.md,
    },
    adherenceSummary: {
      gap: spacing.xs,
      borderLeftWidth: 3,
      borderLeftColor: colors.accent,
      marginTop: spacing.xs,
      paddingLeft: spacing.sm,
    },
    dayStatus: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    checkpointRow: {
      gap: 2,
    },
    checkpointText: {
      color: colors.mutedText,
      fontSize: 13,
      lineHeight: 18,
    },
    pressedRow: {
      opacity: 0.74,
    },
    openPatient: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '800',
    },
    emptyState: {
      gap: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: spacing.md,
    },
  }),
);
