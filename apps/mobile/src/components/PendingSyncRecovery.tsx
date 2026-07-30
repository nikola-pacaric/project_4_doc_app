import { formatShortDateTime, getActiveLocale, t } from '@project4/i18n';
import {
  failedPendingEntries,
  type LocalPendingEntry,
  type PendingTimestampUpdatePayload,
} from '@project4/sync';
import { spacing } from '@project4/ui-tokens';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { pendingSyncEntryDetail, pendingSyncOperationKey } from '../lib/pendingSyncRecovery';
import { colors, createThemedStyles } from '../theme';
import { StatusMessage } from './StatusMessage';

export interface PendingSyncRecoveryBusyState {
  action: 'discard' | 'retry';
  entryId: string;
}

export interface PendingSyncRecoveryMessage {
  text: string;
  tone: 'error' | 'success';
}

interface PendingSyncRecoveryProps {
  busy: PendingSyncRecoveryBusyState | null;
  entries: readonly LocalPendingEntry[];
  message: PendingSyncRecoveryMessage | null;
  onDiscard: (entryId: string) => void | Promise<void>;
  onRetry: (entryId: string) => void | Promise<void>;
}

export function PendingSyncRecovery({
  busy,
  entries,
  message,
  onDiscard,
  onRetry,
}: PendingSyncRecoveryProps) {
  const locale = getActiveLocale();
  const failedEntries = failedPendingEntries(entries);

  function confirmDiscard(entryId: string) {
    Alert.alert(t(locale, 'sync.discardTitle'), t(locale, 'sync.discardBody'), [
      { style: 'cancel', text: t(locale, 'common.cancel') },
      {
        onPress: () => void onDiscard(entryId),
        style: 'destructive',
        text: t(locale, 'sync.discardConfirm'),
      },
    ]);
  }

  if (!failedEntries.length && !message) return null;

  return (
    <View accessibilityLiveRegion="polite" style={styles.wrapper}>
      {failedEntries.length ? (
        <View style={styles.panel}>
          <Text accessibilityRole="header" style={styles.title}>
            {t(locale, 'sync.failedTitle')}
          </Text>
          <Text style={styles.body}>{t(locale, 'sync.failedBody')}</Text>
          <View style={styles.list}>
            {failedEntries.map((entry) => {
              const activeAction = busy?.entryId === entry.id ? busy.action : null;
              const actionsDisabled = busy !== null;
              const rawDetail = pendingSyncEntryDetail(entry);
              const detail =
                entry.operation === 'update_entry_timestamp'
                  ? formatShortDateTime(
                      (entry.payload as PendingTimestampUpdatePayload).occurredAt,
                      locale,
                    )
                  : rawDetail;

              return (
                <View key={entry.id} style={styles.item}>
                  <View style={styles.itemCopy}>
                    <Text style={styles.status}>{t(locale, 'sync.failedStatus')}</Text>
                    <Text style={styles.operation}>
                      {t(locale, pendingSyncOperationKey(entry.operation))}
                    </Text>
                    {detail ? (
                      <Text numberOfLines={2} style={styles.detail}>
                        {detail}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.actions}>
                    <Pressable
                      accessibilityLabel={t(
                        locale,
                        activeAction === 'retry' ? 'sync.retrying' : 'sync.retry',
                      )}
                      accessibilityRole="button"
                      accessibilityState={{
                        busy: activeAction === 'retry',
                        disabled: actionsDisabled,
                      }}
                      disabled={actionsDisabled}
                      onPress={() => void onRetry(entry.id)}
                      style={({ pressed }) => [
                        styles.actionButton,
                        styles.retryButton,
                        pressed && styles.pressed,
                        actionsDisabled && styles.disabled,
                      ]}
                    >
                      {activeAction === 'retry' ? (
                        <ActivityIndicator color={colors.accent} size="small" />
                      ) : null}
                      <Text style={styles.retryText}>
                        {t(locale, activeAction === 'retry' ? 'sync.retrying' : 'sync.retry')}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel={t(locale, 'sync.discard')}
                      accessibilityRole="button"
                      accessibilityState={{
                        busy: activeAction === 'discard',
                        disabled: actionsDisabled,
                      }}
                      disabled={actionsDisabled}
                      onPress={() => confirmDiscard(entry.id)}
                      style={({ pressed }) => [
                        styles.actionButton,
                        styles.discardButton,
                        pressed && styles.pressed,
                        actionsDisabled && styles.disabled,
                      ]}
                    >
                      {activeAction === 'discard' ? (
                        <ActivityIndicator color={colors.onAccent} size="small" />
                      ) : null}
                      <Text style={styles.discardText}>{t(locale, 'sync.discard')}</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
      {message ? (
        <StatusMessage
          message={message.text}
          style={message.tone === 'error' ? styles.errorMessage : styles.successMessage}
          tone={message.tone}
        />
      ) : null}
    </View>
  );
}

const styles = createThemedStyles(() =>
  StyleSheet.create({
    wrapper: {
      gap: spacing.sm,
    },
    panel: {
      backgroundColor: colors.surface,
      borderColor: colors.danger,
      borderRadius: 16,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.md,
    },
    title: {
      color: colors.danger,
      fontSize: 19,
      fontWeight: '800',
      lineHeight: 25,
    },
    body: {
      color: colors.mutedText,
      fontSize: 15,
      lineHeight: 22,
    },
    list: {
      gap: spacing.sm,
    },
    item: {
      backgroundColor: colors.surfaceAlt,
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.md,
    },
    itemCopy: {
      gap: 3,
    },
    status: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    operation: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
      lineHeight: 22,
    },
    detail: {
      color: colors.mutedText,
      fontSize: 14,
      lineHeight: 20,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    actionButton: {
      alignItems: 'center',
      borderRadius: 8,
      borderWidth: 1,
      flex: 1,
      flexDirection: 'row',
      gap: spacing.xs,
      justifyContent: 'center',
      minHeight: 48,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
    },
    retryButton: {
      backgroundColor: colors.surface,
      borderColor: colors.accent,
    },
    retryText: {
      color: colors.accent,
      fontSize: 15,
      fontWeight: '800',
      textAlign: 'center',
    },
    discardButton: {
      backgroundColor: colors.danger,
      borderColor: colors.danger,
    },
    discardText: {
      color: colors.onAccent,
      fontSize: 15,
      fontWeight: '800',
      textAlign: 'center',
    },
    pressed: {
      opacity: 0.75,
    },
    disabled: {
      opacity: 0.55,
    },
    errorMessage: {
      color: colors.danger,
      fontSize: 15,
      lineHeight: 22,
    },
    successMessage: {
      color: colors.accentStrong,
      fontSize: 15,
      lineHeight: 22,
    },
  }),
);
