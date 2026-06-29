import { DEFAULT_LOCALE, t } from '@project4/i18n';
import {
  createDoctorInviteCode,
  listDoctorInviteCodes,
  listLinkedPatients,
  revokeDoctorInviteCode,
  type AppSupabaseClient,
  type DoctorInviteCode,
  type LinkedPatientSummary,
} from '@project4/supabase-client';
import { spacing } from '@project4/ui-tokens';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, sharedStyles } from '../theme';

interface DoctorPendingScreenProps {
  client: AppSupabaseClient;
  onSignOut: () => Promise<void>;
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

export function DoctorPendingScreen({ client, onSignOut }: DoctorPendingScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [invites, setInvites] = useState<DoctorInviteCode[]>([]);
  const [patients, setPatients] = useState<LinkedPatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const activeInvite = useMemo(
    () => invites.find((invite) => getInviteStatus(invite) === 'active') ?? null,
    [invites],
  );

  const loadDashboard = useCallback(
    async (showRefresh = false) => {
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
        setInvites(nextInvites);
        setPatients(nextPatients);
      } catch {
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

  async function createInvite() {
    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const invite = await createDoctorInviteCode(client);
      setInvites((current) => [invite, ...current]);
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
    ? t(locale, 'doctor.activeInviteHelp').replace('{date}', formatShortDate(activeInvite.expiresAt))
    : t(locale, 'doctor.noActiveInvite');

  return (
    <SafeAreaView style={sharedStyles.formScreen}>
      <ScrollView
        contentContainerStyle={sharedStyles.formScrollContent}
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
          title={t(locale, 'doctor.dashboardTitle')}
          subtitle={t(locale, 'doctor.dashboardSubtitle')}
        />

        {loading ? (
          <View style={styles.loadingPanel}>
            <ActivityIndicator color={colors.accent} />
            <Text style={sharedStyles.body}>{t(locale, 'app.loading')}</Text>
          </View>
        ) : (
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

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t(locale, 'doctor.linkedPatients')}</Text>
                <Text style={styles.sectionMeta}>
                  {t(locale, 'doctor.patientCount').replace('{count}', String(patients.length))}
                </Text>
              </View>
              {patients.length ? (
                patients.map((patient) => (
                  <View key={patient.accessId} style={styles.patientRow}>
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
                  </View>
                ))
              ) : (
                <Text style={sharedStyles.body}>{t(locale, 'doctor.noLinkedPatients')}</Text>
              )}
            </View>
          </>
        )}

        {error ? <Text style={sharedStyles.error}>{error}</Text> : null}
        {success ? <Text style={sharedStyles.success}>{success}</Text> : null}

        <PrimaryButton
          label={t(locale, 'timeline.refresh')}
          onPress={() => void loadDashboard(true)}
          variant="secondary"
        />
        <PrimaryButton
          label={t(locale, 'auth.signOut')}
          onPress={() => void onSignOut()}
          variant="secondary"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingPanel: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
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
});
